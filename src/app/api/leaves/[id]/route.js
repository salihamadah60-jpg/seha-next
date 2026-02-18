import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Leave from '@/lib/models/Leave';
import jwt from 'jsonwebtoken';

async function ensureAuth(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { error: 'Unauthorized', status: 401 };
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return {};
  } catch {
    return { error: 'Unauthorized', status: 401 };
  }
}

export async function PUT(request, { params }) {
  await connectToDatabase();
  const auth = await ensureAuth(request);
  if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const { id } = params;
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  try {
    const body = await request.json();
    const leave = await Leave.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(leave, { status: 200 });
  } catch (error) {
    console.error('Update leave error:', error);
    return NextResponse.json({ message: 'An error occurred while updating the leave' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  await connectToDatabase();
  const auth = await ensureAuth(request);
  if (auth.error) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const { id } = params;
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  try {
    await Leave.findByIdAndRemove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete leave error:', error);
    return NextResponse.json({ message: 'An error occurred while deleting the leave' }, { status: 500 });
  }
}