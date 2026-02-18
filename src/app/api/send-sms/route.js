import { NextResponse } from 'next/server';
import sendSMS from '../../../../lib/sendSMS.js';
import { authenticateToken } from '../../../../lib/auth.js';

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const authResult = authenticateToken(token);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { to, message } = await request.json();
  if (!/^\+\d{11,14}$/.test(to)) {
    return NextResponse.json({ message: 'Invalid phone number format. Please use international format (+966).' }, { status: 400 });
  }

  try {
    await sendSMS(to, message);
    return NextResponse.json({ message: 'تم إرسال الرسالة بنجاح!' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'فشل في إرسال الرسالة', error: error.message }, { status: 500 });
  }
}