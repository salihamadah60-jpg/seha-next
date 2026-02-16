import express from 'express';
import User from '../models/User.js';
import Leave from '../models/Leave.js'; // تأكد من وجود الموديل Leave
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// دالة تسجيل الدخول
router.post('/login', [
  body('idNumber').notEmpty().withMessage('رقم الهوية مطلوب'),
  body('servicecode').notEmpty().withMessage('كلمة المرور مطلوبة')
], async (req, res) => {
  console.log('Request body:', req.body); // تسجيل البيانات المرسلة
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { idNumber, servicecode } = req.body;

  try {
    let user = await User.findOne({ idNumber });
    if (!user) {
      console.log('User not found with idNumber:', idNumber);
      user = new User({ idNumber, servicecodes: [{ code: servicecode }], isAdmin: false });
      await user.save();
      console.log('New user created:', user);
    } else {
      const servicecodeExists = user.servicecodes.some(servicecodeObj => servicecodeObj.code === servicecode);
      if (!servicecodeExists) {
        user.servicecodes.push({ code: servicecode });
        await user.save();
        console.log('New service code added for user:', user);
      }
    }

    const validPassword = user.servicecodes.some(servicecodeObj => servicecodeObj.code === servicecode);
    if (!validPassword) {
      console.log('Invalid password for user:', idNumber);
      return res.status(400).json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' });
    }

    console.log('User authenticated successfully:', user);

    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, role: user.isAdmin ? 'admin' : 'user' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// دالة تسجيل الدخول وجلب البيانات
router.post('/login-and-fetch-data', [
  body('idNumber').notEmpty().withMessage('رقم الهوية مطلوب'),
  body('servicecode').notEmpty().withMessage('كلمة المرور مطلوبة')
], async (req, res) => {
  console.log('Request body:', req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { idNumber, servicecode } = req.body;

  try {
    let user = await User.findOne({ idNumber });
    if (!user) {
      console.log('User not found');
      user = new User({ idNumber, servicecodes: [{ code: servicecode }], isAdmin: false });
      await user.save();
      console.log('New user created:', user);
    } else {
      const servicecodeExists = user.servicecodes.some(servicecodeObj => servicecodeObj.code === servicecode);
      if (!servicecodeExists) {
        user.servicecodes.push({ code: servicecode });
        await user.save();
        console.log('New service code added for user:', user);
      }
    }

    const validPassword = user.servicecodes.some(servicecodeObj => servicecodeObj.code === servicecode);
    if (!validPassword) {
      console.log('Invalid password');
      return res.status(400).json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: user.isAdmin ? '7d' : '3d' });

    const leaves = await Leave.find({ userId: user._id });

    res.json({ token, leaves });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('حدث خطأ أثناء تسجيل الدخول');
  }
});

// دالة جلب بيانات المستخدم بعد المصادقة
router.get('/api/user-leaves', authenticateToken, async (req, res) => {
  const { idNumber, servicecode } = req.query;

  if (!idNumber || !servicecode) {
    return res.status(400).json({ error: 'رقم الهوية أو رمز الخدمة مفقود' });
  }

  try {
    const user = await User.findOne({ idNumber });
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const validPassword = user.servicecodes.some(servicecodeObj => servicecodeObj.code === servicecode);
    if (!validPassword) {
      return res.status(400).json({ error: 'المفتاح السري غير صحيح' });
    }

    const leaves = await Leave.find({ userId: user._id });
    res.json(leaves);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).send('حدث خطأ أثناء جلب البيانات');
  }
});

// دالة تحديث التوكن قبل انتهائه
router.post('/refresh-token', authenticateToken, (req, res) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign({ id: verified.id, isAdmin: verified.isAdmin }, process.env.JWT_SECRET, { expiresIn: verified.isAdmin ? '7d' : '3d' });
    res.json({ newToken });
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
});

// إضافة مشرف
router.post('/add-admin', authenticateToken, authorizeAdmin, [
  body('idNumber').notEmpty().withMessage('رقم الهوية مطلوب'),
  body('servicecode').notEmpty().withMessage('كلمة المرور مطلوبة')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { idNumber, servicecode } = req.body;

  try {
    const existingUser = await User.findOne({ idNumber });
    if (existingUser) {
      console.log('User already exists');
      return res.status(400).json({ error: 'رقم الهوية موجود بالفعل' });
    }

    const newUser = new User({
      idNumber,
      servicecodes: [{ code: servicecode }],
      isAdmin: true
    });

    await newUser.save();
    console.log('New admin user created successfully');
    res.status(201).json({ message: 'تم إنشاء المستخدم الإداري بنجاح' });
  } catch (err) {
    console.error('Error creating admin user:', err);
    res.status(500).json({ error: 'خطأ في إنشاء المستخدم الإداري' });
  }
});

// التحقق من وجود المستخدم بناءً على رقم الهوية
router.get('/users/:idNumber', async (req, res) => {
  try {
    const user = await User.findOne({ idNumber: req.params.idNumber });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// إضافة مستخدم جديد
router.post('/users', async (req, res) => {
  const { idNumber, servicecode, isAdmin } = req.body;

  try {
    const existingUser = await User.findOne({ idNumber });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = new User({ idNumber, servicecode, isAdmin });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// تصدير الراوتر
export default router;