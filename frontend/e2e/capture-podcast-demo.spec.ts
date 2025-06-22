import { test } from '@playwright/test';

test('capture podcast mode demo', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com'); 
  await page.fill('input[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Navigate to podcast page
  await page.goto('/podcast');
  await page.waitForLoadState('networkidle');
  
  // Capture podcast selection page
  await page.screenshot({ 
    path: 'screenshots/podcast-01-selection.png',
    fullPage: true 
  });
  
  // Start without document
  const startButton = page.locator('text=Or start a general conversation');
  if (await startButton.isVisible()) {
    await startButton.click();
    await page.waitForTimeout(1000);
    
    // Capture podcast interface
    await page.screenshot({ 
      path: 'screenshots/podcast-02-interface.png',
      fullPage: true 
    });
    
    // Type a message
    const textInput = page.locator('[placeholder*="Type your message"]');
    if (await textInput.isVisible()) {
      await textInput.fill('Tell me about quantum computing');
      
      await page.screenshot({ 
        path: 'screenshots/podcast-03-typing.png',
        fullPage: true 
      });
    }
  }
  
  // Navigate to saved podcasts
  await page.goto('/podcasts');
  await page.waitForLoadState('networkidle');
  
  await page.screenshot({ 
    path: 'screenshots/podcast-04-saved-list.png',
    fullPage: true 
  });
});