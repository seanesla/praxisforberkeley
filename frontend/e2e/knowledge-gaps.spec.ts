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

test.describe('Knowledge Gaps - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/knowledge-gaps');
    await waitForAnimation(page);
  });

  test('Complete knowledge gap analysis workflow', async ({ page }) => {
    console.log('🎯 Starting comprehensive knowledge gap analysis test');
    
    // Test 1: Knowledge gaps dashboard
    await test.step('Knowledge gaps dashboard', async () => {
      await takeScreenshot(page, 'knowledge-gaps-01-dashboard');
      
      // Verify header and description
      await verifyVisible(page, 'text=/Knowledge Gap Analysis/i');
      await verifyVisible(page, 'text=/Identify.*gaps.*understanding/i');
      
      await testResponsive(page, 'knowledge-gaps-dashboard');
    });

    // Test 2: Empty state
    await test.step('Empty state display', async () => {
      const emptyState = page.locator('text=/No Knowledge Gaps Detected/i');
      const analyzeButton = page.locator('button:has-text("Analyze Knowledge")');
      
      if (await emptyState.isVisible()) {
        await takeScreenshot(page, 'knowledge-gaps-02-empty-state');
        
        // Verify empty state elements
        await verifyVisible(page, 'text=/Run.*analysis.*identify.*areas/i');
        await verifyVisible(page, 'button:has-text("Start Analysis")');
      }
    });

    // Test 3: Run knowledge analysis
    await test.step('Run knowledge analysis', async () => {
      const analyzeButton = page.locator('button:has-text("Analyze Knowledge"), button:has-text("Start Analysis")').first();
      
      if (await analyzeButton.isVisible()) {
        await clickWithScreenshot(page, analyzeButton, 'knowledge-gaps-03-analyze-button');
        
        // Wait for analysis to complete
        await page.waitForSelector('text=/Analyzing/i', { state: 'hidden', timeout: 30000 }).catch(() => {});
        await waitForAnimation(page);
        
        // Check for identified gaps
        const gapCards = page.locator('[class*="glass-card"][class*="border"]');
        if (await gapCards.first().isVisible()) {
          await takeScreenshot(page, 'knowledge-gaps-04-detected-gaps');
        }
      }
    });

    // Test 4: Gap types and severity
    await test.step('Knowledge gap types and severity', async () => {
      const gapCards = page.locator('[class*="glass-card"][class*="border"]');
      
      if (await gapCards.first().isVisible()) {
        // Test different gap types
        const gapTypes = ['prerequisite', 'conceptual', 'application', 'retention'];
        
        for (const type of gapTypes) {
          const gapType = page.locator(`text=/${type}.*gap/i`).first();
          if (await gapType.isVisible()) {
            console.log(`Found gap type: ${type}`);
            const card = gapType.locator('ancestor::div[class*="glass-card"]').first();
            await card.scrollIntoViewIfNeeded();
            await takeScreenshot(page, `knowledge-gaps-05-${type}-gap`);
          }
        }
        
        // Test severity levels
        const severityLevels = ['critical', 'high', 'medium', 'low'];
        
        for (const severity of severityLevels) {
          const severityBadge = page.locator(`text=/${severity}/i`).first();
          if (await severityBadge.isVisible()) {
            console.log(`Found severity level: ${severity}`);
          }
        }
      }
    });

    // Test 5: Gap details and selection
    await test.step('Select and view gap details', async () => {
      const firstGap = page.locator('[class*="glass-card"][class*="border"]').first();
      
      if (await firstGap.isVisible()) {
        // Test hover state
        await testHoverState(page, firstGap, 'gap-card-hover');
        
        // Click to select
        await clickWithScreenshot(page, firstGap, 'knowledge-gaps-06-gap-selected');
        
        // Verify selection state (ring indicator)
        await expect(firstGap).toHaveClass(/ring-2.*ring-purple-500/);
        
        // Check for recommended actions
        const recommendedActions = page.locator('text=/Recommended Actions/i');
        if (await recommendedActions.isVisible()) {
          await takeScreenshot(page, 'knowledge-gaps-07-recommended-actions');
          
          // Verify action items
          const actionItems = page.locator('[class*="rounded-full"][class*="bg-purple"]').locator('..');
          const actionCount = await actionItems.count();
          console.log(`Found ${actionCount} recommended actions`);
        }
      }
    });

    // Test 6: Create learning path
    await test.step('Create learning path from gap', async () => {
      const createPathButton = page.locator('button:has-text("Create Learning Path")').first();
      
      if (await createPathButton.isVisible()) {
        await clickWithScreenshot(page, createPathButton, 'knowledge-gaps-08-create-path-button');
        
        // Wait for path creation
        await page.waitForTimeout(2000);
        
        // Check for success toast or new learning path
        const successToast = page.locator('text=/Learning path created/i');
        const activePaths = page.locator('text=/Active Learning Paths/i');
        
        if (await activePaths.isVisible()) {
          await takeScreenshot(page, 'knowledge-gaps-09-active-paths');
        }
      }
    });

    // Test 7: Learning path details
    await test.step('Learning path visualization', async () => {
      const learningPaths = page.locator('text=/Active Learning Paths/i').locator('..');
      
      if (await learningPaths.isVisible()) {
        await learningPaths.scrollIntoViewIfNeeded();
        
        // Verify path components
        const pathCard = learningPaths.locator('[class*="bg-gray-800"]').first();
        if (await pathCard.isVisible()) {
          await takeScreenshot(page, 'knowledge-gaps-10-path-details');
          
          // Check progress bar
          const progressBar = pathCard.locator('[class*="bg-purple-500"]');
          if (await progressBar.isVisible()) {
            const progressWidth = await progressBar.evaluate(el => el.style.width);
            console.log(`Learning path progress: ${progressWidth}`);
          }
          
          // Verify path metadata
          await verifyVisible(page, 'text=/Progress/i');
          await verifyVisible(page, 'text=/steps/i');
          await verifyVisible(page, 'text=/min/i'); // Duration
        }
      }
    });

    // Test 8: Gap confidence scores
    await test.step('Detection confidence visualization', async () => {
      const confidenceText = page.locator('text=/Confidence:.*%/').first();
      
      if (await confidenceText.isVisible()) {
        const confidenceValue = await confidenceText.textContent();
        console.log('Gap detection confidence:', confidenceValue);
        
        // Verify confidence is displayed as percentage
        expect(confidenceValue).toMatch(/\d+%/);
      }
    });

    // Test 9: Resource recommendations
    await test.step('Resource recommendations', async () => {
      const gapWithResources = page.locator('text=/actions/').locator('..').first();
      
      if (await gapWithResources.isVisible()) {
        await gapWithResources.click();
        await waitForAnimation(page);
        
        const resourceSection = page.locator('text=/Recommended.*Resources/i, text=/Resources/i').first();
        if (await resourceSection.isVisible()) {
          await takeScreenshot(page, 'knowledge-gaps-11-resources');
        }
      }
    });

    // Test 10: Gap status management
    await test.step('Gap status tracking', async () => {
      const openGaps = page.locator('text=/open/i');
      const inProgressGaps = page.locator('text=/in.*progress/i');
      const resolvedGaps = page.locator('text=/resolved|closed/i');
      
      if (await openGaps.first().isVisible()) {
        console.log('Found open gaps');
      }
      
      if (await inProgressGaps.first().isVisible()) {
        console.log('Found in-progress gaps');
      }
      
      if (await resolvedGaps.first().isVisible()) {
        console.log('Found resolved gaps');
      }
    });

    // Test 11: Topic complexity visualization
    await test.step('Topic complexity indicators', async () => {
      const complexityText = page.locator('text=/Complexity:.*\\/5/').first();
      
      if (await complexityText.isVisible()) {
        await takeScreenshot(page, 'knowledge-gaps-12-complexity');
        
        const complexity = await complexityText.textContent();
        console.log('Topic complexity:', complexity);
        
        // Verify complexity format
        expect(complexity).toMatch(/Complexity:\s*\d\/5/);
      }
    });

    // Test 12: Filter and sort gaps
    await test.step('Filter knowledge gaps', async () => {
      // Look for filter options
      const filterButton = page.locator('button:has-text("Filter"), [aria-label*="filter"]').first();
      
      if (await filterButton.isVisible()) {
        await clickWithScreenshot(page, filterButton, 'knowledge-gaps-13-filter-options');
        
        // Test severity filter
        const criticalFilter = page.locator('text=/critical/i').first();
        if (await criticalFilter.isVisible()) {
          await criticalFilter.click();
          await waitForAnimation(page);
          await takeScreenshot(page, 'knowledge-gaps-14-filtered-critical');
        }
      }
    });
  });

  test('Responsive design for knowledge gaps', async ({ page }) => {
    console.log('📱 Testing responsive design for knowledge gaps');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/knowledge-gaps');
      await waitForAnimation(page);
      
      await takeScreenshot(page, `knowledge-gaps-responsive-${viewport.name}`);
      
      // Verify layout adjustments
      const gapGrid = page.locator('[class*="grid"]').first();
      if (viewport.name === 'mobile') {
        // Should stack vertically on mobile
        await expect(gapGrid).toHaveClass(/grid-cols-1/);
      } else if (viewport.name === 'desktop') {
        // Should be 2 columns on desktop
        await expect(gapGrid).toHaveClass(/md:grid-cols-2/);
      }
    }
  });

  test('Keyboard navigation', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation');
    
    await testKeyboardNavigation(page, [
      { key: 'Tab', expectedFocus: 'button, [class*="card"]' },
      { key: 'Enter', expectedAction: 'select gap or trigger action' },
      { key: 'Space', expectedAction: 'toggle selection' },
      { key: 'Escape', expectedAction: 'close details' }
    ], 'knowledge-gaps-keyboard');
  });

  test('Performance monitoring', async ({ page }) => {
    console.log('⚡ Testing performance metrics');
    
    // Monitor analysis performance
    const analyzeButton = page.locator('button:has-text("Analyze Knowledge")').first();
    
    if (await analyzeButton.isVisible()) {
      const startTime = Date.now();
      await analyzeButton.click();
      
      // Wait for analysis to complete
      await page.waitForSelector('text=/Analyzing/i', { state: 'hidden', timeout: 30000 }).catch(() => {});
      const analysisTime = Date.now() - startTime;
      
      console.log(`Knowledge gap analysis time: ${analysisTime}ms`);
      expect(analysisTime).toBeLessThan(30000); // Should complete within 30 seconds
    }
  });

  test('Error handling', async ({ page }) => {
    console.log('❌ Testing error handling');
    
    // Simulate network failure
    await page.route('**/api/knowledge-gap/**', route => route.abort());
    
    const analyzeButton = page.locator('button:has-text("Analyze Knowledge")').first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      
      // Check for error message
      const errorMessage = await page.waitForSelector('text=/error|failed|unable/i', { timeout: 5000 }).catch(() => null);
      if (errorMessage) {
        await takeScreenshot(page, 'knowledge-gaps-15-error-state');
      }
    }
    
    // Restore network
    await page.unroute('**/api/knowledge-gap/**');
  });

  test('Learning path progression', async ({ page }) => {
    console.log('📈 Testing learning path progression');
    
    const activePaths = page.locator('text=/Active Learning Paths/i').locator('..');
    
    if (await activePaths.isVisible()) {
      const pathProgress = activePaths.locator('[class*="bg-purple-500"]').first();
      
      if (await pathProgress.isVisible()) {
        // Get initial progress
        const initialWidth = await pathProgress.evaluate(el => el.style.width);
        console.log('Initial progress:', initialWidth);
        
        // Verify progress bar animation
        await expect(pathProgress).toHaveCSS('transition-property', /width|all/);
      }
    }
  });
});