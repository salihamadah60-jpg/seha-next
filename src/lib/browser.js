export async function getBrowser() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Vercel / Production environment
    const puppeteer = (await import('puppeteer-core')).default;
    const chromium = (await import('@sparticuz/chromium')).default;
    
    // Disabling graphics mode to save space/memory and avoid missing libs on Vercel
    chromium.setGraphicsMode = false;
    
    const executablePath = await chromium.executablePath();
    if (!executablePath) {
      throw new Error('Chromium executable path not found');
    }
    console.log('Launching Puppeteer with Chromium at:', executablePath);

    return await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  } else {
    // Local development environment
    const localPuppeteer = (await import('puppeteer')).default;
    return await localPuppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}
