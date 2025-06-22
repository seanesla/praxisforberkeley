import { test } from '@playwright/test';

test('capture login page', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for animations
  await page.screenshot({ path: 'screenshots/current-login-page.png', fullPage: true });
});