import { test } from '@playwright/test';
import { takeScreenshot, waitForAnimation } from './helpers/test-helpers';

test('Test logo fix on login page', async ({ page }) => {
  await page.goto('/login');
  await waitForAnimation(page);
  await takeScreenshot(page, 'logo-fix-login-page');
  
  // Also test register page
  await page.goto('/register');
  await waitForAnimation(page);
  await takeScreenshot(page, 'logo-fix-register-page');
});