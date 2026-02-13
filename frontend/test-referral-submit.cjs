const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3000...');

    // Set up console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Referral') || text.includes('referral') || text.includes('API')) {
        console.log(`  [Console ${msg.type()}] ${text}`);
      }
    });

    // Set up request logging
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/subscription/referral')) {
        console.log(`  [Request] ${request.method()} ${url}`);
      }
    });

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/subscription/referral')) {
        console.log(`  [Response] ${response.status()} ${url}`);
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Switch to user2 (this user hasn't used a referral code yet)
    console.log('\n=== SWITCHING TO USER2 ===');
    const userDropdown = page.locator('select');
    await userDropdown.selectOption({ value: 'user2@zai.dev' });
    console.log('Selected user2@zai.dev');
    await page.waitForTimeout(3000);

    // Take screenshot before applying referral code
    await page.screenshot({ path: 'before-referral.png' });
    console.log('Screenshot saved: before-referral.png');

    // Find the referral code input
    const referralInput = page.locator('input[placeholder*="referral"]');
    const inputExists = await referralInput.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Referral input visible:', inputExists);

    if (inputExists) {
      // Enter user1's referral code
      await referralInput.fill('USER001-DEV');
      console.log('Entered referral code: USER001-DEV');

      // Click Apply button
      const applyButton = page.getByText('Apply');
      await applyButton.click();
      console.log('Clicked Apply button');

      // Wait for the request to complete
      await page.waitForTimeout(3000);

      // Take screenshot after applying referral code
      await page.screenshot({ path: 'after-referral.png' });
      console.log('Screenshot saved: after-referral.png');

      // Check for "Submitted Referred Code" section
      const submittedCode = page.getByText('Submitted Referred Code', { exact: false });
      const submittedVisible = await submittedCode.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Submitted Referred Code section visible:', submittedVisible);

      if (submittedVisible) {
        const codeText = await page.locator('text=Submitted Referred Code').locator('..//p[@class="font-mono"]').textContent();
        console.log('Submitted referral code:', codeText);
      }

      // Check if input is now locked
      const inputAfter = page.locator('input[placeholder*="referral"]');
      const inputVisibleAfter = await inputAfter.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Referral input still visible:', inputVisibleAfter);

      // Check for locked message
      const lockedMessage = page.getByText('You have already used a referral code');
      const lockedVisible = await lockedMessage.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Locked message visible:', lockedVisible);
    }

    // Get text content of main area
    const mainText = await page.locator('main').textContent();
    console.log('\n=== MAIN TEXT CONTENT ===');
    console.log(mainText.substring(0, 2000));

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
})();
