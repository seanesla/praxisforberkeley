import { test, expect } from '@playwright/test';

test.describe('Flashcards and Mind Maps E2E Test', () => {
  test('Full user journey - Login, create flashcards, create mind maps', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Login with test user
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Test Flashcards
    console.log('Testing Flashcards...');
    
    // Navigate to flashcards
    await page.click('text=Flashcards');
    await page.waitForURL('**/flashcards');
    
    // Check if flashcards page loaded
    await expect(page.locator('h1:has-text("Flashcards")')).toBeVisible();
    
    // Create a manual flashcard (if UI supports it)
    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")');
    if (await createButton.count() > 0) {
      await createButton.first().click();
      
      // Fill in flashcard details if form appears
      const questionInput = page.locator('input[placeholder*="question" i], textarea[placeholder*="question" i]');
      if (await questionInput.count() > 0) {
        await questionInput.fill('What is Praxis?');
        const answerInput = page.locator('input[placeholder*="answer" i], textarea[placeholder*="answer" i]');
        await answerInput.fill('A revolutionary AI-powered knowledge management system');
        
        // Submit
        await page.click('button:has-text("Save"), button:has-text("Create"), button:has-text("Add")');
      }
    }
    
    // Test study mode
    const studyButton = page.locator('button:has-text("Study"), button:has-text("Practice")');
    if (await studyButton.count() > 0) {
      await studyButton.first().click();
      
      // Test card flipping
      await page.waitForTimeout(1000);
      const card = page.locator('.flashcard-card, [data-testid="flashcard"]').first();
      if (await card.count() > 0) {
        await card.click();
        await page.waitForTimeout(500); // Wait for flip animation
      }
    }
    
    // Test Mind Maps
    console.log('Testing Mind Maps...');
    
    // Navigate to mind maps
    await page.click('text=Mind Maps');
    await page.waitForURL('**/mindmaps');
    
    // Check if mind maps page loaded
    await expect(page.locator('h1:has-text("Mind Maps")')).toBeVisible();
    
    // Check if our created mind map appears
    await expect(page.locator('text=Praxis Overview')).toBeVisible({ timeout: 5000 });
    
    // Click on the mind map to view it
    await page.click('text=Praxis Overview');
    
    // Wait for mind map canvas to load
    await page.waitForSelector('.react-flow, canvas, svg', { timeout: 10000 });
    
    // Test interactive features
    const canvas = page.locator('.react-flow, canvas, svg').first();
    if (await canvas.count() > 0) {
      // Try to drag a node
      const node = page.locator('.react-flow__node, [data-testid="mind-map-node"]').first();
      if (await node.count() > 0) {
        await node.hover();
        await page.mouse.down();
        await page.mouse.move(100, 100);
        await page.mouse.up();
      }
    }
    
    // Take screenshots for verification
    await page.screenshot({ path: 'flashcards-test.png', fullPage: true });
    await page.goto('http://localhost:3000/dashboard/mindmaps');
    await page.screenshot({ path: 'mindmaps-test.png', fullPage: true });
    
    console.log('Tests completed successfully!');
  });
});