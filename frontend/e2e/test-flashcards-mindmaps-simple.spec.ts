import { test, expect } from '@playwright/test';

test.describe('Flashcards and Mind Maps Test', () => {
  test('Test flashcards and mind maps features', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Login with test user
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000); // Let dashboard load
    
    // Test Flashcards
    console.log('Testing Flashcards...');
    
    // Click on the Flashcards card
    await page.click('text=Flashcards >> .. >> ..');
    await page.waitForTimeout(2000);
    
    // Check URL or content
    const url = page.url();
    console.log('Current URL after clicking Flashcards:', url);
    
    // If we're on flashcards page, test study functionality
    if (url.includes('flashcard')) {
      // Look for study button
      const studyButton = page.locator('button:has-text("Study")');
      if (await studyButton.count() > 0) {
        await studyButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Go back to dashboard
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
    
    // Test Mind Maps
    console.log('Testing Mind Maps...');
    
    // Click on Build Mind Map in Quick Actions
    await page.click('text=Build Mind Map');
    await page.waitForTimeout(2000);
    
    const mindMapUrl = page.url();
    console.log('Current URL after clicking Build Mind Map:', mindMapUrl);
    
    // Take screenshots
    await page.screenshot({ path: 'dashboard-test.png', fullPage: true });
    
    // Also check the activity feed - we created a mind map via API
    await page.goto('http://localhost:3000/dashboard');
    const activityItem = page.locator('text=Generated mind map');
    if (await activityItem.count() > 0) {
      console.log('Found mind map in activity feed!');
      await activityItem.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'mindmap-view.png', fullPage: true });
    }
    
    console.log('Test completed!');
  });
});