const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3000...');

    // Set up console logging before page loads
    page.on('console', msg => {
      const text = msg.text();
      console.log(`  [Console ${msg.type()}] ${text}`);
    });

    // Set up request logging
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        console.log(`  [Request] ${request.method()} ${url}`);
      }
    });

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        console.log(`  [Response] ${response.status()} ${url}`);
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    console.log('Page loaded');

    // Wait for initial authentication
    await page.waitForTimeout(3000);

    // Switch to a regular user to see referral code
    console.log('\n=== SWITCHING TO REGULAR USER ===');
    const userDropdown = page.locator('select');
    const dropdownExists = await userDropdown.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('User dropdown visible:', dropdownExists);

    if (dropdownExists) {
      const selectedValue = await userDropdown.inputValue();
      console.log('Current selected user:', selectedValue);

      await userDropdown.selectOption({ value: 'user2@zai.dev' });
      console.log('Selected user2@zai.dev (HAS used referral code)');

      // Wait for the page to update and API calls to complete
      await page.waitForTimeout(3000);

      // Take screenshot after switching
      await page.screenshot({ path: 'user3-dashboard.png' });
      console.log('Screenshot saved: user3-dashboard.png');
    }

    // Check for referral code section
    console.log('\n=== CHECKING REFERRAL CODE SECTION ===');

    const referralSection = page.getByText('Referral Program');
    const referralVisible = await referralSection.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Referral Program section visible:', referralVisible);

    if (referralVisible) {
      // Look for "Your Referral Code" text
      const yourReferralCodeText = page.getByText('Your Referral Code', { exact: false });
      const textVisible = await yourReferralCodeText.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('"Your Referral Code" text visible:', textVisible);

      // Check for "Loading..." text
      const loadingText = page.getByText('Loading...');
      const loadingVisible = await loadingText.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('"Loading..." text visible:', loadingVisible);

      // Look for the actual referral code value (should be in a font-mono element)
      const referralCodeElements = await page.locator('.font-mono, [class*="font-mono"]').all();
      console.log('Found', referralCodeElements.length, 'font-mono elements');

      for (let i = 0; i < referralCodeElements.length; i++) {
        const text = await referralCodeElements[i].textContent();
        console.log(`Font-mono element ${i}: "${text}"`);
      }

      // Check for Copy button
      const copyButton = page.getByText('Copy');
      const copyVisible = await copyButton.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('"Copy" button visible:', copyVisible);
    }

    // Get text content of main area
    const mainText = await page.locator('main').textContent();
    console.log('\n=== MAIN TEXT CONTENT ===');
    console.log(mainText.substring(0, 1500));

    // Wait to see the result
    console.log('\nWaiting 5 seconds before closing...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
})();
