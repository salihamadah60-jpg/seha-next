import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Leave from '@/lib/models/Leave';
import User from '@/lib/models/User';
import sendSMS from '@/lib/sendSMS';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer';
import hbs from 'handlebars';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';

function calculateLeaveDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) throw new Error('Missing Date');
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  if (isNaN(startDate) || isNaN(endDate)) throw new Error('Invalid Date');
  const timeDiff = endDate - startDate;
  const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  return dayDiff < 0 ? 0 : dayDiff;
}

function formatTimestamp(issueDate) {
  // time like 06:14AM and date like Monday, 17 February 2025 (Asia/Riyadh)
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Riyadh'
  }).format(issueDate).replace(/\s/g, '');
  const day = issueDate.toLocaleDateString('en-US', { weekday: 'long' });
  const date = issueDate.getDate().toString().padStart(2, '0');
  const month = issueDate.toLocaleDateString('en-US', { month: 'long' });
  const year = issueDate.getFullYear();
  const formattedDate = `${day}, ${date} ${month} ${year}`;
  return `${formattedTime}\n${formattedDate}`;
}

function randomTimeBetweenTenAndEight(issueDate) {
  const minHour = 10; // 10 AM
  const maxHour = 20; // 8 PM
  const randomHour = Math.floor(Math.random() * (maxHour - minHour + 1)) + minHour;
  const randomMinute = Math.floor(Math.random() * 60);
  issueDate.setHours(randomHour);
  issueDate.setMinutes(randomMinute);
}

function loadBase64Images(overrideImageRightAbsPath) {
  const TEMPLATES_DIR = path.join(process.cwd(), 'lib', 'templates');
  const defaultRight = path.join(TEMPLATES_DIR, 'MOF.png');
  const imageRightPath = (overrideImageRightAbsPath && fs.existsSync(overrideImageRightAbsPath))
    ? overrideImageRightAbsPath
    : defaultRight;

  const imagePaths = {
    logoRight: path.join(TEMPLATES_DIR, 'p.png'),
    logoLeft: path.join(TEMPLATES_DIR, 'se.png'),
    headerImage: path.join(TEMPLATES_DIR, 'header.png'),
    imageRight: imageRightPath,
    imageLeft: path.join(TEMPLATES_DIR, 'qr.png'),
    staticImage: path.join(TEMPLATES_DIR, 'image.png'),
  };

  const base64Images = {};
  for (const [key, imagePath] of Object.entries(imagePaths)) {
    try {
      const imageData = fs.readFileSync(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png'
        : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
        : ext === '.webp' ? 'image/webp'
        : 'application/octet-stream';
      base64Images[key] = `data:${mime};base64,${imageData.toString('base64')}`;
    } catch (error) {
      console.error(`Failed to load image: ${imagePath}`, error);
    }
  }
  return base64Images;
}

async function compileTemplate(templateName, data) {
  try {
    const filePath = path.join(process.cwd(), 'lib', 'templates', `${templateName}.hbs`);
    const html = await fsp.readFile(filePath, 'utf-8');
    return hbs.compile(html)(data);
  } catch (error) {
    console.error('Error compiling Handlebars template:', error);
    throw error;
  }
}

export async function POST(request) {
  await connectToDatabase();

  // Authenticate token
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let verified;
  try {
    verified = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Enforce admin authorization like Express authorizeAdmin
  if (!verified?.isAdmin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const leaveData = await request.json();

  try {
    // Uppercase English names
    if (leaveData?.name?.english) leaveData.name.english = String(leaveData.name.english).toUpperCase();
    if (leaveData?.doctorName?.english) leaveData.doctorName.english = String(leaveData.doctorName.english).toUpperCase();

    // Issue date with random time between 10:00 and 20:00
    const issueDate = new Date(leaveData.issueDate || Date.now());
    randomTimeBetweenTenAndEight(issueDate);
    leaveData.timestamp = formatTimestamp(issueDate);

    // Find or create user by idNumber, ensure unique servicecode per user
    let user = await User.findOne({ idNumber: leaveData.idNumber });
    if (!user) {
      user = new User({ idNumber: leaveData.idNumber, servicecodes: [{ code: leaveData.servicecode }], isAdmin: false });
      await user.save();
    } else {
      const existingLeave = await Leave.findOne({ idNumber: user.idNumber, servicecode: leaveData.servicecode });
      if (existingLeave) {
        console.log(`Conflict: Leave with servicecode ${leaveData.servicecode} already exists for user ${user.idNumber}`);
        return NextResponse.json({ message: `رمز الخدمة ${leaveData.servicecode} موجود مسبقاً لهذا المستخدم.` }, { status: 400 });
      }
    }

    // Calculate leave days and expiration
    const leaveDuration = calculateLeaveDays(leaveData.startDate, leaveData.endDate);
    const expirationDays = leaveDuration === 1 ? 3 : leaveDuration === 2 ? 5 : leaveDuration + 3;
    const expirationDate = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

    const newLeave = new Leave({
      idNumber: leaveData.idNumber,
      servicecode: leaveData.servicecode,
      leaveDuration,
      startDate: {
        hijri: leaveData.startDateHijri,
        gregorian: new Date(leaveData.startDate)
      },
      endDate: {
        hijri: leaveData.endDateHijri,
        gregorian: new Date(leaveData.endDate)
      },
      issueDate: issueDate,
      name: leaveData.name,
      nationality: leaveData.nationality,
      workPlace: leaveData.workPlace,
      doctorName: leaveData.doctorName,
      jobTitle: leaveData.jobTitle,
      hospital: leaveData.hospital,
      phoneNumber: leaveData.phoneNumber,
      expirationDate
    });

    await newLeave.save();

    // SMS optional
    if (leaveData.sendSMS && leaveData.phoneNumber) {
      try {
        const smsMessage = `\u062E\u0637\u0627\u0643 \u0627\u0644\u0633\u0648\u0621\u060C ${String(newLeave.name?.arabic || '').split(' ')[0]} \u062A\u0645 \u0625\u0635\u062F\u0627\u0631 \u0625\u062C\u0627\u0632\u0629 \u0645\u0631\u0636\u064A\u0629 \u0628\u0631\u0642\u0645 ${newLeave.servicecode} \u0644\u0645\u062F\u0629 ${newLeave.leaveDuration} \u064A\u0648\u0645\u0627. \u0648\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0627\u0637\u0644\u0627\u0639 \u0639\u0644\u064A\u0647\u0627 \u0639\u0628\u0631 \u062A\u0637\u0628\u064A\u0642 \u0635\u062D\u062A\u064A. \u062F\u0645\u062A\u0645 \u0628\u0635\u062D\u0629.`;
        const sms = await sendSMS(leaveData.phoneNumber, smsMessage);
        newLeave.smsMessageSid = sms?.sid;
        newLeave.smsStatus = sms?.status;
        newLeave.smsTo = sms?.to;
        await newLeave.save();
      } catch (e) {
        console.error('Failed to send SMS', e);
      }
    }

    // Selected hospital image mapping from web path to disk path
    let selectedHospitalImageAbsPath = null;
    const selectedHospitalPathRel = leaveData?.selectedHospitalImage; // e.g., "/images/King%20Fahd.png"
    if (selectedHospitalPathRel && typeof selectedHospitalPathRel === 'string') {
      try {
        const decoded = decodeURIComponent(selectedHospitalPathRel);
        const fileNameOnly = path.basename(decoded);
        const candidate = path.join(process.cwd(), 'public', 'images', fileNameOnly);
        if (fs.existsSync(candidate)) {
          selectedHospitalImageAbsPath = candidate;
        } else {
          const fallbackFileName = path.basename(selectedHospitalPathRel);
          const fallbackCandidate = path.join(process.cwd(), 'public', 'images', fallbackFileName);
          if (fs.existsSync(fallbackCandidate)) {
            selectedHospitalImageAbsPath = fallbackCandidate;
          }
        }
      } catch {}
    }

    // Base64 images and template compilation
    const base64Images = loadBase64Images(selectedHospitalImageAbsPath);
    const templateData = {
      ...leaveData,
      base64Images,
      leaveDuration,
      // Backwards-compatible aliases for template
      startDateHijri: leaveData.startDateHijri,
      endDateHijri: leaveData.endDateHijri,
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      issueDate: leaveData.issueDate,
    };

    const htmlContent = await compileTemplate('table', templateData);

    // Launch Puppeteer and build PDF
    const launchOptions = { headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] };
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    // Set timeout to 0 (disabled) or a high value to avoid crashes on slow environments
    await page.setDefaultNavigationTimeout(0);
    
    // Use 'load' instead of 'networkidle0' because all images are already base64 inlined
    await page.setContent(htmlContent, { waitUntil: 'load' });

    // Attach CSS from templates dir
    const cssPath = path.join(process.cwd(), 'lib', 'templates', 'table.css');
    try {
      await page.addStyleTag({ path: cssPath });
    } catch (e) {
      console.warn('Failed to load table.css:', e?.message);
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
    });

    await browser.close();

    // Ensure output dir exists and save (optional; helpful for auditing)
    const outputDir = path.join(process.cwd(), 'generated_pdfs');
    await fsp.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${leaveData.servicecode}.pdf`);
    try {
      await fsp.writeFile(outputPath, pdfBuffer);
    } catch (e) {
      console.warn('Unable to persist PDF to disk:', e?.message);
    }

    // Return as downloadable attachment
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${leaveData.servicecode}_new.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error in add-leave-and-generate-pdf:', error);
    return NextResponse.json({ message: 'Failed to add leave and generate PDF' }, { status: 500 });
  }
}