const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing admin panel payment proofs...');

    // Set up console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('error') || text.includes('Error') || text.includes('404')) {
        console.log(`  [Console ${msg.type()}] ${text}`);
      }
    });

    // Navigate directly
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'admin-test.png' });
    console.log('Screenshot saved: admin-test.png');

    // Check page content
    const text = await page.locator('body').textContent();
    console.log('\n=== PAGE CONTENT ===');
    console.log(text.substring(0, 500));

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
})();
