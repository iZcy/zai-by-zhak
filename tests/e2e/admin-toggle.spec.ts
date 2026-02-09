import { test, expect } from '@playwright/test';

test.describe('Admin Panel Toggle', () => {
  test('should toggle between dashboard and admin panel', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if Admin Panel button exists
    const adminButton = page.getByText('Admin Panel').or(page.getByText('Dashboard'));
    const isVisible = await adminButton.isVisible();

    console.log('Admin button visible:', isVisible);

    if (isVisible) {
      // Click Admin Panel button
      await adminButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({ path: 'admin-panel.png' });

      // Check for admin panel content
      const pendingApprovals = page.getByText('Pending Approvals');
      const activeSubscriptions = page.getByText('Active Subscriptions');

      console.log('Pending Approvals visible:', await pendingApprovals.isVisible());
      console.log('Active Subscriptions visible:', await activeSubscriptions.isVisible());

      // Click back to Dashboard
      await page.getByText('Dashboard').click();
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({ path: 'dashboard.png' });

      // Check for dashboard content
      const overview = page.getByText('Overview');
      console.log('Overview visible:', await overview.isVisible());
    } else {
      console.log('Admin Panel button NOT found!');
      console.log('User role:', await page.evaluate(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user?.role || 'no user found';
      }));

      // Take screenshot of current state
      await page.screenshot({ path: 'current-state.png' });
    }
  });

  test('should show subscription panel for regular users', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Look for subscription-related content
    const stockCount = page.getByText(/Stocks Owned/i);
    const referralSection = page.getByText(/Referral Program/i);

    await page.screenshot({ path: 'subscription-panel.png' });

    console.log('Stock count visible:', await stockCount.isVisible());
    console.log('Referral section visible:', await referralSection.isVisible());
  });
});
