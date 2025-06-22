import { test, expect } from '@playwright/test';

test.describe('Flashcards Test', () => {
  test('Demonstrate flashcards functionality', async ({ page }) => {
    // 1. Go to test page
    await page.goto('http://localhost:3000/test-flashcards');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/flashcards-01-main.png', fullPage: true });

    // 2. Click the first card to flip it
    await page.click('.glass.rounded-xl');
    await page.waitForTimeout(1000); // Give more time for flip animation
    
    // Wait for the Answer badge to appear
    await page.waitForSelector('text=Answer', { timeout: 5000 });
    await page.screenshot({ path: 'screenshots/flashcards-02-card-flipped.png', fullPage: true });

    // 3. Look for rating buttons and click if available
    const mediumButton = page.locator('button:has-text("Medium")');
    if (await mediumButton.isVisible()) {
      await mediumButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/flashcards-03-second-card.png', fullPage: true });
    } else {
      // If no rating buttons, just navigate to next card
      console.log('No rating buttons visible, skipping to next test');
      await page.screenshot({ path: 'screenshots/flashcards-03-no-rating.png', fullPage: true });
    }

    // 4. Flip second card
    await page.click('.glass.rounded-xl');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/flashcards-04-second-flipped.png', fullPage: true });

    // 5. Rate as easy
    await page.click('button:has-text("Easy")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/flashcards-05-third-card.png', fullPage: true });

    // 6. Flip third card
    await page.click('.glass.rounded-xl');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/flashcards-06-third-flipped.png', fullPage: true });

    // 7. Rate as hard
    await page.click('button:has-text("Hard")');
    await page.waitForTimeout(500);
    
    // 8. Should show results
    await page.waitForSelector('text=Study Session Complete!');
    await page.screenshot({ path: 'screenshots/flashcards-07-results.png', fullPage: true });

    // 9. Click study again
    await page.click('button:has-text("Study Again")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/flashcards-08-restart.png', fullPage: true });

    console.log('Flashcards test completed successfully!');
  });
});