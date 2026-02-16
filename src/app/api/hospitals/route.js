import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let cachedHospitals = null;

export async function GET(request) {
  const query = request.nextUrl.searchParams.get('q') || '';
  const CONFIG_FILE = path.join(process.cwd(), 'public', 'config', 'hospitals.json');

  try {
    if (!cachedHospitals) {
      if (!fs.existsSync(CONFIG_FILE)) {
        return NextResponse.json({ message: 'Configuration file not found' }, { status: 404 });
      }
      const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      cachedHospitals = JSON.parse(fileContent).map(h => ({
        arabic: h.arabic,
        english: h.english,
        path: `/images/${h.image}`
      }));
    }

    const hospitals = cachedHospitals;

    if (query) {
      const filtered = hospitals.filter(h =>
        (h.arabic && h.arabic.toLowerCase().includes(query.toLowerCase())) ||
        (h.english && h.english.toLowerCase().includes(query.toLowerCase()))
      );
      return NextResponse.json(filtered);
    }

    // If no query, return ALL hospitals sorted but NOT sliced (Frontend handles display limit)
    const sorted = [...hospitals].sort((a, b) => (a.english || '').localeCompare(b.english || ''));
    return NextResponse.json(sorted);
  } catch (err) {
    console.error('Error loading hospitals config:', err);
    return NextResponse.json({ message: 'Failed to load hospitals' }, { status: 500 });
  }
}
