import { test, expect } from '@playwright/test';

test.describe('Full Flashcards Demo', () => {
  test('Complete flashcards workflow demonstration', async ({ page }) => {
    // 1. Go to full demo page
    await page.goto('http://localhost:3000/flashcards-full-demo');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/flashcards-full-01-overview.png', fullPage: true });

    // 2. Check due cards section
    const dueCardsSection = page.locator('text=Due for Review').first();
    await expect(dueCardsSection).toBeVisible();
    console.log('Found due cards section');

    // 3. Click Statistics
    await page.click('button:has-text("Statistics")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-full-02-stats.png', fullPage: true });

    // 4. Go back
    await page.click('button[aria-label*="back" i], button:has([class*="ArrowLeft"])').first();
    await page.waitForTimeout(500);

    // 5. Click Generate Cards
    await page.click('button:has-text("Generate Cards")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-full-03-generate.png', fullPage: true });

    // 6. Select document and configure
    const selectElement = page.locator('select').first();
    if (await selectElement.isVisible()) {
      await selectElement.selectOption({ index: 1 });
      await page.locator('input[type="range"]').fill('12');
      await page.screenshot({ path: 'screenshots/flashcards-full-04-generate-config.png', fullPage: true });
    }

    // 7. Go back to overview
    await page.click('button[aria-label*="back" i], button:has([class*="ArrowLeft"])').first();
    await page.waitForTimeout(500);

    // 8. Start study session with due cards
    const studyButton = page.locator('button:has-text("Study Now")').first();
    if (await studyButton.isVisible()) {
      await studyButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/flashcards-full-05-study-mode.png', fullPage: true });

      // 9. Try to interact with a flashcard
      const flashcardElement = page.locator('.glass.rounded-xl').first();
      if (await flashcardElement.isVisible()) {
        // Click to flip
        await flashcardElement.click();
        await page.waitForTimeout(1000);
        
        // Check if answer is showing
        const answerBadge = page.locator('text=Answer');
        if (await answerBadge.isVisible()) {
          await page.screenshot({ path: 'screenshots/flashcards-full-06-card-answer.png', fullPage: true });
          
          // Try rating buttons
          const easyButton = page.locator('button:has-text("Easy")').first();
          if (await easyButton.isVisible()) {
            await easyButton.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: 'screenshots/flashcards-full-07-next-card.png', fullPage: true });
          }
        }
      }

      // Exit study mode
      const exitButton = page.locator('button:has-text("Exit Study")');
      if (await exitButton.isVisible()) {
        await exitButton.click();
        await page.waitForTimeout(500);
      }
    }

    // 10. Final overview screenshot
    await page.screenshot({ path: 'screenshots/flashcards-full-08-final.png', fullPage: true });
    
    console.log('Full flashcards demo completed!');
  });
});