export async function getBrowser() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Vercel / Production environment
    const puppeteer = (await import('puppeteer-core')).default;
    const chromium = (await import('@sparticuz/chromium')).default;
    
    // Optional: set graphics to false if not needed to save space/memory
    // chromium.setGraphicsMode = false;

    return await puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
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
