import { test } from '@playwright/test';

test('view demo dashboard', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes
  
  console.log('Opening demo dashboard...');
  
  // Navigate directly to demo page
  await page.goto('http://localhost:3000/demo');
  
  // Wait for components to load
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'screenshots/demo-dashboard.png', 
    fullPage: true 
  });
  
  console.log('Demo dashboard loaded!');
  console.log('Browser will stay open for interaction.');
  console.log('Try these shortcuts:');
  console.log('- Press Cmd+K (Mac) or Ctrl+K (Windows) to open Command Palette');
  console.log('- Press Cmd+/ (Mac) or Ctrl+/ (Windows) to open AI Assistant');
  console.log('Press Ctrl+C to close the browser.');
  
  // Keep browser open for interaction
  await page.waitForTimeout(300000);
});