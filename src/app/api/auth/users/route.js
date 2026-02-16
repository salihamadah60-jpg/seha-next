import { NextResponse } from 'next/server';
import User from '@/lib/models/User.js';
import connectToDatabase from '@/lib/mongodb.js';

export async function POST(request) {
  await connectToDatabase();

  const { idNumber, servicecode, isAdmin } = await request.json();

  try {
    const existingUser = await User.findOne({ idNumber });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const newUser = new User({ idNumber, servicecodes: [{ code: servicecode }], isAdmin });
    await newUser.save();
    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error creating user' }, { status: 500 });
  }
}