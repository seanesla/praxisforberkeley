import { test, expect } from '@playwright/test';

test.describe('Flashcard Flip Debug', () => {
  test('Debug card flip functionality', async ({ page }) => {
    // Listen to console logs
    page.on('console', msg => {
      console.log('Browser console:', msg.text());
    });
    // Navigate to flip test page
    await page.goto('http://localhost:3000/flashcard-flip-test');
    await page.waitForLoadState('networkidle');
    
    // Wait for React to hydrate
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/flip-debug-01-initial.png', fullPage: true });
    
    // Get initial state
    const clickCountBefore = await page.locator('text=Click count:').textContent();
    const isFlippedBefore = await page.locator('text=Is flipped:').textContent();
    console.log('Initial state:', { clickCountBefore, isFlippedBefore });
    
    // Click the card
    const card = page.locator('.glass.rounded-xl').first();
    await card.click();
    
    // Wait for state update
    await page.waitForTimeout(1000);
    
    // Get state after click
    const clickCountAfter = await page.locator('text=Click count:').textContent();
    const isFlippedAfter = await page.locator('text=Is flipped:').textContent();
    console.log('After click:', { clickCountAfter, isFlippedAfter });
    
    // Take screenshot after flip
    await page.screenshot({ path: 'screenshots/flip-debug-02-flipped.png', fullPage: true });
    
    // Check if answer is visible
    const answerText = await page.locator('text=React is a JavaScript library').isVisible();
    console.log('Answer visible:', answerText);
    
    // Check if rating buttons are visible
    const easyButton = await page.locator('button:has-text("Easy")').isVisible();
    console.log('Rating buttons visible:', easyButton);
    
    // Get debug info
    const debugInfo = await page.locator('pre').textContent();
    console.log('Debug info:', debugInfo);
    
    // Click again to flip back
    await card.click();
    await page.waitForTimeout(500);
    
    // Take final screenshot
    await page.screenshot({ path: 'screenshots/flip-debug-03-flipped-back.png', fullPage: true });
    
    // Final state
    const finalState = await page.locator('pre').textContent();
    console.log('Final state:', finalState);
  });
});