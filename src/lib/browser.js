export async function getBrowser() {
  const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

  if (isVercel) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;

    // Disabling graphics mode to save space/memory and avoid missing libs on Vercel
    // Required for AL2023 runtimes (Node 20+)
    chromium.setGraphicsMode = false;

    const executablePath = await chromium.executablePath();

    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
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
