import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('Page loaded');

    // Take screenshot of initial state
    await page.screenshot({ path: 'initial-state.png' });
    console.log('Screenshot saved: initial-state.png');

    // Check for Admin Panel button
    const adminButton = page.getByText('Admin Panel').or(page.getByText('Dashboard'));
    const isVisible = await adminButton.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Admin button visible:', isVisible);

    if (isVisible) {
      console.log('Clicking Admin Panel button...');
      await adminButton.click();
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({ path: 'admin-panel.png' });
      console.log('Screenshot saved: admin-panel.png');

      // Check for admin panel content
      const pendingApprovals = page.getByText('Pending Approvals');
      const activeSubscriptions = page.getByText('Active Subscriptions');

      const pendingVisible = await pendingApprovals.isVisible({ timeout: 5000 }).catch(() => false);
      const activeVisible = await activeSubscriptions.isVisible({ timeout: 5000 }).catch(() => false);

      console.log('Pending Approvals visible:', pendingVisible);
      console.log('Active Subscriptions visible:', activeVisible);

      // Click back to Dashboard
      const dashboardButton = page.getByText('Dashboard');
      if (await dashboardButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Clicking Dashboard button...');
        await dashboardButton.click();
        await page.waitForTimeout(2000);

        await page.screenshot({ path: 'dashboard.png' });
        console.log('Screenshot saved: dashboard.png');
      }
    } else {
      console.log('Admin Panel button NOT found!');

      // Check user role
      const userRole = await page.evaluate(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user?.role || 'no user found';
      });
      console.log('User role from localStorage:', userRole);

      // Check if user exists
      const userExists = await page.evaluate(() => {
        return !!localStorage.getItem('user');
      });
      console.log('User exists in localStorage:', userExists);

      // Take screenshot of current state
      await page.screenshot({ path: 'current-state.png' });
      console.log('Screenshot saved: current-state.png');

      // Check if we're logged in
      const loginButton = page.getByText('Sign in');
      const loginVisible = await loginButton.isVisible({ timeout: 5000 }).catch(() => false);
      console.log('Login button visible:', loginVisible);

      // Check for welcome message
      const welcome = page.getByText('Welcome to Zai');
      const welcomeVisible = await welcome.isVisible({ timeout: 5000 }).catch(() => false);
      console.log('Welcome message visible:', welcomeVisible);
    }

    // Wait a bit to see the result
    console.log('Waiting 5 seconds before closing...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
})();
