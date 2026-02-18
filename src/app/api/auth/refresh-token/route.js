import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectToDatabase from '../../../../../lib/mongodb.js';

export async function POST(request) {
  await connectToDatabase();

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign({ id: verified.id, isAdmin: verified.isAdmin }, process.env.JWT_SECRET, { expiresIn: verified.isAdmin ? '7d' : '3d' });
    return NextResponse.json({ newToken });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
}