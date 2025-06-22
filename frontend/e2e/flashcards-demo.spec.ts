import { test, expect } from '@playwright/test';

test.describe('Flashcards Demo', () => {
  test('Complete flashcards workflow', async ({ page }) => {
    // 1. Go to demo page
    await page.goto('http://localhost:3000/flashcards-demo');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/flashcards-01-main.png', fullPage: true });

    // 2. Check due cards section
    await page.waitForSelector('text=Due for Review');
    const dueCardsButton = page.locator('button:has-text("Study Now")');
    const hasDueCards = await dueCardsButton.isVisible();
    
    if (hasDueCards) {
      console.log('Found due cards!');
      await page.screenshot({ path: 'screenshots/flashcards-02-due-cards.png', fullPage: true });
    }

    // 3. View statistics
    await page.click('button:has-text("Statistics")');
    await page.waitForSelector('text=Study Statistics');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-03-statistics.png', fullPage: true });

    // 4. Go back to main view
    await page.click('button[aria-label*="back" i], button:has([class*="ArrowLeft"])').first();
    await page.waitForTimeout(500);

    // 5. Try generate cards
    await page.click('button:has-text("Generate Cards")');
    await page.waitForSelector('text=Generate Flashcards');
    await page.screenshot({ path: 'screenshots/flashcards-04-generate.png', fullPage: true });

    // 6. Select a document
    await page.selectOption('select', '1'); // Select ML Fundamentals
    await page.screenshot({ path: 'screenshots/flashcards-05-document-selected.png', fullPage: true });

    // 7. Adjust settings
    await page.locator('input[type="range"]').fill('15');
    await page.click('button:has-text("medium")');
    await page.screenshot({ path: 'screenshots/flashcards-06-settings-configured.png', fullPage: true });

    // 8. Go back to main
    await page.click('button[aria-label*="back" i], button:has([class*="ArrowLeft"])').first();
    await page.waitForTimeout(500);

    // 9. Start study session
    if (hasDueCards) {
      await dueCardsButton.click();
      await page.waitForSelector('text=Study Session');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/flashcards-07-study-mode.png', fullPage: true });

      // 10. Interact with flashcard
      await page.click('.glass.rounded-xl'); // Click card to flip
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/flashcards-08-card-flipped.png', fullPage: true });

      // 11. Rate the card
      await page.click('button:has-text("Medium")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/flashcards-09-next-card.png', fullPage: true });

      // 12. Exit study mode
      await page.click('button:has-text("Exit Study")');
      await page.waitForTimeout(500);
    } else {
      // If no due cards, select all cards for study
      await page.click('button:has-text("Study All Cards")');
      await page.waitForSelector('text=Study Session');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/flashcards-07-study-all.png', fullPage: true });
    }

    // 13. Final screenshot of main page
    await page.screenshot({ path: 'screenshots/flashcards-10-final.png', fullPage: true });

    console.log('Flashcards demo completed successfully!');
  });
});