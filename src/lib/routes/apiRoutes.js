import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';
import Leave from '../models/Leave.js';
import User from '../models/User.js';
import rateLimit from 'express-rate-limit';
import sendSMS from '../utils/sendSMS.js';
import { getBrowser } from '../browser.js';
import hbs from 'handlebars';
import moment from 'moment-hijri'; // استخدم مكتبة moment-hijri
import dotenv from 'dotenv';

dotenv.config();

function formatHijriDate(dateStr) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const [year, month, day] = dateStr.split('/');
  return `${day}-${month}-${year}`;
}
function formatGregorianDate(dateStr) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Directory containing hospital images
const IMAGES_DIR = path.join(__dirname, '../images');

function generateServiceCode() { // eslint-disable-line @typescript-eslint/no-unused-vars
  const prefix = Math.random() < 0.5 ? 'GSL' : 'PSL';
  const randomNumbers = Math.floor(1000000000 + Math.random() * 9000000000);
  return `${prefix}${randomNumbers}`;
}

function calculateLeaveDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) {
    throw new Error('Missing Date');
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate) || isNaN(endDate)) {
    throw new Error('Invalid Date');
  }

  const timeDiff = endDate - startDate;
  const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

  if (dayDiff < 0) {
    return 0;
  } else {
    return dayDiff;
  }
}

// Separate limiter for lightweight hospital search to avoid blocking admin actions
const hospitalsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,            // allow 200 queries/minute to support fast typing/autocomplete
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many search requests, please slow down.'
});

const queryLimit = rateLimit({ // eslint-disable-line @typescript-eslint/no-unused-vars
  windowMs: 10 * 24 * 60 * 60 * 1000,
  max: 1000,
  message: 'You have reached the maximum number of allowed requests. Please wait until the time period ends.'
});

const loadBase64Images = (overrideImageRightAbsPath) => {
  // Default image if no hospital image is provided/found
  const defaultRight = path.join(__dirname, '../views/assest/MOF.png');
  const imageRightPath = (overrideImageRightAbsPath && fs.existsSync(overrideImageRightAbsPath))
    ? overrideImageRightAbsPath
    : defaultRight;

  const imagePaths = {
    logoRight: path.join(__dirname, '../views/assest/p.png'),
    logoLeft: path.join(__dirname, '../views/assest/se.png'),
    headerImage: path.join(__dirname, '../views/assest/header.png'),
    imageRight: imageRightPath, // dynamic right image based on selected hospital
    imageLeft: path.join(__dirname, '../views/assest/qr.png'),
    staticImage: path.join(__dirname, '../views/assest/image.png')
  };

  const base64Images = {};

  for (const [key, imagePath] of Object.entries(imagePaths)) {
    try {
      const imageData = fs.readFileSync(imagePath);
      // Detect MIME type by file extension for correctness
      const ext = path.extname(imagePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png'
        : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
        : ext === '.webp' ? 'image/webp'
        : 'application/octet-stream';
      base64Images[key] = `data:${mime};base64,${imageData.toString('base64')}`;
      console.log(`Loaded image ${key} from ${imagePath}`);
    } catch (error) {
      console.error(`خطأ في تحميل الصورة: ${imagePath}`, error);
    }
  }

  return base64Images;
};

const compile = async function(templateName, data) {
  try {
    const filePath = path.join(process.cwd(), 'views', `${templateName}.hbs`);
    console.log('Reading HTML template from:', filePath);
    const html = await fs.readFile(filePath, 'utf-8');
    // Avoid logging full template content to keep terminal clean
    console.log('HTML template content loaded. Length:', html.length);
    return hbs.compile(html)(data);
  } catch (error) {
    console.error('Error compiling Handlebars template:', error);
  }
};

// Static routes
const app = express();
app.use('/generated_pdfs', express.static(path.join(__dirname, '../generated_pdfs')));
// Serve hospital images under /images for frontend previews (mounted under /api by server)
router.use('/images', express.static(IMAGES_DIR));

// Unified hospitals suggestions: read from config/hospitals.json if exists; otherwise bootstrap from images folder
router.get('/hospitals', hospitalsLimiter, async (req, res) => {
  try {
    const queryRaw = (req.query.q || '');
    const query = queryRaw.toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];

    const CONFIG_DIR = path.join(__dirname, '../config');
    const HOSPITALS_CONFIG = path.join(CONFIG_DIR, 'hospitals.json');

    let fromConfig = null;
    try {
      if (fs.existsSync(HOSPITALS_CONFIG)) {
        const txt = fs.readFileSync(HOSPITALS_CONFIG, 'utf-8');
        fromConfig = JSON.parse(txt);
      }
    } catch (e) {
      console.warn('Failed to read hospitals.json, will rebuild from images if needed:', e?.message);
      fromConfig = null;
    }

    if (!fromConfig) {
      // Bootstrap config from images directory (limit to 182 entries)
      try {
        fs.ensureDirSync(CONFIG_DIR);
      } catch {}

      const files = fs.readdirSync(IMAGES_DIR).filter(f => allowedExts.includes(path.extname(f).toLowerCase()));
      const top = files.slice(0, 182);
      const derived = top.map(file => {
        const base = path.basename(file, path.extname(file));
        return { arabic: base, english: base, image: file };
      });
      try {
        fs.writeFileSync(HOSPITALS_CONFIG, JSON.stringify(derived, null, 2), 'utf-8');
        fromConfig = derived;
      } catch (e) {
        console.warn('Unable to write hospitals.json, will serve suggestions from images only:', e?.message);
      }
    }

    let suggestions = [];
    if (Array.isArray(fromConfig) && fromConfig.length) {
      suggestions = fromConfig.map(item => ({
        arabic: item.arabic || '',
        english: item.english || '',
        path: item.image ? `/api/images/${encodeURIComponent(item.image)}` : '',
      }));

      if (query) {
        const q = query;
        suggestions = suggestions.filter(h =>
          (h.arabic && h.arabic.toLowerCase().includes(q)) ||
          (h.english && h.english.toLowerCase().includes(q))
        );
      } else {
        // initial: sort by english then take first 20
        suggestions = suggestions
          .sort((a, b) => (a.english || '').localeCompare(b.english || ''))
          .slice(0, 20);
      }

      return res.json(suggestions);
    }

    // Fallback: read directly from images folder
    const files = fs.readdirSync(IMAGES_DIR);
    const hospitalsAll = files
      .filter(file => allowedExts.includes(path.extname(file).toLowerCase()))
      .map(file => {
        const name = path.basename(file, path.extname(file));
        return {
          arabic: name,
          english: name,
          path: `/api/images/${encodeURIComponent(file)}`
        };
      });

    let hospitals = hospitalsAll;
    if (query) {
      hospitals = hospitalsAll.filter(h =>
        h.arabic.toLowerCase().includes(query) || h.english.toLowerCase().includes(query)
      );
    } else {
      hospitals = hospitalsAll.sort((a, b) => a.english.localeCompare(b.english)).slice(0, 20);
    }

    res.json(hospitals);
  } catch (err) {
    console.error('Error listing hospital images:', err);
    res.status(500).json({ message: 'Failed to list hospitals' });
  }
});

router.post('/add-leave-and-generate-pdf', authenticateToken, authorizeAdmin, async (req, res) => {
  const leaveData = req.body;

  try {
    if (leaveData.name.english) {
      leaveData.name.english = leaveData.name.english.toUpperCase();
    }
    if (leaveData.doctorName.english) {
      leaveData.doctorName.english = leaveData.doctorName.english.toUpperCase();
    }

    // إعداد التاريخ والوقت بالتنسيق المطلوب
    const issueDate = new Date(leaveData.issueDate);

    // توليد وقت عشوائي بين العاشرة صباحًا والثامنة مساءً
    function getRandomTimeBetweenTenAndEight() {
      const minHour = 10;
      const maxHour = 20;
      const randomHour = Math.floor(Math.random() * (maxHour - minHour + 1)) + minHour;
      const randomMinute = Math.floor(Math.random() * 60);
      return { hour: randomHour, minute: randomMinute };
    }

    const randomTime = getRandomTimeBetweenTenAndEight();
    issueDate.setHours(randomTime.hour);
    issueDate.setMinutes(randomTime.minute);

    // تنسيق الوقت (06:14AM)
    const formattedTime = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Riyadh'
    }).format(issueDate).replace(/\s/g, ''); // إزالة أي مسافات

    // تنسيق التاريخ (Monday, 17 February 2025)
    const day = issueDate.toLocaleDateString('en-US', { weekday: 'long' });
    const date = issueDate.getDate().toString().padStart(2, '0');
    const month = issueDate.toLocaleDateString('en-US', { month: 'long' });
    const year = issueDate.getFullYear();
    const formattedDate = `${day}, ${date} ${month} ${year}`;

    // دمج الوقت والتاريخ في صيغة واحدة
    leaveData.timestamp = `${formattedTime}\n${formattedDate}`;

    // طباعة الرسالة في وحدة التحكم
    console.log('Timestamp added correctly:', leaveData.timestamp);

    // إضافة الإجازة إلى قاعدة البيانات
    let user = await User.findOne({ idNumber: leaveData.idNumber });
    if (!user) {
      user = new User({ idNumber: leaveData.idNumber, servicecode: leaveData.servicecode, isAdmin: false });
      await user.save();
    } else {
      const existingLeave = await Leave.findOne({ userId: user._id, servicecode: leaveData.servicecode });
      if (existingLeave) {
        return res.status(400).json({ message: 'A leave with the same service code already exists for this user' });
      }
    }

    const startDateGregorian = leaveData.startDate;
    const endDateGregorian = leaveData.endDate;

    if (!startDateGregorian || !endDateGregorian) {
      throw new Error('Missing Date');
    }

    if (isNaN(new Date(startDateGregorian).getTime()) || isNaN(new Date(endDateGregorian).getTime())) {
      throw new Error('Invalid Date');
    }
    const leaveDuration = calculateLeaveDays(startDateGregorian, endDateGregorian);
    const expirationDays = leaveDuration === 1 ? 3 : leaveDuration === 2 ? 5 : leaveDuration + 3;

    const leave = new Leave({
      ...leaveData,
      userId: user._id,
      startDate: {
        hijri: leaveData.startDateHijri,
        gregorian: startDateGregorian
      },
      endDate: {
        hijri: leaveData.endDateHijri,
        gregorian: endDateGregorian
      },
      leaveDuration,
      expirationDate: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
    });

console.log('Saving leave data:', leave); // طباعة بيانات الإجازة قبل حفظها

await leave.save();
console.log('Leave saved successfully'); // تأكيد أن الإجازة تم حفظها بنجاح

if (leaveData.sendSMS) {
  const smsMessage = `خطاك السوء، ${leave.name.arabic.split(' ')[0]} تم إصدار إجازة مرضية برقم ${leave.servicecode} لمدة ${leave.leaveDuration} يوما. ويمكنك الاطلاع عليها عبر تطبيق صحتي. دمتم بصحة.`;
  try {
    const sms = await sendSMS(leaveData.phoneNumber, smsMessage);
    // Store SID and initial status on Leave for tracking
    leave.smsMessageSid = sms.sid;
    leave.smsStatus = sms.status;
    leave.smsTo = sms.to;
    await leave.save();

    // Expose SID and status in response headers for the frontend
    res.setHeader('X-SMS-SID', sms.sid);
    res.setHeader('X-SMS-Status', sms.status || 'queued');

    console.log(`SMS queued. SID=${sms.sid}, To=${sms.to}, Status=${sms.status}`);
  } catch (error) {
    console.error('Failed to send SMS', {
      to: leaveData.phoneNumber,
      code: error?.code,
      message: error?.message,
      status: error?.status,
    });
  }
}

    // تحميل الصور وتحويلها إلى Base64
    // Resolve selected hospital logo if provided from frontend
    let selectedHospitalImageAbsPath = null;
    const selectedHospitalPathRel = leaveData?.selectedHospitalImage; // e.g., "/api/images/King%20Fahd.png"
    if (selectedHospitalPathRel && typeof selectedHospitalPathRel === 'string') {
      try {
        // Handle percent-encoded filenames coming from the frontend
        const decoded = decodeURIComponent(selectedHospitalPathRel);
        const fileNameOnly = path.basename(decoded);
        const candidate = path.join(IMAGES_DIR, fileNameOnly);
        if (fs.existsSync(candidate)) {
          selectedHospitalImageAbsPath = candidate;
        } else {
          // Fallback: try original (non-decoded) just in case
          const fallbackFileName = path.basename(selectedHospitalPathRel);
          const fallbackCandidate = path.join(IMAGES_DIR, fallbackFileName);
          if (fs.existsSync(fallbackCandidate)) {
            selectedHospitalImageAbsPath = fallbackCandidate;
          }
        }
      } catch {
        // Ignore decode errors and continue with defaults
      }
    }

    const base64Images = loadBase64Images(selectedHospitalImageAbsPath);
    console.log('Loaded images paths:', base64Images);

    // إعداد القيم الديناميكية
    leaveData.base64Images = base64Images;
    leaveData.leaveDuration = leaveDuration; // تمرير leaveDuration إلى القيم الديناميكية

    // تنسيق التواريخ
    leaveData.startDateHijriFormatted = moment(leaveData.startDate, 'YYYY-MM-DD').format('iDD-iMM-iYYYY');
    leaveData.endDateHijriFormatted = moment(leaveData.endDate, 'YYYY-MM-DD').format('iDD-iMM-iYYYY');
    leaveData.startDateGregorianFormatted = moment(leaveData.startDateHijri).format('YYYY-MM-DD');
    leaveData.endDateGregorianFormatted = moment(leaveData.endDateHijri).format('YYYY-MM-DD');

    // تجميع القالب
    const content = await compile('table', leaveData);
    console.log('Compiled HTML content:', content);

    // Launch Browser using helper and build PDF
    const browser = await getBrowser();
    const page = await browser.newPage();

    // ضبط محتوى الصفحة
  await page.setContent(content, { waitUntil: 'networkidle0' });

  // تحديد مسار ملف CSS لنظام Linux فقط
  //const cssPath = 'C:\\Users\\ODEY TECH\\Desktop\\seha\\views\\table.css';
  //للاستظافه
  //const awsCssPath = '/home/ec2-user/Desktop/seha/views/table.css';
  const cssPath = path.join(__dirname, '../views/table.css');

  // طباعة المسار للتحقق
  console.log('CSS Path:', cssPath);

  // إضافة ملف CSS إلى الصفحة
  try {
    await page.addStyleTag({ path: cssPath });
    console.log('تم تحميل واستخدام table.css بنجاح.');
  } catch (error) {
    console.error('فشل في تحميل واستخدام table.css:', error);
  }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm'
      }
    });

        await browser.close();

        // حفظ ملف PDF محليًا
        const outputPath = path.join(__dirname, '../generated_pdfs', `${leaveData.servicecode}.pdf`);
        await fs.writeFile(outputPath, pdfBuffer);
        console.log('تم حفظ ملف PDF محليًا:', outputPath);

        // إرسال ملف PDF كاستجابة تحميل مباشرة وتغيير اسمه
        const downloadFileName = `${leaveData.servicecode}_new.pdf`;
        res.download(outputPath, downloadFileName, async (err) => {
            if (err) {
                console.error('Error while downloading file:', err);
                res.status(500).send('Error occurred while downloading file.');
            } else {
                console.log('PDF file sent successfully.');

                // حذف ملف PDF بعد 5 دقائق من التحميل بنجاح
                setTimeout(async () => {
                    try {
                        await fs.unlink(outputPath);
                        console.log('تم حذف ملف PDF بنجاح بعد مرور 5 دقائق:', outputPath);
                    } catch (unlinkError) {
                        console.error('خطأ أثناء حذف ملف PDF:', unlinkError);
                    }
                }, 5 * 60 * 1000); // 5 دقائق = 5 * 60 * 1000 مللي ثانية
            }
        });

      } catch (error) {
        console.error('حدث خطأ أثناء إضافة الإجازة وإنشاء ملف PDF:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء إضافة الإجازة وإنشاء ملف PDF' });
      }
    });

    // دوال PUT و DELETE و SEND SMS
    router.get('/user-leaves', authenticateToken, async (req, res) => {
      try {
        let { idNumber, servicecode } = req.query;
        idNumber = idNumber.trim();
        servicecode = servicecode.trim();
        console.log('Received idNumber:', idNumber);
        console.log('Received servicecode:', servicecode);

        if (!idNumber || !servicecode) {
          return res.status(400).json({ message: 'ID number and service code are required' });
        }

        const leaves = await Leave.find({ idNumber: idNumber, servicecode: servicecode });
        console.log('Found leaves:', leaves);

        if (leaves.length === 0) {
          return res.status(404).json({ message: 'No leaves found for the user' });
        }

        res.json(leaves);
      } catch (error) {
        console.error('Error fetching user leaves:', error);
        res.status(500).json({ message: 'Server error occurred' });
      }
    });

    router.put('/leaves/:id', authenticateToken, authorizeAdmin, async (req, res) => {
      try {
        if (!req.params.id || !req.body) {
          return res.status(400).json({ message: 'Missing required fields: id or body' });
        }
        const leave = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(leave);
      } catch {
        res.status(500).json({ message: 'An error occurred while updating the leave' });
      }
    });

    router.delete('/leaves/:id', authenticateToken, authorizeAdmin, async (req, res) => {
      try {
        if (!req.params.id) {
          return res.status(400).json({ message: 'Missing id' });
        }
        await Leave.findByIdAndRemove(req.params.id);
        res.status(204).send();
      } catch {
        res.status(500).json({ message: 'An error occurred while deleting the leave' });
      }
    });

    router.post('/send-sms', authenticateToken, async (req, res) => {
      const { to, message } = req.body;
      if (!/^\+\d{11,14}$/.test(to)) {
        return res.status(400).json({ message: 'Invalid phone number format. Please use international format (+966).' });
      }

      try {
        const response = await sendSMS(to, message);
        console.log('SMS response:', response); // عرض تفاصيل الاستجابة في السجلات
        res.status(200).json({ message: 'تم إرسال الرسالة بنجاح!' });
      } catch (error) {
        console.error('فشل في إرسال الرسالة:', error.message);
        res.status(500).json({ message: 'فشل في إرسال الرسالة', error: error.message });
      }
    });

    export default router;