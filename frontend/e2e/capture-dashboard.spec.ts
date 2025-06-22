import { test } from '@playwright/test';

test('capture dashboard page', async ({ page }) => {
  // First login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'Test123!@#');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Wait for all components to load
  await page.waitForTimeout(3000);
  
  // Take full page screenshot
  await page.screenshot({ 
    path: 'screenshots/dashboard-full.png', 
    fullPage: true 
  });
  
  // Also capture command palette
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(1000);
  await page.screenshot({ 
    path: 'screenshots/command-palette.png',
    fullPage: true 
  });
});