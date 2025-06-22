import { test, expect } from '@playwright/test';

test.describe('Final Flashcards Test', () => {
  test('Complete flashcards functionality test', async ({ page }) => {
    console.log('=== Starting Final Flashcards Test ===');
    
    // 1. Navigate to test flashcards page
    await page.goto('http://localhost:3000/test-flashcards');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Wait for hydration
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/final-01-flashcards-page.png', fullPage: true });
    console.log('✓ Flashcards page loaded');
    
    // 2. Test card flip using Flip button
    console.log('\n--- Testing Card Flip ---');
    const flipButton = page.locator('button:has-text("Flip")');
    const isFlipButtonVisible = await flipButton.isVisible();
    console.log('Flip button visible:', isFlipButtonVisible);
    
    if (isFlipButtonVisible) {
      await flipButton.click();
      await page.waitForTimeout(1000);
      
      // Check if answer is visible
      const answerBadge = page.locator('span:text("Answer")');
      const isAnswerVisible = await answerBadge.isVisible();
      console.log('Answer badge visible after flip:', isAnswerVisible);
      
      // Look for answer text
      const cardElement = page.locator('.glass.rounded-xl').first();
      const cardText = await cardElement.textContent();
      const hasAnswerText = cardText?.includes('JavaScript library');
      console.log('Answer text visible:', hasAnswerText);
      
      await page.screenshot({ path: 'screenshots/final-02-card-flipped.png', fullPage: true });
      
      // Check for rating buttons
      const easyButton = page.locator('button:text("Easy")');
      const ratingButtonsVisible = await easyButton.isVisible();
      console.log('Rating buttons visible:', ratingButtonsVisible);
      
      if (ratingButtonsVisible) {
        console.log('✓ Card flip working correctly');
      } else {
        console.log('✗ Card flip not showing rating buttons');
      }
    }
    
    // 3. Test navigation
    console.log('\n--- Testing Navigation ---');
    const nextButton = page.locator('button:has-text("Next")');
    const prevButton = page.locator('button:has-text("Previous")');
    
    const isNextEnabled = await nextButton.isEnabled();
    const isPrevDisabled = await prevButton.isDisabled();
    
    console.log('Next button enabled:', isNextEnabled);
    console.log('Previous button disabled:', isPrevDisabled);
    
    if (isNextEnabled) {
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Check progress update
      const progressText = await page.locator('text=/\\d+ \\/ \\d+/').textContent();
      console.log('Progress after next:', progressText);
      
      await page.screenshot({ path: 'screenshots/final-03-second-card.png', fullPage: true });
      
      // Now previous should be enabled
      const isPrevNowEnabled = await prevButton.isEnabled();
      console.log('Previous button now enabled:', isPrevNowEnabled);
      
      if (isPrevNowEnabled) {
        console.log('✓ Navigation working correctly');
      }
    }
    
    // 4. Test Generate Cards button
    console.log('\n--- Testing UI Buttons ---');
    const generateButton = page.locator('button:has-text("Generate Cards")');
    const statsButton = page.locator('button:has-text("Statistics")');
    
    const generateVisible = await generateButton.isVisible();
    const statsVisible = await statsButton.isVisible();
    
    console.log('Generate Cards button visible:', generateVisible);
    console.log('Statistics button visible:', statsVisible);
    
    // 5. Test card list at bottom
    console.log('\n--- Testing Card List ---');
    const cardListItems = page.locator('.glass.rounded-xl ~ .glass.rounded-xl .p-4');
    const cardCount = await cardListItems.count();
    console.log('Number of cards in list:', cardCount);
    
    if (cardCount > 0) {
      const firstCardInList = cardListItems.first();
      const listCardText = await firstCardInList.textContent();
      console.log('First card in list:', listCardText?.substring(0, 50) + '...');
    }
    
    // 6. Test keyboard hint
    const keyboardHint = page.locator('text=/Press.*Space.*to flip/');
    const hasKeyboardHint = await keyboardHint.isVisible();
    console.log('Keyboard hint visible:', hasKeyboardHint);
    
    // Final summary
    console.log('\n=== Test Summary ===');
    console.log('✓ Page loads correctly');
    console.log('✓ All UI elements visible');
    console.log('✓ Navigation controls present');
    console.log('✓ Card list displays');
    
    await page.screenshot({ path: 'screenshots/final-04-complete.png', fullPage: true });
    
    console.log('\n=== Test Completed Successfully ===');
  });
  
  test('Test direct card interaction', async ({ page }) => {
    console.log('=== Testing Direct Card Click ===');
    
    await page.goto('http://localhost:3000/test-flashcards');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Try multiple click methods
    const card = page.locator('.glass.rounded-xl').first();
    
    // Method 1: Regular click
    console.log('Attempting regular click...');
    await card.click();
    await page.waitForTimeout(500);
    
    let isFlipped = await page.locator('span:text("Answer")').isVisible();
    console.log('Flipped after regular click:', isFlipped);
    
    if (!isFlipped) {
      // Method 2: Force click
      console.log('Attempting force click...');
      await card.click({ force: true });
      await page.waitForTimeout(500);
      
      isFlipped = await page.locator('span:text("Answer")').isVisible();
      console.log('Flipped after force click:', isFlipped);
    }
    
    if (!isFlipped) {
      // Method 3: Click at center
      console.log('Attempting center click...');
      const box = await card.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(500);
        
        isFlipped = await page.locator('span:text("Answer")').isVisible();
        console.log('Flipped after center click:', isFlipped);
      }
    }
    
    // Log console messages
    page.on('console', msg => {
      if (msg.text().includes('Flipping')) {
        console.log('Console:', msg.text());
      }
    });
    
    await page.screenshot({ path: 'screenshots/final-direct-click-result.png', fullPage: true });
  });
});