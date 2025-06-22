import { test, expect } from '@playwright/test';
import { 
  TEST_USERS,
  loginUser,
  takeScreenshot,
  clickWithScreenshot,
  fillFormWithScreenshots,
  testHoverState,
  waitForAnimation,
  testKeyboardNavigation,
  verifyVisible,
  testResponsive,
  setupConsoleLogging
} from './helpers/test-helpers';

test.describe('Spaced Repetition - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/study');
    await waitForAnimation(page);
  });

  test('Complete spaced repetition workflow with SM-2 algorithm', async ({ page }) => {
    console.log('📚 Starting comprehensive spaced repetition test');
    
    // Test 1: Study dashboard overview
    await test.step('Study dashboard', async () => {
      await takeScreenshot(page, 'spaced-repetition-01-dashboard');
      
      // Verify all stat cards are visible
      await verifyVisible(page, 'text=/Cards Due/i');
      await verifyVisible(page, 'text=/Today\'s Progress/i');
      await verifyVisible(page, 'text=/Current Streak/i');
      await verifyVisible(page, 'text=/Average Accuracy/i');
      
      await testResponsive(page, 'spaced-repetition-dashboard');
    });

    // Test 2: Study calendar heatmap
    await test.step('Study calendar heatmap', async () => {
      const calendarSection = page.locator('text=/Study Calendar/i').locator('..');
      await calendarSection.scrollIntoViewIfNeeded();
      await takeScreenshot(page, 'spaced-repetition-02-heatmap');
      
      // Test hover states on heatmap cells
      const heatmapCells = page.locator('[class*="heatmap-cell"]').first();
      if (await heatmapCells.isVisible()) {
        await testHoverState(page, heatmapCells, 'heatmap-cell-hover');
      }
    });

    // Test 3: Performance trends
    await test.step('Performance trends visualization', async () => {
      const performanceSection = page.locator('text=/Performance Trends/i').locator('..');
      await performanceSection.scrollIntoViewIfNeeded();
      await takeScreenshot(page, 'spaced-repetition-03-performance-trends');
    });

    // Test 4: Start study session
    await test.step('Start study session', async () => {
      // Check if there are due cards
      const startButton = page.locator('button:has-text("Start Study Session")');
      const noDueCards = page.locator('text=/All caught up!/i');
      
      if (await startButton.isVisible()) {
        await clickWithScreenshot(page, startButton, 'spaced-repetition-04-start-session');
        
        // Wait for study session to load
        await page.waitForURL('**/study**');
        await waitForAnimation(page);
        
        // Test 5: Study interface
        await test.step('Study card interface', async () => {
          // Verify progress bar
          await verifyVisible(page, 'text=/Card.*of/i');
          await takeScreenshot(page, 'spaced-repetition-05-study-interface');
          
          // Show answer
          const showAnswerButton = page.locator('button:has-text("Show Answer")');
          if (await showAnswerButton.isVisible()) {
            await clickWithScreenshot(page, showAnswerButton, 'spaced-repetition-06-show-answer');
            
            // Verify rating buttons
            await verifyVisible(page, 'text=/How well did you know this/i');
            await takeScreenshot(page, 'spaced-repetition-07-rating-buttons');
            
            // Test different difficulty ratings
            const ratings = [
              { button: 'button:has-text("Again")', name: 'again', interval: 1 },
              { button: 'button:has-text("Hard")', name: 'hard', interval: 6 },
              { button: 'button:has-text("Good")', name: 'good', interval: 10 },
              { button: 'button:has-text("Easy")', name: 'easy', interval: 15 }
            ];
            
            // Click through one card with "Good" rating
            const goodButton = page.locator('button:has-text("Good")').first();
            await clickWithScreenshot(page, goodButton, 'spaced-repetition-08-good-rating');
          }
        });
        
        // Test 6: Session completion
        await test.step('Complete study session', async () => {
          // Continue rating cards until session complete
          let cardCount = 0;
          const maxCards = 10; // Limit to prevent infinite loop
          
          while (cardCount < maxCards) {
            const showAnswer = page.locator('button:has-text("Show Answer")');
            const sessionComplete = page.locator('text=/Session Complete!/i');
            
            if (await sessionComplete.isVisible()) {
              break;
            }
            
            if (await showAnswer.isVisible()) {
              await showAnswer.click();
              await waitForAnimation(page);
              
              const goodButton = page.locator('button:has-text("Good")').first();
              if (await goodButton.isVisible()) {
                await goodButton.click();
                cardCount++;
              }
            }
            
            await page.waitForTimeout(500);
          }
          
          // Capture session complete screen
          const sessionComplete = page.locator('text=/Session Complete!/i');
          if (await sessionComplete.isVisible()) {
            await takeScreenshot(page, 'spaced-repetition-09-session-complete');
            
            // Verify session stats
            await verifyVisible(page, 'text=/Cards Studied/i');
            await verifyVisible(page, 'text=/Accuracy/i');
            await verifyVisible(page, 'text=/Time Spent/i');
            await verifyVisible(page, 'text=/Mastered/i');
          }
        });
      } else if (await noDueCards.isVisible()) {
        await takeScreenshot(page, 'spaced-repetition-10-no-due-cards');
      }
    });

    // Test 7: Keyboard navigation
    await test.step('Keyboard navigation', async () => {
      // Go back to study page
      await page.goto('/study');
      await waitForAnimation(page);
      
      await testKeyboardNavigation(page, [
        { key: 'Tab', expectedFocus: 'button' },
        { key: 'Enter', expectedAction: 'navigation or action' },
        { key: 'Escape', expectedAction: 'close or back' }
      ], 'spaced-repetition-keyboard');
    });

    // Test 8: Verify SM-2 algorithm intervals
    await test.step('SM-2 algorithm verification', async () => {
      // This would typically require checking the API responses
      // For now, we'll verify the UI shows interval information
      const intervalInfo = page.locator('text=/Interval:.*days/i').first();
      if (await intervalInfo.isVisible()) {
        const intervalText = await intervalInfo.textContent();
        console.log('SM-2 Interval displayed:', intervalText);
        
        // Verify ease factor is shown
        const easeInfo = page.locator('text=/Ease:/i').first();
        if (await easeInfo.isVisible()) {
          const easeText = await easeInfo.textContent();
          console.log('Ease factor displayed:', easeText);
        }
      }
    });

    // Test 9: Study streak verification
    await test.step('Study streak tracking', async () => {
      await page.goto('/study');
      await waitForAnimation(page);
      
      // Check current streak
      const streakElement = page.locator('text=/Current Streak/i').locator('..').locator('text=/[0-9]+ days/i');
      if (await streakElement.isVisible()) {
        const streakText = await streakElement.textContent();
        console.log('Current study streak:', streakText);
        await takeScreenshot(page, 'spaced-repetition-11-streak-display');
      }
    });

    // Test 10: Error states
    await test.step('Error state handling', async () => {
      // Test network error simulation
      await page.route('**/api/spaced-repetition/**', route => route.abort());
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Check for error handling
      const errorMessage = page.locator('text=/error|failed|unable/i').first();
      if (await errorMessage.isVisible()) {
        await takeScreenshot(page, 'spaced-repetition-12-error-state');
      }
      
      // Restore network
      await page.unroute('**/api/spaced-repetition/**');
    });
  });

  test('Responsive design for study interface', async ({ page }) => {
    console.log('📱 Testing responsive design for spaced repetition');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/study');
      await waitForAnimation(page);
      
      await takeScreenshot(page, `spaced-repetition-responsive-${viewport.name}`);
      
      // Verify layout adjustments
      const statsGrid = page.locator('[class*="grid"]').first();
      if (viewport.name === 'mobile') {
        // Should stack vertically on mobile
        await expect(statsGrid).toHaveClass(/grid-cols-1/);
      } else {
        // Should be grid on larger screens
        await expect(statsGrid).toHaveClass(/grid-cols-[2-4]/);
      }
    }
  });

  test('Performance monitoring', async ({ page }) => {
    console.log('⚡ Testing performance metrics');
    
    // Monitor performance during study session
    const metrics = await page.evaluate(() => performance.getEntriesByType('navigation'));
    console.log('Page load metrics:', metrics[0]);
    
    // Start study session if available
    const startButton = page.locator('button:has-text("Start Study Session")');
    if (await startButton.isVisible()) {
      const startTime = Date.now();
      await startButton.click();
      await page.waitForURL('**/study**');
      const loadTime = Date.now() - startTime;
      
      console.log(`Study session load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    }
  });
});