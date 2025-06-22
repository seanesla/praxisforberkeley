import { test, expect } from '@playwright/test';

test.describe('Flashcards Feature Demo', () => {
  test('Demonstrate flashcards with existing user', async ({ page }) => {
    // 1. Go to login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // 2. Login with test credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.screenshot({ path: 'screenshots/flashcards-01-login.png', fullPage: true });
    
    await page.click('button[type="submit"]');
    
    // 3. Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForSelector('text=Welcome back', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/flashcards-02-dashboard.png', fullPage: true });

    // 4. Navigate to flashcards
    await page.click('button:has-text("Study Flashcards")');
    await page.waitForURL('**/dashboard/flashcards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-03-main-page.png', fullPage: true });

    // 5. Click Generate Cards
    await page.click('button:has-text("Generate Cards")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-04-generate-page.png', fullPage: true });

    // 6. If no documents, show the generate interface
    const hasDocuments = await page.locator('select option').count() > 1;
    
    if (!hasDocuments) {
      console.log('No documents found. Showing generate interface...');
      await page.screenshot({ path: 'screenshots/flashcards-05-no-documents.png', fullPage: true });
      
      // Go back and try sample flashcards
      await page.click('button[aria-label*="back" i], button:has([class*="ArrowLeft"])').first();
      await page.waitForTimeout(1000);
    } else {
      // Select first document
      const firstOption = await page.locator('select option').nth(1).getAttribute('value');
      await page.selectOption('select', firstOption!);
      await page.screenshot({ path: 'screenshots/flashcards-05-document-selected.png', fullPage: true });
      
      // Adjust settings
      await page.locator('input[type="range"]').fill('10');
      await page.click('button:has-text("mixed")');
      
      await page.screenshot({ path: 'screenshots/flashcards-06-settings.png', fullPage: true });
    }

    // 7. Check statistics view
    await page.click('button:has-text("Statistics")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-07-statistics.png', fullPage: true });

    // 8. If there are existing flashcards, show them
    await page.click('button[aria-label*="back" i], button:has([class*="ArrowLeft"])').first();
    await page.waitForTimeout(1000);
    
    const hasFlashcards = await page.locator('text=No flashcards yet').isVisible() === false;
    
    if (hasFlashcards) {
      await page.screenshot({ path: 'screenshots/flashcards-08-existing-cards.png', fullPage: true });
      
      // Try to start a study session
      const studyButton = page.locator('button:has-text("Study")').first();
      if (await studyButton.isVisible()) {
        await studyButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'screenshots/flashcards-09-study-mode.png', fullPage: true });
      }
    } else {
      console.log('No existing flashcards to display');
      await page.screenshot({ path: 'screenshots/flashcards-08-empty-state.png', fullPage: true });
    }

    console.log('Flashcards demo completed!');
  });
});