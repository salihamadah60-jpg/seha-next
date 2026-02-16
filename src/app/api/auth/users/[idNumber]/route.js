import { NextResponse } from 'next/server';
/*import User from '../../../../../lib/models/User.js';
import connectToDatabase from '../../../../../lib/mongodb.js';*/

import User from '@/lib/models/User.js';
import connectToDatabase from '@/lib/mongodb.js';

export async function GET(request, { params }) {
  await connectToDatabase();

  const { idNumber } = params;

  try {
    const user = await User.findOne({ idNumber });
    if (user) {
      return NextResponse.json(user);
    } else {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Error fetching user' }, { status: 500 });
  }
}