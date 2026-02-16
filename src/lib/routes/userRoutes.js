import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// التحقق من وجود المستخدم بناءً على رقم الهوية
router.get('/User/:idNumber', async (req, res) => {
  try {
    let user = await User.findOne({ idNumber: req.params.idNumber });
    if (!user) {
      user = new User({ idNumber: req.params.idNumber, servicecode: 'defaultpassword', isAdmin: false });
      await user.save();
      console.log('New user created:', user);
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// إضافة مستخدم جديد
router.post('/User', async (req, res) => {
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

export default router;