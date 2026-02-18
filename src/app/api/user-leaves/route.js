import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Leave from '@/lib/models/Leave';

export async function GET(request) {
  await connectToDatabase();

  // Public endpoint: allow access with idNumber + servicecode without requiring JWT

  const url = new URL(request.url);
  let idNumber = (url.searchParams.get('idNumber') || '').trim();
  let servicecode = (url.searchParams.get('servicecode') || '').trim();

  if (!idNumber || !servicecode) {
    return NextResponse.json({ message: 'ID number and service code are required' }, { status: 400 });
  }

  try {
    const leaves = await Leave.find({ idNumber, servicecode });
    if (!leaves?.length) {
      return NextResponse.json({ message: 'No leaves found for the user' }, { status: 404 });
    }
    return NextResponse.json(leaves, { status: 200 });
  } catch (error) {
    console.error('Error fetching user leaves:', error);
    return NextResponse.json({ message: 'Server error occurred' }, { status: 500 });
  }
}