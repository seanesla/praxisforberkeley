import { test } from '@playwright/test';

test('capture Socratic dialogue demo', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com'); 
  await page.fill('input[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Navigate to Socratic page
  await page.goto('/socratic');
  await page.waitForLoadState('networkidle');
  
  // Capture selection page
  await page.screenshot({ 
    path: 'screenshots/socratic-01-selection.png',
    fullPage: true 
  });
  
  // Try to click on first document if available
  const firstDoc = page.locator('[data-testid^="document-"]').first();
  if (await firstDoc.isVisible({ timeout: 3000 })) {
    await firstDoc.click();
    await page.waitForTimeout(500);
    
    // Select a topic
    const firstTopic = page.locator('[data-testid^="topic-"]').first();
    if (await firstTopic.isVisible()) {
      await firstTopic.click();
      await page.waitForTimeout(500);
      
      // Capture with selections
      await page.screenshot({ 
        path: 'screenshots/socratic-02-ready-to-start.png',
        fullPage: true 
      });
      
      // Start dialogue
      const startButton = page.locator('[data-testid="start-dialogue"]');
      if (await startButton.isVisible()) {
        await startButton.click();
        await page.waitForTimeout(1000);
        
        // Capture dialogue interface
        await page.screenshot({ 
          path: 'screenshots/socratic-03-dialogue.png',
          fullPage: true 
        });
        
        // Type an answer if input is visible
        const answerInput = page.locator('[data-testid="answer-input"]');
        if (await answerInput.isVisible()) {
          await answerInput.fill('I believe machine learning is about creating systems that can improve their performance through experience, similar to how humans learn from examples.');
          
          await page.screenshot({ 
            path: 'screenshots/socratic-04-with-answer.png',
            fullPage: true 
          });
        }
      }
    }
  }
});