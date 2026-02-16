import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/mongodb.js';
import User from '../../../../../lib/models/User.js';
import Leave from '../../../../../lib/models/Leave.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(request) {
  console.log('Login attempt received');
  try {
    await connectToDatabase();

    const body = await request.json();
    const idNumber = String(body?.idNumber || '').trim();
    const servicecode = String(body?.servicecode || '').trim();

    if (!idNumber || !servicecode) {
      return NextResponse.json({ message: 'idNumber and servicecode are required' }, { status: 400 });
    }

    const user = await User.findOne({ idNumber });
    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Match servicecode either from passwordHash, user's servicecodes array, or existing Leave
    let isMatch = false;
    let leaveExists = false;

    // First check passwordHash if it exists (for admins)
    if (user.passwordHash) {
      isMatch = await bcrypt.compare(servicecode, user.passwordHash);
    }

    // Then check servicecodes array
    if (!isMatch && Array.isArray(user.servicecodes) && user.servicecodes.length) {
      isMatch = user.servicecodes.some(sc => sc?.code === servicecode);
    }

    // Finally check Leave documents
    if (!isMatch) {
      const exists = await Leave.exists({ idNumber, servicecode });
      isMatch = Boolean(exists);
      leaveExists = isMatch;
    }

    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isAdmin = !!user.isAdmin || user.role === 'admin';
    const role = isAdmin ? 'admin' : (user.role || 'user');

    console.log(`User ${idNumber} logged in with role: ${role}, isAdmin: ${isAdmin}`);

    // For normal users, ensure there is at least one leave with given idNumber + servicecode
    if (role !== 'admin' && !isAdmin && !leaveExists) {
      const exists = await Leave.exists({ idNumber, servicecode });
      if (!exists) {
        console.log(`No leave found for user ${idNumber}`);
        return NextResponse.json({ message: 'لا توجد بيانات إجازة مطابقة لهذا المستخدم ورمز الخدمة.' }, { status: 404 });
      }
    }

    // Build JWT with isAdmin and role
    const payload = { idNumber, isAdmin, role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json({
      token,
      role,      // top-level for client compatibility
      isAdmin,   // top-level for client compatibility
      user: {
        idNumber,
        isAdmin,
        role,
      }
    });
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}
