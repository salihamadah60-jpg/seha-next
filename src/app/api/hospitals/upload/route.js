import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const arabicName = formData.get('arabicName');
    const englishName = formData.get('englishName');

    if (!file || !arabicName || !englishName) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const uploadPath = path.join(process.cwd(), 'public', 'images', fileName);

    // Save image to public/images
    fs.writeFileSync(uploadPath, buffer);

    // Update hospitals.json
    const CONFIG_FILE = path.join(process.cwd(), 'public', 'config', 'hospitals.json');
    let hospitalsData = [];
    
    if (fs.existsSync(CONFIG_FILE)) {
      const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      hospitalsData = JSON.parse(fileContent);
    }

    // Check if hospital already exists to avoid duplicates
    const exists = hospitalsData.some(h => h.image === fileName);
    if (!exists) {
      hospitalsData.push({
        arabic: arabicName,
        english: englishName,
        image: fileName
      });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(hospitalsData, null, 2), 'utf8');
    }

    return NextResponse.json({ 
      message: 'Hospital added successfully',
      path: `/images/${fileName}`,
      arabic: arabicName,
      english: englishName
    });

  } catch (error) {
    console.error('Error uploading hospital:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
