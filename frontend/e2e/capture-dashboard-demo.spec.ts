import { test } from '@playwright/test';

test('capture dashboard in demo mode', async ({ page }) => {
  // Navigate to dashboard with demo mode
  await page.goto('http://localhost:3000/dashboard?demo=true');
  
  // Wait for components to load
  await page.waitForTimeout(3000);
  
  // Take full page screenshot
  await page.screenshot({ 
    path: 'screenshots/dashboard-full.png', 
    fullPage: true 
  });
  
  // Capture command palette
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(1000);
  await page.screenshot({ 
    path: 'screenshots/command-palette.png',
    fullPage: true 
  });
  
  // Close command palette
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // Open AI assistant
  await page.keyboard.press('Meta+/');
  await page.waitForTimeout(1000);
  await page.screenshot({ 
    path: 'screenshots/ai-assistant.png',
    fullPage: true 
  });
});