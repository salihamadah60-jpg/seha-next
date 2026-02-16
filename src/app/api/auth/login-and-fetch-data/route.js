import { NextResponse } from 'next/server';
import User from '../../../../../lib/models/User.js';
import Leave from '../../../../../lib/models/Leave.js';
import jwt from 'jsonwebtoken';
import connectToDatabase from '../../../../../lib/mongodb.js';

export async function POST(request) {
  await connectToDatabase();

  const { idNumber, servicecode } = await request.json();

  if (!idNumber || !servicecode) {
    return NextResponse.json({ error: 'رقم الهوية وكلمة المرور مطلوبان' }, { status: 400 });
  }

  try {
    let user = await User.findOne({ idNumber });
    if (!user) {
      user = new User({ idNumber, servicecodes: [{ code: servicecode }], isAdmin: false });
      await user.save();
    } else {
      const servicecodeExists = user.servicecodes.some(servicecodeObj => servicecodeObj.code === servicecode);
      if (!servicecodeExists) {
        user.servicecodes.push({ code: servicecode });
        await user.save();
      }
    }

    const validPassword = user.servicecodes.some(servicecodeObj => servicecodeObj.code === servicecode);
    if (!validPassword) {
      return NextResponse.json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' }, { status: 400 });
    }

    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: user.isAdmin ? '7d' : '3d' });

    const leaves = await Leave.find({ userId: user._id });

    return NextResponse.json({ token, leaves });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تسجيل الدخول' }, { status: 500 });
  }
}