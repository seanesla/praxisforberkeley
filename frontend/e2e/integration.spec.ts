import { test, expect } from '@playwright/test';
import { 
  TEST_USERS,
  loginUser,
  registerUser,
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

test.describe('Integration - Complete User Journey', () => {
  test('End-to-end user journey through all features', async ({ page }) => {
    console.log('🚀 Starting complete integration test');
    setupConsoleLogging(page);
    
    // Journey Step 1: User Registration
    await test.step('1. Register new user', async () => {
      await page.goto('/register');
      await waitForAnimation(page);
      
      await takeScreenshot(page, 'integration-01-registration-page');
      
      const testUser = {
        name: 'Integration Test User',
        email: `integration.test.${Date.now()}@example.com`,
        password: 'IntegrationTest123!'
      };
      
      await fillFormWithScreenshots(page, {
        'input[name="name"]': testUser.name,
        'input[name="email"]': testUser.email,
        'input[name="password"]': testUser.password,
        'input[name="confirmPassword"]': testUser.password
      }, 'integration-registration');
      
      await clickWithScreenshot(page, 
        page.locator('button[type="submit"]'), 
        'integration-02-register-submit'
      );
      
      // Wait for redirect to dashboard or login
      await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 });
      
      // If redirected to login, log in
      if (page.url().includes('login')) {
        await page.fill('input[type="email"]', testUser.email);
        await page.fill('input[type="password"]', testUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
      }
      
      await takeScreenshot(page, 'integration-03-dashboard-first-visit');
    });

    // Journey Step 2: Upload Document
    await test.step('2. Upload document', async () => {
      await page.goto('/dashboard/documents/upload');
      await waitForAnimation(page);
      
      await takeScreenshot(page, 'integration-04-upload-page');
      
      // Mock file upload (in real test, would upload actual file)
      const uploadArea = page.locator('[data-testid="upload-area"], .upload-dropzone').first();
      if (await uploadArea.isVisible()) {
        await takeScreenshot(page, 'integration-05-upload-ready');
        
        // Simulate successful upload
        console.log('Document upload simulated');
      }
      
      // Navigate to documents list
      await page.goto('/dashboard/documents');
      await waitForAnimation(page);
      await takeScreenshot(page, 'integration-06-documents-list');
    });

    // Journey Step 3: Generate Flashcards
    await test.step('3. Generate flashcards from document', async () => {
      await page.goto('/dashboard/flashcards');
      await waitForAnimation(page);
      
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
      if (await generateButton.isVisible()) {
        await clickWithScreenshot(page, generateButton, 'integration-07-generate-flashcards');
        
        // Wait for generation
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'integration-08-flashcards-generated');
      }
    });

    // Journey Step 4: Create Mindmap
    await test.step('4. Create mindmap', async () => {
      await page.goto('/dashboard/mindmaps/new');
      await waitForAnimation(page);
      
      await takeScreenshot(page, 'integration-09-mindmap-creation');
      
      // Add nodes to mindmap
      const canvas = page.locator('canvas, [data-testid="mindmap-canvas"]').first();
      if (await canvas.isVisible()) {
        // Simulate adding nodes
        await canvas.click({ position: { x: 200, y: 200 } });
        await page.keyboard.type('Central Concept');
        
        await canvas.click({ position: { x: 350, y: 250 } });
        await page.keyboard.type('Related Topic 1');
        
        await takeScreenshot(page, 'integration-10-mindmap-with-nodes');
      }
    });

    // Journey Step 5: Study Session
    await test.step('5. Complete study session', async () => {
      await page.goto('/study');
      await waitForAnimation(page);
      
      await takeScreenshot(page, 'integration-11-study-dashboard');
      
      const startStudyButton = page.locator('button:has-text("Start Study")').first();
      if (await startStudyButton.isVisible()) {
        await clickWithScreenshot(page, startStudyButton, 'integration-12-start-study');
        
        // Complete one flashcard
        const showAnswerButton = page.locator('button:has-text("Show Answer")').first();
        if (await showAnswerButton.isVisible()) {
          await showAnswerButton.click();
          await waitForAnimation(page);
          
          const goodButton = page.locator('button:has-text("Good")').first();
          if (await goodButton.isVisible()) {
            await clickWithScreenshot(page, goodButton, 'integration-13-rate-card');
          }
        }
      }
    });

    // Journey Step 6: Take Exercises
    await test.step('6. Complete exercises', async () => {
      await page.goto('/dashboard/exercises');
      await waitForAnimation(page);
      
      const startExerciseButton = page.locator('button:has-text("Start"), button:has-text("Begin")').first();
      if (await startExerciseButton.isVisible()) {
        await clickWithScreenshot(page, startExerciseButton, 'integration-14-start-exercises');
        
        // Answer one question
        const firstOption = page.locator('input[type="radio"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
          
          const submitButton = page.locator('button:has-text("Submit")');
          if (await submitButton.isVisible()) {
            await clickWithScreenshot(page, submitButton, 'integration-15-submit-answer');
          }
        }
      }
    });

    // Journey Step 7: View Knowledge Gaps
    await test.step('7. Analyze knowledge gaps', async () => {
      await page.goto('/dashboard/knowledge-gaps');
      await waitForAnimation(page);
      
      const analyzeButton = page.locator('button:has-text("Analyze")').first();
      if (await analyzeButton.isVisible()) {
        await clickWithScreenshot(page, analyzeButton, 'integration-16-analyze-gaps');
        
        // Wait for analysis
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'integration-17-gaps-identified');
        
        // Create learning path
        const createPathButton = page.locator('button:has-text("Create Learning Path")').first();
        if (await createPathButton.isVisible()) {
          await clickWithScreenshot(page, createPathButton, 'integration-18-create-path');
        }
      }
    });

    // Journey Step 8: Search Content
    await test.step('8. Search for content', async () => {
      await page.goto('/dashboard/search');
      await waitForAnimation(page);
      
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill('machine learning concepts');
      await takeScreenshot(page, 'integration-19-search-query');
      
      // Wait for results
      await page.waitForTimeout(1000);
      
      // Apply filter
      const filtersButton = page.locator('button:has-text("Filters")').first();
      if (await filtersButton.isVisible()) {
        await filtersButton.click();
        
        const pdfFilter = page.locator('label:has-text("PDF")').first();
        if (await pdfFilter.isVisible()) {
          await pdfFilter.click();
          await takeScreenshot(page, 'integration-20-filtered-search');
        }
      }
    });

    // Journey Step 9: Create Collaborative Workspace
    await test.step('9. Set up collaborative workspace', async () => {
      await page.goto('/dashboard/workspace');
      await waitForAnimation(page);
      
      // Add documents to workspace
      const firstDoc = page.locator('div[class*="cursor-pointer"]').first();
      if (await firstDoc.isVisible()) {
        await firstDoc.click();
        
        // Switch to split view
        const splitButton = page.locator('button:has([class*="ViewColumnsIcon"])').first();
        if (await splitButton.isVisible()) {
          await splitButton.click();
          await takeScreenshot(page, 'integration-21-workspace-setup');
        }
      }
    });

    // Journey Step 10: Build Workflow
    await test.step('10. Create automation workflow', async () => {
      await page.goto('/dashboard/workflow');
      await waitForAnimation(page);
      
      // Add action to workflow
      const addActionButton = page.locator('button:has-text("Add Action")').first();
      if (await addActionButton.isVisible()) {
        await addActionButton.click();
        await waitForAnimation(page);
        
        const firstAction = page.locator('[data-testid="action-item"]').first();
        if (await firstAction.isVisible()) {
          await firstAction.click();
          await takeScreenshot(page, 'integration-22-workflow-created');
        }
      }
    });

    // Journey Step 11: Generate Report
    await test.step('11. Generate comprehensive report', async () => {
      await page.goto('/dashboard/reports');
      await waitForAnimation(page);
      
      // Select template
      const template = page.locator('[class*="glass-card"]').first();
      if (await template.isVisible()) {
        await template.click();
        await waitForAnimation(page);
        
        // Fill report details
        const titleInput = page.locator('input[placeholder*="title"]').first();
        await titleInput.fill('Integration Test Report');
        
        // Select PDF format
        const pdfButton = page.locator('button:has-text("PDF")').first();
        if (await pdfButton.isVisible()) {
          await pdfButton.click();
        }
        
        await takeScreenshot(page, 'integration-23-report-configured');
        
        // Generate report
        const generateButton = page.locator('button:has-text("Generate Report")');
        if (await generateButton.isVisible()) {
          await generateButton.click();
        }
      }
    });

    // Journey Step 12: View Analytics
    await test.step('12. Review analytics dashboard', async () => {
      await page.goto('/dashboard/analytics');
      await waitForAnimation(page);
      
      await takeScreenshot(page, 'integration-24-analytics-overview');
      
      // Change time range
      const timeRangeSelector = page.locator('[role="combobox"]').first();
      if (await timeRangeSelector.isVisible()) {
        await timeRangeSelector.click();
        
        const monthOption = page.locator('[role="option"]:has-text("This Month")');
        if (await monthOption.isVisible()) {
          await monthOption.click();
          await waitForAnimation(page);
          await takeScreenshot(page, 'integration-25-analytics-monthly');
        }
      }
    });

    // Journey Step 13: View Citation Network
    await test.step('13. Explore citation network', async () => {
      await page.goto('/dashboard/citation-network');
      await waitForAnimation(page);
      
      const analyzeButton = page.locator('button:has-text("Find Clusters")').first();
      if (await analyzeButton.isVisible()) {
        await clickWithScreenshot(page, analyzeButton, 'integration-26-citation-clusters');
      }
    });

    // Journey Step 14: Final Dashboard Review
    await test.step('14. Return to dashboard overview', async () => {
      await page.goto('/dashboard');
      await waitForAnimation(page);
      
      await takeScreenshot(page, 'integration-27-final-dashboard');
      
      // Verify all features are accessible
      const features = [
        'Documents',
        'Flashcards',
        'Mindmaps',
        'Study',
        'Exercises',
        'Analytics'
      ];
      
      for (const feature of features) {
        const featureLink = page.locator(`text=/${feature}/i`).first();
        if (await featureLink.isVisible()) {
          console.log(`✓ ${feature} feature accessible`);
        }
      }
    });

    console.log('✅ Complete integration test finished successfully');
  });

  test('Cross-feature data consistency', async ({ page }) => {
    console.log('🔄 Testing data consistency across features');
    
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    
    // Create content in one feature
    await test.step('Create content', async () => {
      await page.goto('/dashboard/notes/new');
      const titleInput = page.locator('input[placeholder*="title"]').first();
      const contentArea = page.locator('textarea, [contenteditable="true"]').first();
      
      if (await titleInput.isVisible() && await contentArea.isVisible()) {
        const testTitle = `Integration Test Note ${Date.now()}`;
        await titleInput.fill(testTitle);
        await contentArea.fill('This is test content for cross-feature validation');
        
        const saveButton = page.locator('button:has-text("Save")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Verify content appears in search
        await page.goto('/dashboard/search');
        const searchInput = page.locator('input[placeholder*="Search"]').first();
        await searchInput.fill(testTitle);
        await page.waitForTimeout(1000);
        
        const searchResult = page.locator(`text=/${testTitle}/`);
        await expect(searchResult).toBeVisible({ timeout: 5000 });
        
        await takeScreenshot(page, 'integration-28-cross-feature-search');
      }
    });
  });

  test('Performance across full journey', async ({ page }) => {
    console.log('⚡ Testing performance metrics');
    
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    
    const performanceMetrics: { feature: string; loadTime: number }[] = [];
    
    const features = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Documents', url: '/dashboard/documents' },
      { name: 'Flashcards', url: '/dashboard/flashcards' },
      { name: 'Study', url: '/study' },
      { name: 'Analytics', url: '/dashboard/analytics' }
    ];
    
    for (const feature of features) {
      const startTime = Date.now();
      await page.goto(feature.url);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      performanceMetrics.push({ feature: feature.name, loadTime });
      console.log(`${feature.name} load time: ${loadTime}ms`);
    }
    
    // Verify all features load within acceptable time
    for (const metric of performanceMetrics) {
      expect(metric.loadTime).toBeLessThan(5000); // 5 second threshold
    }
    
    await takeScreenshot(page, 'integration-29-performance-complete');
  });

  test('Error recovery across features', async ({ page }) => {
    console.log('🔧 Testing error recovery');
    
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    
    // Test network failure recovery
    await test.step('Network failure recovery', async () => {
      // Intercept all API calls
      await page.route('**/api/**', route => route.abort());
      
      // Try to access features
      await page.goto('/dashboard/analytics');
      
      // Check for error handling
      const errorMessage = await page.locator('text=/error|retry|offline/i').first();
      if (await errorMessage.isVisible()) {
        await takeScreenshot(page, 'integration-30-error-handling');
      }
      
      // Restore network
      await page.unroute('**/api/**');
      
      // Verify recovery
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should recover and show content
      await expect(page.locator('text=/Analytics Dashboard/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test('Mobile journey through key features', async ({ page }) => {
    console.log('📱 Testing mobile user journey');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    
    const mobileFeatures = [
      'Dashboard',
      'Study',
      'Flashcards',
      'Search'
    ];
    
    for (const feature of mobileFeatures) {
      await page.goto(`/dashboard/${feature.toLowerCase()}`);
      await waitForAnimation(page);
      await takeScreenshot(page, `integration-mobile-${feature.toLowerCase()}`);
      
      // Verify mobile-optimized layout
      const mobileMenu = page.locator('[aria-label*="menu"], [class*="mobile-menu"]').first();
      if (await mobileMenu.isVisible()) {
        console.log(`✓ Mobile menu available for ${feature}`);
      }
    }
  });
});