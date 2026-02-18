import connectToDatabase from '@/lib/mongodb';
import Leave from '@/lib/models/Leave';
import User from '@/lib/models/User';
import sendSMS from '@/lib/sendSMS';
import jwt from 'jsonwebtoken';
import moment from 'moment-hijri'; // eslint-disable-line @typescript-eslint/no-unused-vars

export async function POST(request) {
  await connectToDatabase();

  // Authenticate token
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });
  const token = authHeader.split(' ')[1];
  let userId;
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    userId = verified.id;
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const leaveData = await request.json();

  try {
    const user = await User.findById(userId);
    if (!user) return new Response('User not found', { status: 404 });

    const leaveDuration = calculateLeaveDays(leaveData.startDate, leaveData.endDate);
    const expirationDays = leaveDuration === 1 ? 3 : leaveDuration === 2 ? 5 : leaveDuration + 3;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);

    const newLeave = new Leave({
      idNumber: user.idNumber,
      servicecode: leaveData.servicecode,
      leaveDuration,
      startDate: {
        gregorian: new Date(leaveData.startDate),
        hijri: leaveData.startDateHijri
      },
      endDate: {
        gregorian: new Date(leaveData.endDate),
        hijri: leaveData.endDateHijri
      },
      issueDate: new Date(leaveData.issueDate),
      name: leaveData.name,
      nationality: leaveData.nationality,
      workPlace: leaveData.workPlace,
      doctorName: leaveData.doctorName,
      jobTitle: leaveData.jobTitle,
      hospital: leaveData.hospital,
      phoneNumber: leaveData.phoneNumber,
      expirationDate
    });

    await newLeave.save();

    // Send SMS if phoneNumber provided
    if (leaveData.phoneNumber) {
      await sendSMS(leaveData.phoneNumber, "Your leave has been added. Service code: " + newLeave._id);
    }

    return new Response(JSON.stringify({ message: 'Leave added successfully', leave: newLeave }), { status: 201 });
  } catch (error) {
    console.error('Error adding leave:', error);
    return new Response('Error adding leave', { status: 500 });
  }
}

function calculateLeaveDays(startDateStr, endDateStr) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const timeDiff = endDate - startDate;
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
}

export async function GET(request) {
  await connectToDatabase();

  // Authenticate token
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });
  const token = authHeader.split(' ')[1];
  let userId;
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    userId = verified.id;
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const leaves = await Leave.find({ idNumber: (await User.findById(userId)).idNumber });
    return new Response(JSON.stringify(leaves), { status: 200 });
  } catch {
    return new Response('Error fetching leaves', { status: 500 });
  }
}