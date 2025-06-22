import { test, expect } from './fixtures/base-fixtures';
import { TEST_CONFIG, SELECTORS, BENCHMARKS, TEST_CREDENTIALS } from './config/test-config';
import { 
  takeScreenshot,
  clickWithScreenshot,
  fillFormWithScreenshots,
  waitForAnimation,
  verifyVisible,
  waitForNetworkIdle,
  safeClick,
  waitForElement,
  PerformanceMonitor,
  TestDataManager
} from './helpers/enhanced-test-helpers';

test.describe('Integration - Enhanced User Journey', () => {
  test.describe.configure({ retries: TEST_CONFIG.retries.test });
  
  // Track all created entities for cleanup
  const testData = {
    userId: '',
    documentIds: [] as string[],
    flashcardSetIds: [] as string[],
    workspaceId: '',
    reportId: ''
  };

  test('Complete end-to-end journey with comprehensive tracking', async ({ 
    page, // Not using authenticatedPage as we test registration
    testHelpers,
    performanceTracker,
    testCleanup 
  }) => {
    console.log('🚀 Starting enhanced integration test');
    
    const performanceMonitor = new PerformanceMonitor();
    
    // Journey Step 1: User Registration with validation
    await test.step('1. Register new user', async () => {
      await performanceTracker.trackNavigation('registration-page');
      await page.goto('/register');
      await waitForNetworkIdle(page);
      
      await takeScreenshot(page, 'integration-01-registration-page');
      
      // Generate unique test user
      const testUser = {
        name: 'Integration Test User',
        email: testCleanup.generateId('user') + '@example.com',
        password: TEST_CONFIG.testData.userPrefix + 'Pass123!'
      };
      
      // Track registration performance
      await performanceMonitor.measureAction(page, 'user-registration', async () => {
        await fillFormWithScreenshots(page, {
          '[data-testid="name-input"], input[name="name"]': testUser.name,
          '[data-testid="email-input"], input[name="email"]': testUser.email,
          '[data-testid="password-input"], input[name="password"]': testUser.password,
          '[data-testid="confirm-password-input"], input[name="confirmPassword"]': testUser.password
        }, 'integration-registration');
        
        await clickWithScreenshot(page, 
          SELECTORS.auth.submitButton, 
          'integration-02-register-submit'
        );
      });
      
      // Wait for redirect with proper timeout
      await page.waitForURL(/\/(dashboard|login)/, { timeout: TEST_CONFIG.timeouts.navigation });
      
      // Register user for cleanup
      testCleanup.registerUser(testUser.email);
      testData.userId = testUser.email;
      
      // Handle login if needed
      if (page.url().includes('login')) {
        await testHelpers.authenticateUser(testUser.email, testUser.password);
      }
      
      await takeScreenshot(page, 'integration-03-dashboard-first-visit');
      
      // Verify dashboard loaded correctly
      await testHelpers.expectNoConsoleErrors();
      performanceMonitor.assertPerformance('user-registration', BENCHMARKS.tti.needsImprovement);
    });

    // Journey Step 2: Upload Document with progress tracking
    await test.step('2. Upload document with validation', async () => {
      await performanceTracker.trackNavigation('upload-page');
      await page.goto('/dashboard/documents/upload');
      await waitForNetworkIdle(page);
      
      await takeScreenshot(page, 'integration-04-upload-page');
      
      // Check upload area
      const uploadArea = page.locator('[data-testid="upload-area"], .upload-dropzone').first();
      if (await waitForElement(page, uploadArea.toString())) {
        await takeScreenshot(page, 'integration-05-upload-ready');
        
        // Mock document upload
        await testHelpers.mockAPIResponse('documents/upload', {
          document: {
            id: testCleanup.generateId('doc'),
            title: 'Integration Test Document',
            content: 'Test content for integration testing',
            created_at: new Date().toISOString()
          }
        });
        
        // Simulate upload interaction
        await performanceMonitor.measureAction(page, 'document-upload', async () => {
          await uploadArea.click();
          await page.waitForTimeout(TEST_CONFIG.timeouts.animation);
        });
        
        // Register document for cleanup
        testCleanup.registerDocument(testData.documentIds[0]);
      }
      
      // Navigate to documents list
      await page.goto('/dashboard/documents');
      await waitForNetworkIdle(page);
      await takeScreenshot(page, 'integration-06-documents-list');
      
      // Verify document appears
      const docList = page.locator('[data-testid="document-list"]');
      await expect(docList).toBeVisible({ timeout: TEST_CONFIG.timeouts.element });
    });

    // Journey Step 3: Generate Flashcards with performance tracking
    await test.step('3. Generate flashcards from document', async () => {
      await performanceTracker.trackAPICall('flashcards/generate', async () => {
        await page.goto('/dashboard/flashcards');
        await waitForNetworkIdle(page);
        
        const generateButton = page.locator('[data-testid="generate-flashcards"], button:has-text("Generate")').first();
        if (await waitForElement(page, generateButton.toString())) {
          await clickWithScreenshot(page, generateButton, 'integration-07-generate-flashcards');
          
          // Mock flashcard generation
          const flashcardSetId = testCleanup.generateId('flashcard-set');
          await testHelpers.mockAPIResponse('flashcards/generate', {
            set: {
              id: flashcardSetId,
              title: 'Generated Flashcards',
              cards: [
                { front: 'Q1', back: 'A1' },
                { front: 'Q2', back: 'A2' }
              ]
            }
          });
          
          testData.flashcardSetIds.push(flashcardSetId);
          testCleanup.registerFlashcard(flashcardSetId);
          
          await page.waitForTimeout(TEST_CONFIG.timeouts.animation);
          await takeScreenshot(page, 'integration-08-flashcards-generated');
        }
      });
    });

    // Journey Step 4: Study Session with SM-2 tracking
    await test.step('4. Complete study session', async () => {
      await page.goto('/study');
      await waitForNetworkIdle(page);
      
      await takeScreenshot(page, 'integration-11-study-dashboard');
      
      const startStudyButton = page.locator('[data-testid="start-study-button"]').first();
      if (await waitForElement(page, startStudyButton.toString())) {
        await performanceMonitor.measureAction(page, 'study-session', async () => {
          await clickWithScreenshot(page, startStudyButton, 'integration-12-start-study');
          
          // Complete one flashcard
          const showAnswerButton = page.locator('[data-testid="show-answer-button"]').first();
          if (await waitForElement(page, showAnswerButton.toString())) {
            await showAnswerButton.click();
            await waitForAnimation(page);
            
            const goodButton = page.locator('[data-testid="rating-good"]').first();
            if (await goodButton.isVisible()) {
              await clickWithScreenshot(page, goodButton, 'integration-13-rate-card');
            }
          }
        });
      }
    });

    // Journey Step 5: Knowledge Gap Analysis
    await test.step('5. Analyze knowledge gaps', async () => {
      await performanceTracker.trackNavigation('knowledge-gaps');
      await page.goto('/dashboard/knowledge-gaps');
      await waitForNetworkIdle(page);
      
      const analyzeButton = page.locator('[data-testid="analyze-gaps"]').first();
      if (await waitForElement(page, analyzeButton.toString())) {
        await performanceMonitor.measureAction(page, 'gap-analysis', async () => {
          await clickWithScreenshot(page, analyzeButton, 'integration-16-analyze-gaps');
          
          // Wait for analysis with proper timeout
          await page.waitForSelector('[data-testid="gap-results"]', { 
            timeout: TEST_CONFIG.timeouts.network 
          }).catch(() => {});
          
          await takeScreenshot(page, 'integration-17-gaps-identified');
        });
      }
    });

    // Journey Step 6: Advanced Search
    await test.step('6. Search with filters', async () => {
      await page.goto('/dashboard/search');
      await waitForNetworkIdle(page);
      
      const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"]').first();
      await searchInput.fill('machine learning concepts');
      
      // Wait for debounce
      await page.waitForTimeout(TEST_CONFIG.timeouts.debounce);
      await takeScreenshot(page, 'integration-19-search-query');
      
      // Apply filters
      const filtersButton = page.locator('[data-testid="search-filters"]').first();
      if (await filtersButton.isVisible()) {
        await filtersButton.click();
        
        const pdfFilter = page.locator('[data-testid="filter-pdf"]').first();
        if (await pdfFilter.isVisible()) {
          await pdfFilter.click();
          await takeScreenshot(page, 'integration-20-filtered-search');
        }
      }
      
      // Track search performance
      const searchTime = await performanceMonitor.getAverageTime('search-execution');
      expect(searchTime).toBeLessThan(BENCHMARKS.api.needsImprovement);
    });

    // Journey Step 7: Analytics Review
    await test.step('7. Review analytics dashboard', async () => {
      await performanceTracker.trackNavigation('analytics');
      await page.goto('/dashboard/analytics');
      await waitForNetworkIdle(page);
      
      await takeScreenshot(page, 'integration-24-analytics-overview');
      
      // Change time range
      const timeRangeSelector = page.locator('[data-testid="time-range-selector"]').first();
      if (await timeRangeSelector.isVisible()) {
        await timeRangeSelector.click();
        
        const monthOption = page.locator('[data-testid="time-range-month"]').first();
        if (await monthOption.isVisible()) {
          await monthOption.click();
          await waitForAnimation(page);
          await takeScreenshot(page, 'integration-25-analytics-monthly');
        }
      }
      
      // Track chart rendering performance
      await performanceTracker.trackRenderPerformance('analytics-charts', async () => {
        await page.waitForSelector('canvas, svg', { timeout: TEST_CONFIG.timeouts.element });
      });
    });

    // Generate comprehensive performance report
    await test.step('Performance Analysis', async () => {
      const performanceReport = await performanceTracker.generateReport();
      console.log('=== Integration Test Performance Report ===\n', performanceReport);
      
      const monitorReport = performanceMonitor.generateReport();
      console.log('\n=== Action Performance Report ===\n', monitorReport);
      
      // Verify no critical performance issues
      performanceMonitor.assertPerformance('user-registration', 5000);
      performanceMonitor.assertPerformance('document-upload', 3000);
      performanceMonitor.assertPerformance('study-session', 2000);
      
      // Check memory usage
      await performanceTracker.trackMemoryUsage('integration-test-end');
    });
  });

  test('Cross-feature data consistency with cleanup', async ({ 
    authenticatedPage: page,
    testHelpers,
    testCleanup 
  }) => {
    console.log('🔄 Testing data consistency across features');
    
    // Create content in one feature
    await test.step('Create and verify content propagation', async () => {
      // Create note
      await page.goto('/dashboard/notes/new');
      const noteTitle = testCleanup.generateId('note') + ' Test Note';
      const noteContent = 'This is test content for cross-feature validation';
      
      const titleInput = page.locator('[data-testid="note-title"]').first();
      const contentArea = page.locator('[data-testid="note-content"]').first();
      
      if (await titleInput.isVisible() && await contentArea.isVisible()) {
        await titleInput.fill(noteTitle);
        await contentArea.fill(noteContent);
        
        const saveButton = page.locator('[data-testid="save-note"]').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await waitForNetworkIdle(page);
        }
        
        // Verify content appears in search
        await page.goto('/dashboard/search');
        const searchInput = page.locator('[data-testid="search-input"]').first();
        await searchInput.fill(noteTitle);
        await page.waitForTimeout(TEST_CONFIG.timeouts.debounce);
        
        const searchResult = page.locator(`[data-testid="search-result"]:has-text("${noteTitle}")`);
        await expect(searchResult).toBeVisible({ timeout: TEST_CONFIG.timeouts.element });
        
        await takeScreenshot(page, 'integration-28-cross-feature-search');
      }
    });
  });

  test('Error recovery and resilience', async ({ 
    authenticatedPage: page,
    testHelpers,
    performanceTracker 
  }) => {
    console.log('🔧 Testing error recovery mechanisms');
    
    await test.step('Network failure recovery', async () => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      // Try to access features
      await page.goto('/dashboard/analytics');
      
      // Check for error handling
      const errorMessage = page.locator('[data-testid="error-message"], text=/error|retry|offline/i').first();
      const retryButton = page.locator('[data-testid="retry-button"]').first();
      
      if (await errorMessage.isVisible()) {
        await takeScreenshot(page, 'integration-30-error-handling');
        
        // Restore network
        await page.unroute('**/api/**');
        
        // Test retry mechanism
        if (await retryButton.isVisible()) {
          await retryButton.click();
          await waitForNetworkIdle(page);
          
          // Should recover and show content
          await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible({ 
            timeout: TEST_CONFIG.timeouts.network 
          });
        }
      }
    });
  });

  test.afterEach(async ({ testCleanup }) => {
    // Cleanup summary
    const summary = TestDataManager.getSummary();
    console.log('Test data cleanup summary:', summary);
    
    // Cleanup will happen automatically through fixture
  });
});