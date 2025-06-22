import { test, expect } from '@playwright/test';

test.describe('Direct Navigation Test', () => {
  test('Navigate directly to flashcards and mindmaps', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Test direct navigation to flashcards
    console.log('Testing Flashcards page...');
    await page.goto('http://localhost:3000/dashboard/flashcards');
    await page.waitForTimeout(3000);
    
    // Take screenshot of flashcards page
    await page.screenshot({ path: 'flashcards-page.png', fullPage: true });
    
    // Check if we're on the flashcards page
    const flashcardsUrl = page.url();
    console.log('Flashcards URL:', flashcardsUrl);
    
    // Look for flashcards UI elements
    const flashcardsTitle = await page.locator('h1, h2').filter({ hasText: /flashcard/i }).count();
    console.log('Found flashcards title elements:', flashcardsTitle);
    
    // Test direct navigation to mindmaps
    console.log('Testing Mind Maps page...');
    await page.goto('http://localhost:3000/dashboard/mindmaps');
    await page.waitForTimeout(3000);
    
    // Take screenshot of mindmaps page
    await page.screenshot({ path: 'mindmaps-page.png', fullPage: true });
    
    // Check if we're on the mindmaps page
    const mindmapsUrl = page.url();
    console.log('Mind Maps URL:', mindmapsUrl);
    
    // Look for mind maps UI elements
    const mindmapsTitle = await page.locator('h1, h2').filter({ hasText: /mind.*map/i }).count();
    console.log('Found mind maps title elements:', mindmapsTitle);
    
    // Check if our created mind map appears in the list
    const praxisOverview = await page.locator('text=Praxis Overview').count();
    console.log('Found "Praxis Overview" mind map:', praxisOverview > 0);
    
    if (praxisOverview > 0) {
      // Click on the mind map
      await page.click('text=Praxis Overview');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'mindmap-detail.png', fullPage: true });
      console.log('Opened mind map detail view');
    }
    
    console.log('Test completed!');
  });
});