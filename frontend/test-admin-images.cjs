const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to admin panel...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000);

    // Switch to admin
    const userDropdown = page.locator('select');
    await userDropdown.selectOption({ value: 'admin@zai.dev' });
    await page.waitForTimeout(3000);

    // Take screenshot of admin panel
    await page.screenshot({ path: 'admin-panel.png' });
    console.log('Screenshot saved: admin-panel.png');

    // Check for pending subscriptions
    const pendingText = await page.locator('main').textContent();
    console.log('\n=== ADMIN PANEL CONTENT ===');
    console.log(pendingText.substring(0, 500));

    // Look for payment proof images
    const images = await page.locator('img').all();
    console.log('\nFound', images.length, 'images');

    for (let i = 0; i < images.length; i++) {
      const src = await images[i].getAttribute('src');
      console.log(`Image ${i}: ${src}`);
    }

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
})();
