import { test, expect } from '@playwright/test';

test.describe('Manual Flashcard Testing', () => {
  test('Test flashcards with manual interactions', async ({ page }) => {
    console.log('Starting manual flashcard test...');
    
    // 1. Go to test flashcards page
    await page.goto('http://localhost:3000/test-flashcards');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Wait for any hydration
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/manual-01-initial.png', fullPage: true });
    
    // 2. Try clicking the card with JavaScript
    console.log('Attempting to click card...');
    
    try {
      // Execute click in the browser context
      const clickResult = await page.evaluate(() => {
        const card = document.querySelector('.glass.rounded-xl');
        if (card) {
          // Simulate click event
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          card.dispatchEvent(clickEvent);
          
          // Also try direct click
          (card as HTMLElement).click();
          
          return 'Clicked successfully';
        }
        return 'Card not found';
      });
      
      console.log('Click result:', clickResult);
    } catch (error) {
      console.error('Click error:', error);
    }
    
    await page.waitForTimeout(1000);
    
    // 3. Check current state
    const pageContent = await page.evaluate(() => {
      return {
        hasAnswerBadge: !!document.querySelector('span:has-text("Answer")'),
        cardText: document.querySelector('.glass.rounded-xl')?.textContent,
        allText: document.body.textContent
      };
    });
    
    console.log('Page state after click:', {
      hasAnswerBadge: pageContent.hasAnswerBadge,
      cardTextPreview: pageContent.cardText?.substring(0, 100)
    });
    
    // Take screenshot after click attempt
    await page.screenshot({ path: 'screenshots/manual-02-after-click.png', fullPage: true });
    
    // 4. Try clicking the flip button directly
    const flipButton = page.locator('button:has-text("Flip")');
    if (await flipButton.isVisible()) {
      console.log('Flip button found, clicking...');
      await flipButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/manual-03-flip-button.png', fullPage: true });
    }
    
    // 5. Test navigation buttons
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isEnabled()) {
      console.log('Next button enabled, clicking...');
      await nextButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/manual-04-next-card.png', fullPage: true });
    }
    
    // 6. Check the Generate Cards button
    const generateButton = page.locator('button:has-text("Generate Cards")');
    console.log('Generate button visible:', await generateButton.isVisible());
    
    // 7. Final state check
    const finalState = await page.evaluate(() => {
      const progressText = document.querySelector('span:contains("1 / 3")')?.textContent;
      const cardCount = document.querySelectorAll('.glass.rounded-xl').length;
      return { progressText, cardCount };
    });
    
    console.log('Final state:', finalState);
    console.log('Test completed!');
  });
  
  test('Test flashcards auth page directly', async ({ page }) => {
    console.log('Testing auth flashcards page...');
    
    // Navigate to auth test page
    await page.goto('http://localhost:3000/flashcards-auth-test');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Check if we see the login form
    const hasLoginForm = await page.locator('input[type="email"]').isVisible();
    console.log('Login form visible:', hasLoginForm);
    
    if (hasLoginForm) {
      // Fill in credentials
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      
      // Take screenshot
      await page.screenshot({ path: 'screenshots/manual-auth-01-filled.png', fullPage: true });
      
      // Try to login
      const loginButton = page.locator('button:has-text("Login")');
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(3000);
        
        // Check result
        const errorMessage = await page.locator('text=error').isVisible();
        const logoutButton = await page.locator('button:has-text("Logout")').isVisible();
        
        console.log('Login result:', { errorMessage, logoutButton });
        await page.screenshot({ path: 'screenshots/manual-auth-02-result.png', fullPage: true });
      }
    } else {
      // Already logged in?
      const logoutButton = await page.locator('button:has-text("Logout")').isVisible();
      console.log('Already logged in:', logoutButton);
      await page.screenshot({ path: 'screenshots/manual-auth-03-logged-in.png', fullPage: true });
    }
  });
});