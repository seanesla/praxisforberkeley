import { test, expect } from '@playwright/test';

test.describe('Flashcards Authentication Test', () => {
  test('Complete flashcards workflow with authentication', async ({ page }) => {
    console.log('Starting flashcards authentication test...');
    
    // 1. Navigate to auth test page
    await page.goto('http://localhost:3000/flashcards-auth-test');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'screenshots/auth-01-login-page.png', fullPage: true });
    
    // 2. Try to register a new user
    console.log('Attempting registration...');
    
    // Generate unique email for this test
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'testpass123');
    
    // Click register button
    await page.click('button:has-text("Register")');
    
    // Wait for either success or error
    await page.waitForTimeout(3000);
    
    // Check if we're logged in (looking for logout button)
    const logoutButton = page.locator('button:has-text("Logout")');
    const isRegistered = await logoutButton.isVisible();
    
    if (!isRegistered) {
      console.log('Registration failed, trying login with default test user...');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'testpass123');
      await page.click('button:has-text("Login")');
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot after auth
    await page.screenshot({ path: 'screenshots/auth-02-logged-in.png', fullPage: true });
    
    // 3. Create a test document
    const loggedIn = await page.locator('button:has-text("Logout")').isVisible();
    if (loggedIn) {
      console.log('Successfully authenticated!');
      
      // Click create test document
      await page.click('button:has-text("Create Test Document")');
      await page.waitForTimeout(3000);
      
      // Take screenshot with document
      await page.screenshot({ path: 'screenshots/auth-03-document-created.png', fullPage: true });
      
      // 4. Generate flashcards
      const generateButton = page.locator('button:has-text("Generate Cards")').first();
      if (await generateButton.isVisible()) {
        console.log('Generating flashcards...');
        await generateButton.click();
        await page.waitForTimeout(5000); // Wait for AI generation
        
        // Take screenshot with flashcards
        await page.screenshot({ path: 'screenshots/auth-04-flashcards-generated.png', fullPage: true });
        
        // Check if flashcards were created
        const flashcardsSection = page.locator('h2:has-text("Flashcards")');
        const flashcardElements = page.locator('.grid > div').filter({ hasText: 'Question:' });
        const flashcardCount = await flashcardElements.count();
        
        console.log(`Generated ${flashcardCount} flashcards`);
        
        if (flashcardCount > 0) {
          // Log first flashcard content
          const firstCard = flashcardElements.first();
          const question = await firstCard.locator('p').first().textContent();
          console.log('First flashcard question:', question);
        }
      }
      
      // 5. Navigate to main flashcards page
      console.log('Testing main flashcards page...');
      await page.goto('http://localhost:3000/dashboard/flashcards');
      await page.waitForTimeout(2000);
      
      // Check if redirected to login
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      if (currentUrl.includes('/login')) {
        console.log('Redirected to login - auth middleware issue');
      } else {
        await page.screenshot({ path: 'screenshots/auth-05-main-flashcards.png', fullPage: true });
      }
    } else {
      console.log('Authentication failed - could not login or register');
    }
    
    console.log('Test completed!');
  });
  
  test('Test flashcard flip animation', async ({ page }) => {
    // Navigate to the simple test page
    await page.goto('http://localhost:3000/test-flashcards');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing card flip...');
    
    // Click on the card
    const card = page.locator('.glass.rounded-xl').first();
    await card.click();
    
    // Wait for animation
    await page.waitForTimeout(500);
    
    // Check if answer is visible
    const answerBadge = page.locator('span:has-text("Answer")');
    const isFlipped = await answerBadge.isVisible();
    
    if (isFlipped) {
      // Look for answer text
      const cardContent = await card.textContent();
      console.log('Card content after flip:', cardContent);
      
      // Check if answer contains expected text
      const hasAnswer = cardContent?.includes('JavaScript library');
      console.log('Answer visible:', hasAnswer);
      
      // Take screenshot of flipped card
      await page.screenshot({ path: 'screenshots/flip-test-answer.png', fullPage: true });
      
      // Test rating buttons
      const easyButton = page.locator('button:has-text("Easy")');
      if (await easyButton.isVisible()) {
        console.log('Rating buttons visible');
        await easyButton.click();
        await page.waitForTimeout(500);
        
        // Check if moved to next card
        const progressText = await page.locator('text=/Card \\d+ of \\d+/').textContent();
        console.log('Progress:', progressText);
      }
    } else {
      console.log('Card did not flip properly');
    }
  });
});