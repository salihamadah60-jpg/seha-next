import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

async function ensureAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { error: 'Unauthorized', status: 401 };
  const token = authHeader.split(' ')[1];
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified?.isAdmin) return { error: 'Forbidden', status: 403 };
    return { verified };
  } catch {
    return { error: 'Unauthorized', status: 401 };
  }
}

export async function POST(request) {
  await connectToDatabase();
  const auth = await ensureAdmin(request);
  if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const body = await request.json();
  const { idNumber, password } = body || {};
  if (!idNumber || !password) {
    return NextResponse.json({ message: 'idNumber and password are required' }, { status: 400 });
  }

  try {
    // Hash password (even if not used for login yet, stores securely for future)
    const passwordHash = await bcrypt.hash(String(password), 10);

    // Upsert user as admin; keep unique idNumber as in schema
    const updated = await User.findOneAndUpdate(
      { idNumber },
      { $set: { isAdmin: true, role: 'admin', passwordHash } },
      { new: true, upsert: true }
    );

    return NextResponse.json({ message: 'Admin created/updated', user: { idNumber: updated.idNumber, isAdmin: updated.isAdmin, role: updated.role } }, { status: 200 });
  } catch (e) {
    console.error('add-admin error:', e);
    return NextResponse.json({ message: 'Failed to create admin' }, { status: 500 });
  }
}
