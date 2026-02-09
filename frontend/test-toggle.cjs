const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    console.log('Page loaded');

    // Wait a bit for React to render
    await page.waitForTimeout(2000);

    // Take screenshot of initial state
    await page.screenshot({ path: '01-initial.png' });
    console.log('Screenshot saved: 01-initial.png');

    // Look for Admin Panel button
    console.log('Looking for Admin Panel button...');
    const adminButton = page.getByText('Admin Panel');
    const isVisible = await adminButton.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Admin Panel button visible:', isVisible);

    if (isVisible) {
      console.log('Clicking Admin Panel button...');
      await adminButton.click();
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({ path: '02-after-click.png' });
      console.log('Screenshot saved: 02-after-click.png');

      // Get the HTML content
      const htmlContent = await page.content();
      console.log('\n=== HTML CONTENT AFTER TOGGLE ===');
      console.log(htmlContent);

      // Check for specific elements
      console.log('\n=== CHECKING FOR ELEMENTS ===');

      const pendingApprovals = page.getByText('Pending Approvals');
      const pendingVisible = await pendingApprovals.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Pending Approvals visible:', pendingVisible);

      const activeSubscriptions = page.getByText('Active Subscriptions');
      const activeVisible = await activeSubscriptions.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Active Subscriptions visible:', activeVisible);

      const buyStock = page.getByText('Buy Stock');
      const buyStockVisible = await buyStock.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Buy Stock button visible:', buyStockVisible);

      const referralProgram = page.getByText('Referral Program');
      const referralVisible = await referralProgram.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Referral Program visible:', referralVisible);

      // Check for Dashboard button
      const dashboardButton = page.getByText('Dashboard');
      const dashboardVisible = await dashboardButton.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Dashboard button visible:', dashboardVisible);

      // Get text content of main area
      const mainText = await page.locator('main').textContent();
      console.log('\n=== MAIN TEXT CONTENT ===');
      console.log(mainText);

    } else {
      console.log('Admin Panel button NOT found!');

      // Check what's actually on the page
      const bodyText = await page.locator('body').textContent();
      console.log('\n=== PAGE TEXT CONTENT ===');
      console.log(bodyText.substring(0, 500));
    }

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
