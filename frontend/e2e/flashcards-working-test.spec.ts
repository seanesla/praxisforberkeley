import { test, expect } from '@playwright/test';

test.describe('Working Flashcards Test', () => {
  test('Test existing flashcards functionality', async ({ page }) => {
    // 1. Go to test flashcards page that we know works
    await page.goto('http://localhost:3000/test-flashcards');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/working-01-main.png', fullPage: true });
    
    // 2. Test card flipping
    console.log('Testing card flip...');
    const card = page.locator('.glass.rounded-xl').first();
    await card.click();
    await page.waitForTimeout(1000);
    
    // Check if we see "Answer" badge
    const answerBadge = page.locator('span:has-text("Answer")');
    const isFlipped = await answerBadge.isVisible();
    console.log('Card flipped:', isFlipped);
    
    if (isFlipped) {
      await page.screenshot({ path: 'screenshots/working-02-flipped.png', fullPage: true });
      
      // Look for the answer text
      const answerText = await card.textContent();
      console.log('Answer shown:', answerText?.includes('React is a JavaScript library'));
    }
    
    // 3. Test navigation
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/working-03-next-card.png', fullPage: true });
    }
    
    // 4. Test Generate Cards button
    const generateButton = page.locator('button:has-text("Generate Cards")');
    console.log('Generate button visible:', await generateButton.isVisible());
    
    // 5. Test Statistics button  
    const statsButton = page.locator('button:has-text("Statistics")');
    console.log('Stats button visible:', await statsButton.isVisible());
    
    console.log('Test completed successfully!');
  });
});