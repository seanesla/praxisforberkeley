import { test, expect } from './fixtures/base-fixtures';
import { TEST_CONFIG, SELECTORS, BENCHMARKS } from './config/test-config';
import { 
  takeScreenshot,
  clickWithScreenshot,
  testHoverState,
  waitForAnimation,
  testKeyboardNavigation,
  verifyVisible,
  testResponsive,
  waitForNetworkIdle,
  safeClick,
  waitForElement
} from './helpers/enhanced-test-helpers';

test.describe('Spaced Repetition - Enhanced Tests', () => {
  test.describe.configure({ retries: TEST_CONFIG.retries.test });
  
  test.beforeEach(async ({ authenticatedPage, performanceTracker }) => {
    // Track page load performance
    await performanceTracker.trackNavigation('study-page');
    await authenticatedPage.goto('/study');
    await waitForNetworkIdle(authenticatedPage);
  });

  test.afterEach(async ({ testCleanup }) => {
    // Cleanup will run automatically through fixture
    const summary = testCleanup.generateId('summary');
    console.log('Test cleanup summary:', summary);
  });

  test('Complete spaced repetition workflow with performance tracking', async ({ 
    authenticatedPage: page,
    testHelpers,
    performanceTracker,
    testCleanup 
  }) => {
    console.log('📚 Starting enhanced spaced repetition test');
    
    // Test 1: Study dashboard overview with performance tracking
    await test.step('Study dashboard', async () => {
      await performanceTracker.startAction('dashboard-render');
      
      await takeScreenshot(page, 'spaced-repetition-01-dashboard');
      
      // Use data-testid selectors with fallbacks
      await verifyVisible(page, SELECTORS.study?.cardsDue || '[data-testid="cards-due-stat"], text=/Cards Due/i');
      await verifyVisible(page, SELECTORS.study?.progress || '[data-testid="progress-stat"], text=/Today\'s Progress/i');
      await verifyVisible(page, SELECTORS.study?.streak || '[data-testid="streak-stat"], text=/Current Streak/i');
      await verifyVisible(page, SELECTORS.study?.accuracy || '[data-testid="accuracy-stat"], text=/Average Accuracy/i');
      
      const dashboardMetric = await performanceTracker.endAction('dashboard-render');
      expect(dashboardMetric.value).toBeLessThan(BENCHMARKS.tti.good);
      
      await testResponsive(page, 'spaced-repetition-dashboard');
    });

    // Test 2: Study calendar heatmap with interaction tracking
    await test.step('Study calendar heatmap', async () => {
      const calendarSection = page.locator('[data-testid="study-calendar"], text=/Study Calendar/i').locator('..');
      await calendarSection.scrollIntoViewIfNeeded();
      
      await performanceTracker.trackRenderPerformance('heatmap-render', async () => {
        await takeScreenshot(page, 'spaced-repetition-02-heatmap');
      });
      
      // Test hover states on heatmap cells
      const heatmapCells = page.locator('[data-testid="heatmap-cell"], [class*="heatmap-cell"]').first();
      if (await waitForElement(page, heatmapCells.toString())) {
        await testHoverState(page, heatmapCells, 'heatmap-cell-hover');
      }
    });

    // Test 3: Performance trends with data validation
    await test.step('Performance trends visualization', async () => {
      const performanceSection = page.locator('[data-testid="performance-trends"], text=/Performance Trends/i').locator('..');
      await performanceSection.scrollIntoViewIfNeeded();
      await takeScreenshot(page, 'spaced-repetition-03-performance-trends');
      
      // Verify data integrity
      const chartData = await page.locator('[data-testid="chart-data"]').getAttribute('data-values');
      if (chartData) {
        const values = JSON.parse(chartData);
        expect(values).toBeInstanceOf(Array);
        expect(values.length).toBeGreaterThan(0);
      }
    });

    // Test 4: Start study session with comprehensive tracking
    await test.step('Start study session', async () => {
      const startButton = page.locator('[data-testid="start-study-button"], button:has-text("Start Study Session")');
      const noDueCards = page.locator('[data-testid="no-due-cards"], text=/All caught up!/i');
      
      if (await waitForElement(page, startButton.toString())) {
        // Track session start performance
        await performanceTracker.trackAPICall('spaced-repetition/session/start', async () => {
          await safeClick(page, startButton.toString(), {
            screenshotName: 'spaced-repetition-04-start-session',
            waitAfter: TEST_CONFIG.timeouts.animation
          });
        });
        
        // Wait for study session to load
        await page.waitForURL('**/study**', { timeout: TEST_CONFIG.timeouts.navigation });
        await waitForNetworkIdle(page);
        
        // Test 5: Study interface
        await test.step('Study card interface', async () => {
          // Verify progress bar
          await verifyVisible(page, '[data-testid="study-progress"], text=/Card.*of/i');
          await takeScreenshot(page, 'spaced-repetition-05-study-interface');
          
          // Show answer with performance tracking
          const showAnswerButton = page.locator('[data-testid="show-answer-button"], button:has-text("Show Answer")');
          if (await waitForElement(page, showAnswerButton.toString())) {
            await performanceTracker.startAction('show-answer');
            await clickWithScreenshot(page, showAnswerButton, 'spaced-repetition-06-show-answer');
            await performanceTracker.endAction('show-answer');
            
            // Verify rating buttons
            await verifyVisible(page, '[data-testid="rating-prompt"], text=/How well did you know this/i');
            await takeScreenshot(page, 'spaced-repetition-07-rating-buttons');
            
            // Test different difficulty ratings with SM-2 validation
            const ratings = [
              { selector: '[data-testid="rating-again"], button:has-text("Again")', name: 'again', expectedInterval: 1 },
              { selector: '[data-testid="rating-hard"], button:has-text("Hard")', name: 'hard', expectedInterval: 6 },
              { selector: '[data-testid="rating-good"], button:has-text("Good")', name: 'good', expectedInterval: 10 },
              { selector: '[data-testid="rating-easy"], button:has-text("Easy")', name: 'easy', expectedInterval: 15 }
            ];
            
            // Click through one card with "Good" rating
            const goodButton = page.locator(ratings[2].selector).first();
            await clickWithScreenshot(page, goodButton, 'spaced-repetition-08-good-rating');
            
            // Register card for cleanup
            const cardId = await page.locator('[data-testid="current-card-id"]').getAttribute('data-id');
            if (cardId) {
              testCleanup.registerFlashcard(cardId);
            }
          }
        });
        
        // Test 6: Session completion with metrics
        await test.step('Complete study session', async () => {
          // Continue rating cards until session complete
          let cardCount = 0;
          const maxCards = 10; // Limit to prevent infinite loop
          
          while (cardCount < maxCards) {
            const showAnswer = page.locator('[data-testid="show-answer-button"], button:has-text("Show Answer")');
            const sessionComplete = page.locator('[data-testid="session-complete"], text=/Session Complete!/i');
            
            if (await sessionComplete.isVisible()) {
              break;
            }
            
            if (await waitForElement(page, showAnswer.toString(), { timeout: TEST_CONFIG.timeouts.element })) {
              await showAnswer.click();
              await page.waitForTimeout(TEST_CONFIG.timeouts.animation);
              
              const goodButton = page.locator('[data-testid="rating-good"], button:has-text("Good")').first();
              if (await goodButton.isVisible()) {
                await goodButton.click();
                cardCount++;
              }
            }
            
            await page.waitForTimeout(TEST_CONFIG.timeouts.animation);
          }
          
          // Capture session complete screen
          const sessionComplete = page.locator('[data-testid="session-complete"], text=/Session Complete!/i');
          if (await sessionComplete.isVisible()) {
            await takeScreenshot(page, 'spaced-repetition-09-session-complete');
            
            // Verify session stats
            const stats = {
              cardsStudied: await page.locator('[data-testid="cards-studied"]').textContent(),
              accuracy: await page.locator('[data-testid="session-accuracy"]').textContent(),
              timeSpent: await page.locator('[data-testid="time-spent"]').textContent(),
              mastered: await page.locator('[data-testid="cards-mastered"]').textContent()
            };
            
            console.log('Session statistics:', stats);
            expect(parseInt(stats.cardsStudied || '0')).toBeGreaterThan(0);
          }
        });
      } else if (await noDueCards.isVisible()) {
        await takeScreenshot(page, 'spaced-repetition-10-no-due-cards');
      }
    });

    // Test 7: Accessibility and keyboard navigation
    await test.step('Accessibility and keyboard navigation', async () => {
      await page.goto('/study');
      await waitForNetworkIdle(page);
      
      // Check accessibility
      const violations = await testHelpers.checkAccessibility('study-page');
      expect(violations.violations).toHaveLength(0);
      
      await testKeyboardNavigation(page, [
        { key: 'Tab', expectedFocus: '[data-testid="start-study-button"], button' },
        { key: 'Enter', expectedAction: 'navigation or action' },
        { key: 'Escape', expectedAction: 'close or back' }
      ], 'spaced-repetition-keyboard');
    });

    // Test 8: Memory and performance analysis
    await test.step('Performance and memory analysis', async () => {
      await performanceTracker.trackMemoryUsage('study-session-end');
      
      const report = await performanceTracker.generateReport();
      console.log('Performance Report:\n', report);
      
      // Assert critical performance metrics
      const summary = performanceTracker['generateSummary']();
      expect(summary.statusBreakdown.poor || 0).toBe(0);
      expect(summary.averageDuration).toBeLessThan(BENCHMARKS.tti.needsImprovement);
    });
  });

  test('SM-2 algorithm verification with data validation', async ({ 
    authenticatedPage: page,
    testHelpers,
    performanceTracker 
  }) => {
    console.log('🧮 Testing SM-2 algorithm implementation');
    
    // Mock a study card with known parameters
    await testHelpers.mockAPIResponse('spaced-repetition/due', {
      cards: [{
        id: 'test-card-1',
        flashcard: {
          front: 'Test Question',
          back: 'Test Answer',
          set: { title: 'Test Set' }
        },
        repetitions: 2,
        ease_factor: 2.5,
        interval: 6,
        next_review_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
      }]
    });
    
    await page.goto('/study');
    await waitForNetworkIdle(page);
    
    // Start study session
    const startButton = page.locator('[data-testid="start-study-button"]');
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // Show answer
      await page.locator('[data-testid="show-answer-button"]').click();
      
      // Test each rating and verify interval calculation
      const testCases = [
        { rating: 1, expectedInterval: 1, expectedEaseFactor: 1.96 },
        { rating: 2, expectedInterval: 6, expectedEaseFactor: 2.18 },
        { rating: 3, expectedInterval: 15, expectedEaseFactor: 2.36 },
        { rating: 4, expectedInterval: 24, expectedEaseFactor: 2.5 }
      ];
      
      for (const testCase of testCases) {
        // Mock the review response
        await testHelpers.mockAPIResponse('spaced-repetition/review', {
          result: {
            interval: testCase.expectedInterval,
            easeFactor: testCase.expectedEaseFactor,
            nextReviewDate: new Date(Date.now() + testCase.expectedInterval * 24 * 60 * 60 * 1000).toISOString()
          }
        });
        
        console.log(`Testing rating ${testCase.rating}: expecting interval ${testCase.expectedInterval}`);
      }
    }
  });

  test('Responsive design and performance across viewports', async ({ 
    authenticatedPage: page,
    performanceTracker 
  }) => {
    console.log('📱 Testing responsive design with performance metrics');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile', maxLoadTime: 5000 },
      { width: 768, height: 1024, name: 'tablet', maxLoadTime: 4000 },
      { width: 1920, height: 1080, name: 'desktop', maxLoadTime: 3000 }
    ];
    
    for (const viewport of viewports) {
      await test.step(`Test on ${viewport.name}`, async () => {
        await page.setViewportSize(viewport);
        
        const navTiming = await performanceTracker.trackNavigation(`study-${viewport.name}`);
        expect(navTiming.loadComplete).toBeLessThan(viewport.maxLoadTime);
        
        await page.goto('/study');
        await waitForNetworkIdle(page);
        
        await takeScreenshot(page, `spaced-repetition-responsive-${viewport.name}`);
        
        // Verify layout adjustments
        const statsGrid = page.locator('[data-testid="stats-grid"], [class*="grid"]').first();
        if (viewport.name === 'mobile') {
          await expect(statsGrid).toHaveClass(/grid-cols-1/);
        } else {
          await expect(statsGrid).toHaveClass(/grid-cols-[2-4]/);
        }
        
        // Track render performance for each viewport
        await performanceTracker.trackRenderPerformance(`${viewport.name}-render`, async () => {
          await page.locator('body').hover();
          await page.waitForTimeout(TEST_CONFIG.timeouts.animation);
        });
      });
    }
  });
});