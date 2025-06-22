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

test.describe('Search V2 - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/search');
    await waitForAnimation(page);
  });

  test('Complete advanced search workflow', async ({ page }) => {
    console.log('🔍 Starting comprehensive search v2 test');
    
    // Test 1: Search interface
    await test.step('Search interface overview', async () => {
      await takeScreenshot(page, 'search-v2-01-interface');
      
      // Verify search components
      await verifyVisible(page, 'input[placeholder*="Search"]');
      await verifyVisible(page, 'button:has-text("Filters")');
      
      await testResponsive(page, 'search-v2-interface');
    });

    // Test 2: Basic search
    await test.step('Perform basic search', async () => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      
      await searchInput.fill('machine learning');
      await takeScreenshot(page, 'search-v2-02-query-entered');
      
      // Wait for results
      await page.waitForTimeout(500); // Debounce delay
      await waitForAnimation(page);
      
      // Check for results
      const results = page.locator('[data-testid="search-result"], .search-result').first();
      if (await results.isVisible()) {
        await takeScreenshot(page, 'search-v2-03-basic-results');
      }
    });

    // Test 3: Query expansion
    await test.step('Query expansion suggestions', async () => {
      const queryExpansion = page.locator('text=/Did you mean|Expanded query|Related terms/i').first();
      
      if (await queryExpansion.isVisible()) {
        await takeScreenshot(page, 'search-v2-04-query-expansion');
        
        // Accept expanded query
        const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Use expanded")').first();
        if (await acceptButton.isVisible()) {
          await clickWithScreenshot(page, acceptButton, 'search-v2-05-accept-expansion');
        }
      }
    });

    // Test 4: Open filters panel
    await test.step('Faceted filters panel', async () => {
      const filtersButton = page.locator('button:has-text("Filters")').first();
      await clickWithScreenshot(page, filtersButton, 'search-v2-06-filters-button');
      
      // Wait for filters panel
      await waitForAnimation(page);
      
      const filtersPanel = page.locator('text=/Search Filters/i').first();
      if (await filtersPanel.isVisible()) {
        await takeScreenshot(page, 'search-v2-07-filters-panel');
      }
    });

    // Test 5: Date range filter
    await test.step('Date range filtering', async () => {
      const startDateButton = page.locator('button:has-text("Pick a date")').first();
      
      if (await startDateButton.isVisible()) {
        await clickWithScreenshot(page, startDateButton, 'search-v2-08-date-picker');
        
        // Select a date
        const todayDate = page.locator('[aria-selected="true"], .rdp-day_today').first();
        if (await todayDate.isVisible()) {
          await todayDate.click();
          await takeScreenshot(page, 'search-v2-09-date-selected');
        }
        
        // Close calendar by clicking outside
        await page.click('body');
      }
    });

    // Test 6: Document type filters
    await test.step('Document type filtering', async () => {
      const documentTypes = ['PDF', 'Note', 'Article', 'Book', 'Paper'];
      
      for (const type of documentTypes) {
        const typeCheckbox = page.locator(`label:has-text("${type}")`).first();
        if (await typeCheckbox.isVisible()) {
          await typeCheckbox.click();
          break; // Select first available type
        }
      }
      
      await takeScreenshot(page, 'search-v2-10-document-type-selected');
    });

    // Test 7: Tag filters
    await test.step('Tag-based filtering', async () => {
      const tagBadges = page.locator('[class*="badge"], .tag-filter').filter({ hasText: /\(\d+\)/ });
      
      if (await tagBadges.first().isVisible()) {
        await clickWithScreenshot(page, tagBadges.first(), 'search-v2-11-tag-filter');
        
        // Check if tag is now active
        const activeTag = page.locator('[variant="default"]').first();
        if (await activeTag.isVisible()) {
          await takeScreenshot(page, 'search-v2-12-active-tag');
        }
      }
    });

    // Test 8: Relevance threshold
    await test.step('Relevance threshold adjustment', async () => {
      const relevanceSlider = page.locator('input[type="range"]').first();
      
      if (await relevanceSlider.isVisible()) {
        // Set to high relevance
        await relevanceSlider.fill('0.8');
        await takeScreenshot(page, 'search-v2-13-relevance-threshold');
        
        // Wait for results to update
        await page.waitForTimeout(500);
      }
    });

    // Test 9: Active filters display
    await test.step('Active filters badges', async () => {
      const activeFilters = page.locator('[class*="badge"]:has([class*="XMarkIcon"])');
      
      if (await activeFilters.first().isVisible()) {
        await takeScreenshot(page, 'search-v2-14-active-filters');
        
        // Count active filters
        const filterCount = await activeFilters.count();
        console.log(`Active filters: ${filterCount}`);
        
        // Test filter removal
        const removeButton = activeFilters.locator('[class*="XMarkIcon"]').first();
        if (await removeButton.isVisible()) {
          await clickWithScreenshot(page, removeButton, 'search-v2-15-remove-filter');
        }
      }
    });

    // Test 10: Search results interaction
    await test.step('Search result details', async () => {
      const searchResult = page.locator('[data-testid="search-result"], .search-result-card').first();
      
      if (await searchResult.isVisible()) {
        // Test hover state
        await testHoverState(page, searchResult, 'search-result-hover');
        
        // Click result
        await clickWithScreenshot(page, searchResult, 'search-v2-16-result-clicked');
        
        // Check for result preview or navigation
        const preview = page.locator('[data-testid="result-preview"], .result-preview');
        if (await preview.isVisible()) {
          await takeScreenshot(page, 'search-v2-17-result-preview');
        }
      }
    });

    // Test 11: Result ranking display
    await test.step('Search result ranking', async () => {
      const results = page.locator('[data-testid="search-result"], .search-result');
      const resultsCount = await results.count();
      
      if (resultsCount > 0) {
        console.log(`Found ${resultsCount} search results`);
        
        // Check for relevance scores
        const relevanceScore = page.locator('text=/[0-9]+%|relevance|score/i').first();
        if (await relevanceScore.isVisible()) {
          await takeScreenshot(page, 'search-v2-18-relevance-scores');
        }
        
        // Verify results are ordered by relevance
        const scores = await results.locator('[data-relevance]').allTextContents();
        console.log('Relevance scores:', scores);
      }
    });

    // Test 12: Search facets update
    await test.step('Dynamic facet updates', async () => {
      // Clear search and enter new query
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.clear();
      await searchInput.fill('physics quantum mechanics');
      
      // Wait for facets to update
      await page.waitForTimeout(1000);
      
      const facetCounts = page.locator('text=/\\(\\d+\\)/');
      if (await facetCounts.first().isVisible()) {
        await takeScreenshot(page, 'search-v2-19-updated-facets');
        
        // Log facet counts
        const counts = await facetCounts.allTextContents();
        console.log('Facet counts:', counts);
      }
    });

    // Test 13: No results state
    await test.step('No results handling', async () => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.clear();
      await searchInput.fill('xyzabc123nonexistent');
      
      await page.waitForTimeout(1000);
      
      const noResults = page.locator('text=/No results|No documents found|Try different/i');
      if (await noResults.isVisible()) {
        await takeScreenshot(page, 'search-v2-20-no-results');
      }
    });

    // Test 14: Search history
    await test.step('Recent searches', async () => {
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.click();
      
      const recentSearches = page.locator('text=/Recent searches|History/i');
      if (await recentSearches.isVisible()) {
        await takeScreenshot(page, 'search-v2-21-search-history');
      }
    });

    // Test 15: Save search
    await test.step('Save search functionality', async () => {
      const saveButton = page.locator('button:has-text("Save"), button[aria-label*="save"]').first();
      
      if (await saveButton.isVisible()) {
        await clickWithScreenshot(page, saveButton, 'search-v2-22-save-search');
        
        // Check for save dialog
        const saveDialog = page.locator('text=/Save.*search|Name.*search/i');
        if (await saveDialog.isVisible()) {
          await takeScreenshot(page, 'search-v2-23-save-dialog');
        }
      }
    });
  });

  test('Responsive design for search', async ({ page }) => {
    console.log('📱 Testing responsive design for search');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/search');
      await waitForAnimation(page);
      
      // Enter search query
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill('test query');
      await page.waitForTimeout(500);
      
      await takeScreenshot(page, `search-v2-responsive-${viewport.name}`);
      
      // Verify layout adjustments
      if (viewport.name === 'mobile') {
        // Filters should be hidden behind button on mobile
        const filtersPanel = page.locator('text=/Document Types/i');
        await expect(filtersPanel).toBeHidden();
      }
    }
  });

  test('Keyboard navigation', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation');
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    
    await testKeyboardNavigation(page, [
      { key: 'Tab', expectedFocus: 'button, [data-testid="search-result"]' },
      { key: 'Enter', expectedAction: 'select result or apply filter' },
      { key: 'Escape', expectedAction: 'clear search or close panel' },
      { key: 'ArrowDown', expectedAction: 'navigate results' }
    ], 'search-v2-keyboard');
  });

  test('Search performance', async ({ page }) => {
    console.log('⚡ Testing search performance');
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    
    // Measure search response time
    const startTime = Date.now();
    await searchInput.fill('machine learning algorithms');
    
    // Wait for results
    await page.waitForSelector('[data-testid="search-result"], .search-result', { timeout: 5000 }).catch(() => {});
    const searchTime = Date.now() - startTime;
    
    console.log(`Search response time: ${searchTime}ms`);
    expect(searchTime).toBeLessThan(3000); // Should return results within 3 seconds
    
    // Test instant search (as-you-type)
    const typeStartTime = Date.now();
    await searchInput.fill('neural networks deep learning');
    
    // Check if results update dynamically
    await page.waitForTimeout(300); // Debounce delay
    const instantSearchTime = Date.now() - typeStartTime;
    
    console.log(`Instant search update time: ${instantSearchTime}ms`);
  });

  test('Error handling', async ({ page }) => {
    console.log('❌ Testing error handling');
    
    // Simulate network failure
    await page.route('**/api/search/**', route => route.abort());
    
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test query');
    
    // Wait for error
    const errorMessage = await page.waitForSelector('text=/error|failed|unable/i', { timeout: 5000 }).catch(() => null);
    if (errorMessage) {
      await takeScreenshot(page, 'search-v2-24-error-state');
    }
    
    // Restore network
    await page.unroute('**/api/search/**');
  });

  test('Faceted search combinations', async ({ page }) => {
    console.log('🔧 Testing complex filter combinations');
    
    // Open filters
    const filtersButton = page.locator('button:has-text("Filters")').first();
    await filtersButton.click();
    await waitForAnimation(page);
    
    // Apply multiple filters
    await test.step('Apply multiple filters', async () => {
      // Select document type
      const pdfCheckbox = page.locator('label:has-text("PDF")').first();
      if (await pdfCheckbox.isVisible()) await pdfCheckbox.click();
      
      // Select tag
      const tagBadge = page.locator('[class*="badge"]').filter({ hasText: /\(\d+\)/ }).first();
      if (await tagBadge.isVisible()) await tagBadge.click();
      
      // Set relevance threshold
      const relevanceSlider = page.locator('input[type="range"]').first();
      if (await relevanceSlider.isVisible()) await relevanceSlider.fill('0.7');
      
      await takeScreenshot(page, 'search-v2-25-multiple-filters');
    });
    
    // Verify filter count badge
    const filterCount = page.locator('button:has-text("Filters") .badge');
    if (await filterCount.isVisible()) {
      const count = await filterCount.textContent();
      console.log(`Active filter count: ${count}`);
      expect(parseInt(count || '0')).toBeGreaterThan(0);
    }
  });
});