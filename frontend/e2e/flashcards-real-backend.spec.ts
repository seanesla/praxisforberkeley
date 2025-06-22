import { test, expect } from '@playwright/test';

test.describe('Flashcards with Real Backend', () => {
  test('Complete user flow with real API', async ({ page }) => {
    // 1. Navigate to the real test page
    await page.goto('http://localhost:3000/flashcards-real-test');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for initial load
    await page.screenshot({ path: 'screenshots/real-flashcards-01-initial.png', fullPage: true });

    // 2. Check backend status
    const backendStatus = page.locator('text=Backend Status');
    await expect(backendStatus).toBeVisible();
    console.log('Backend status section visible');

    // 3. Create a test document
    const createDocButton = page.locator('button:has-text("Create Test Document")');
    if (await createDocButton.isVisible()) {
      console.log('Creating test document...');
      await createDocButton.click();
      
      // Wait for alert or success indication
      page.on('dialog', async dialog => {
        console.log('Alert:', dialog.message());
        await dialog.accept();
      });
      
      await page.waitForTimeout(3000); // Give time for document creation
      await page.screenshot({ path: 'screenshots/real-flashcards-02-after-doc-create.png', fullPage: true });
    }

    // 4. Click Generate Cards
    const generateButton = page.locator('button:has-text("Generate Cards")');
    if (await generateButton.isEnabled()) {
      console.log('Clicking Generate Cards...');
      await generateButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/real-flashcards-03-generate-page.png', fullPage: true });

      // 5. Select document and configure
      const selectElement = page.locator('select').first();
      if (await selectElement.isVisible()) {
        // Get all options
        const options = await selectElement.locator('option').all();
        console.log(`Found ${options.length} document options`);
        
        if (options.length > 1) {
          // Select the first real document (not the placeholder)
          await selectElement.selectOption({ index: 1 });
          await page.waitForTimeout(500);
          
          // Adjust number of cards
          const rangeInput = page.locator('input[type="range"]');
          if (await rangeInput.isVisible()) {
            await rangeInput.fill('8');
          }
          
          await page.screenshot({ path: 'screenshots/real-flashcards-04-configured.png', fullPage: true });
          
          // 6. Generate flashcards
          const generateFlashcardsButton = page.locator('button:has-text("Generate Flashcards")');
          if (await generateFlashcardsButton.isVisible()) {
            console.log('Generating flashcards...');
            await generateFlashcardsButton.click();
            
            // Wait for generation (this calls the real AI)
            await page.waitForTimeout(10000); // Give more time for AI generation
            await page.screenshot({ path: 'screenshots/real-flashcards-05-generated.png', fullPage: true });
            
            // Look for success or save button
            const saveButton = page.locator('button:has-text("Save")').or(page.locator('button:has-text("Start Studying")'));
            if (await saveButton.isVisible()) {
              await saveButton.click();
              await page.waitForTimeout(1000);
            }
          }
        }
      }
      
      // Go back to main view
      const backButton = page.locator('button[aria-label*="back" i], button:has([class*="ArrowLeft"])').first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // 7. Check if flashcards were created
    await page.screenshot({ path: 'screenshots/real-flashcards-06-main-with-cards.png', fullPage: true });
    
    // 8. Try to start a study session
    const studyButton = page.locator('button:has-text("Study")').first();
    if (await studyButton.isVisible()) {
      console.log('Starting study session...');
      await studyButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/real-flashcards-07-study-mode.png', fullPage: true });
      
      // 9. Interact with flashcard
      const flashcardElement = page.locator('.glass.rounded-xl').first();
      if (await flashcardElement.isVisible()) {
        // Click to flip
        await flashcardElement.click();
        await page.waitForTimeout(1000);
        
        // Wait for answer to show
        const answerIndicator = page.locator('text=Answer').first();
        if (await answerIndicator.isVisible()) {
          await page.screenshot({ path: 'screenshots/real-flashcards-08-card-flipped.png', fullPage: true });
          
          // Try to rate the card
          const mediumButton = page.locator('button:has-text("Medium")').first();
          if (await mediumButton.isVisible()) {
            console.log('Rating card as Medium...');
            await mediumButton.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/real-flashcards-09-after-rating.png', fullPage: true });
          }
        }
      }
    }

    // 10. Check statistics
    const statsButton = page.locator('button:has-text("Statistics")');
    if (await statsButton.isVisible()) {
      await statsButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/real-flashcards-10-statistics.png', fullPage: true });
    }

    console.log('Real backend flashcards test completed!');
  });
});