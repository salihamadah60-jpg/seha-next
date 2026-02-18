import express from 'express';
import apiRoutes from './apiRoutes.js';
import pdfkit from 'pdfkit'; // احتفظ فقط بـ pdfkit

const router = express.Router();

// تعريف المسارات هنا
router.get('/', (req, res) => {
  res.send('Welcome to the API!');
});

// استخدام apiRoutes
router.use('/api', apiRoutes);

// إضافة مسار لتحويل الصفحة إلى PDF
router.get('/convert', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).send('يرجى تقديم URL صحيح.');
    }

    let pdfBuffer;

    const methods = [
        async () => {
            const doc = new pdfkit();
            doc.text('Example content');
            let chunks = [];
            return new Promise((resolve) => {
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.end();
            });
        }
    ];

    for (const method of methods) {
        try {
            pdfBuffer = await method();
            if (pdfBuffer) break;
        } catch (error) {
            console.error(`Error in method ${method.name}`, error);
        }
    }

    if (pdfBuffer) {
        res.type('application/pdf');
        res.send(pdfBuffer);
    } else {
        res.status(500).send('حدث خطأ أثناء تحويل الصفحة إلى PDF.');
    }
});

export default router;