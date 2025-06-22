import { test } from '@playwright/test';

test('interactive dashboard demo', async ({ page }) => {
  // Set a longer timeout for this demo
  test.setTimeout(300000); // 5 minutes
  
  console.log('Opening dashboard in demo mode...');
  
  // Navigate to dashboard with demo mode
  await page.goto('http://localhost:3000/dashboard?demo=true');
  
  // Wait for components to load
  await page.waitForTimeout(2000);
  
  console.log('Dashboard loaded! Keeping browser open for interaction...');
  
  // Take initial screenshot
  await page.screenshot({ 
    path: 'screenshots/dashboard-interactive.png', 
    fullPage: true 
  });
  
  // Keep the browser open for manual interaction
  console.log('Browser will stay open for 2 minutes. You can interact with the dashboard!');
  console.log('Press Ctrl+C to stop the test early.');
  
  // Wait for 2 minutes so you can see and interact with the dashboard
  await page.waitForTimeout(120000);
});