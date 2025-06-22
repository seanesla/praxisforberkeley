import { test } from '@playwright/test';

test('capture register page', async ({ page }) => {
  await page.goto('http://localhost:3000/register');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for animations
  await page.screenshot({ path: 'screenshots/current-register-page.png', fullPage: true });
});