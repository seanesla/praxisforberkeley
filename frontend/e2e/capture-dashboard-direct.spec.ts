import { test } from '@playwright/test';

test('capture dashboard directly', async ({ page }) => {
  // For demo purposes, we'll modify the auth context to show the dashboard
  await page.goto('http://localhost:3000/dashboard', {
    waitUntil: 'networkidle'
  });
  
  // Wait for components
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'screenshots/dashboard-demo.png', 
    fullPage: true 
  });
});