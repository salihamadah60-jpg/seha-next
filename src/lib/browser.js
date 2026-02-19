export async function getBrowser() {
  const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

  if (isVercel) {
    // Vercel / Production environment
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;

    // Optional: set custom fonts if needed
    // await chromium.font('https://raw.githack.com/googlefonts/noto-emoji/master/fonts/NotoColorEmoji.ttf');

    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  } else {
    // Local development environment
    const puppeteer = (await import('puppeteer')).default;
    return await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}
