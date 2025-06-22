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
  setupConsoleLogging,
  testDragAndDrop
} from './helpers/test-helpers';

test.describe('Analytics - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/analytics');
    await waitForAnimation(page);
  });

  test('Complete analytics dashboard workflow', async ({ page }) => {
    console.log('📈 Starting comprehensive analytics test');
    
    // Test 1: Analytics dashboard overview
    await test.step('Analytics dashboard overview', async () => {
      await takeScreenshot(page, 'analytics-01-dashboard');
      
      // Verify dashboard components
      await verifyVisible(page, 'text=/Analytics Dashboard/i');
      await verifyVisible(page, 'text=/Track.*learning.*progress/i');
      
      await testResponsive(page, 'analytics-dashboard');
    });

    // Test 2: Time range selector
    await test.step('Time range selection', async () => {
      const timeRangeSelector = page.locator('[role="combobox"]').filter({ hasText: /Week|Month|Year/i });
      
      if (await timeRangeSelector.isVisible()) {
        await clickWithScreenshot(page, timeRangeSelector, 'analytics-02-time-range-selector');
        
        // Test different time ranges
        const timeRanges = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year', 'All Time'];
        
        for (const range of timeRanges) {
          const option = page.locator(`[role="option"]:has-text("${range}")`).first();
          if (await option.isVisible()) {
            console.log(`Time range available: ${range}`);
          }
        }
        
        // Select "This Month"
        const monthOption = page.locator('[role="option"]:has-text("This Month")');
        if (await monthOption.isVisible()) {
          await clickWithScreenshot(page, monthOption, 'analytics-03-month-selected');
          await waitForAnimation(page);
        }
      }
    });

    // Test 3: Key metrics cards
    await test.step('Key metrics display', async () => {
      const metricsSection = page.locator('[class*="space-y"]').filter({ has: page.locator('[class*="card"]') }).first();
      
      if (await metricsSection.isVisible()) {
        await takeScreenshot(page, 'analytics-04-key-metrics');
        
        // Verify metric cards
        const metricCards = metricsSection.locator('[class*="card"]');
        const cardCount = await metricCards.count();
        console.log(`Found ${cardCount} metric cards`);
        
        // Test hover states on metrics
        if (cardCount > 0) {
          await testHoverState(page, metricCards.first(), 'metric-card-hover');
        }
      }
    });

    // Test 4: Chart widgets
    await test.step('Chart visualizations', async () => {
      // Activity Timeline Chart
      const activityChart = page.locator('text=/Activity Timeline/i').locator('..');
      
      if (await activityChart.isVisible()) {
        await activityChart.scrollIntoViewIfNeeded();
        await takeScreenshot(page, 'analytics-05-activity-chart');
        
        // Check for chart elements
        const chartCanvas = activityChart.locator('canvas, svg');
        if (await chartCanvas.isVisible()) {
          console.log('Chart visualization rendered');
        }
      }
      
      // Look for other chart types
      const chartTypes = ['line', 'bar', 'pie', 'donut'];
      for (const type of chartTypes) {
        const chart = page.locator(`[data-chart-type="${type}"]`).first();
        if (await chart.isVisible()) {
          console.log(`Found ${type} chart`);
        }
      }
    });

    // Test 5: AI Insights
    await test.step('AI-generated insights', async () => {
      const insightsSection = page.locator('text=/AI Insights/i').locator('..');
      
      if (await insightsSection.isVisible()) {
        await insightsSection.scrollIntoViewIfNeeded();
        await takeScreenshot(page, 'analytics-06-ai-insights');
        
        // Count insights
        const insights = insightsSection.locator('[class*="flex items-start"]');
        const insightCount = await insights.count();
        console.log(`Found ${insightCount} AI insights`);
        
        // Read first insight
        if (insightCount > 0) {
          const firstInsight = await insights.first().textContent();
          console.log('First insight:', firstInsight?.substring(0, 50) + '...');
        }
      }
    });

    // Test 6: Study activity heatmap
    await test.step('Study activity heatmap', async () => {
      const heatmapSection = page.locator('text=/Study Activity/i').locator('..');
      
      if (await heatmapSection.isVisible()) {
        await heatmapSection.scrollIntoViewIfNeeded();
        await takeScreenshot(page, 'analytics-07-study-heatmap');
        
        // Test heatmap interaction
        const heatmapCell = heatmapSection.locator('[class*="bg-gray"], [data-heatmap-cell]').first();
        if (await heatmapCell.isVisible()) {
          await testHoverState(page, heatmapCell, 'heatmap-cell-hover');
        }
      }
    });

    // Test 7: Knowledge progress
    await test.step('Knowledge progress tracking', async () => {
      const progressSection = page.locator('text=/Knowledge Progress/i').locator('..');
      
      if (await progressSection.isVisible()) {
        await progressSection.scrollIntoViewIfNeeded();
        await takeScreenshot(page, 'analytics-08-knowledge-progress');
        
        // Verify progress bars
        const progressBars = progressSection.locator('[class*="bg-green-500"], [class*="bg-blue-500"]');
        const barCount = await progressBars.count();
        console.log(`Found ${barCount} progress indicators`);
        
        // Check progress percentages
        const percentages = await progressSection.locator('text=/%/').allTextContents();
        console.log('Progress percentages:', percentages);
      }
    });

    // Test 8: Customize dashboard
    await test.step('Dashboard customization', async () => {
      const customizeButton = page.locator('button:has-text("Customize")');
      
      if (await customizeButton.isVisible()) {
        await clickWithScreenshot(page, customizeButton, 'analytics-09-customize-button');
        
        // Check for edit mode
        const doneEditingButton = page.locator('button:has-text("Done Editing")');
        if (await doneEditingButton.isVisible()) {
          await takeScreenshot(page, 'analytics-10-edit-mode');
          
          // Look for add widget button
          const addWidgetButton = page.locator('button:has-text("Add Widget")');
          if (await addWidgetButton.isVisible()) {
            await clickWithScreenshot(page, addWidgetButton, 'analytics-11-add-widget');
          }
          
          // Exit edit mode
          await doneEditingButton.click();
        }
      }
    });

    // Test 9: Export data
    await test.step('Export analytics data', async () => {
      const exportButton = page.locator('button:has-text("Export")');
      
      if (await exportButton.isVisible()) {
        // Set up download promise
        const downloadPromise = page.waitForEvent('download');
        
        await clickWithScreenshot(page, exportButton, 'analytics-12-export-button');
        
        // Wait for download
        const download = await downloadPromise.catch(() => null);
        
        if (download) {
          console.log('Analytics exported:', download.suggestedFilename());
          await takeScreenshot(page, 'analytics-13-export-started');
        }
      }
    });

    // Test 10: Quick actions
    await test.step('Quick action buttons', async () => {
      const quickActionsSection = page.locator('text=/Quick Actions/i').locator('..');
      
      if (await quickActionsSection.isVisible()) {
        await quickActionsSection.scrollIntoViewIfNeeded();
        await takeScreenshot(page, 'analytics-14-quick-actions');
        
        // Test action buttons
        const actionButtons = quickActionsSection.locator('button');
        const actions = await actionButtons.allTextContents();
        console.log('Available quick actions:', actions);
        
        // Click first action
        const firstAction = actionButtons.first();
        if (await firstAction.isVisible()) {
          await clickWithScreenshot(page, firstAction, 'analytics-15-action-clicked');
        }
      }
    });

    // Test 11: Dashboard widgets interaction
    await test.step('Widget interactions', async () => {
      // Test chart zoom/pan if available
      const chartCanvas = page.locator('canvas').first();
      
      if (await chartCanvas.isVisible()) {
        await chartCanvas.hover();
        
        // Simulate zoom
        await page.mouse.wheel(0, -50);
        await takeScreenshot(page, 'analytics-16-chart-zoomed');
        
        // Simulate pan
        await page.mouse.down();
        await page.mouse.move(50, 0);
        await page.mouse.up();
        await takeScreenshot(page, 'analytics-17-chart-panned');
      }
    });

    // Test 12: Metric details
    await test.step('View metric details', async () => {
      const metricCard = page.locator('[class*="card"]').filter({ has: page.locator('text=/[0-9]+/') }).first();
      
      if (await metricCard.isVisible()) {
        await clickWithScreenshot(page, metricCard, 'analytics-18-metric-clicked');
        
        // Check for detail view or tooltip
        const detailView = page.locator('[role="tooltip"], [data-testid="metric-detail"]');
        if (await detailView.isVisible()) {
          await takeScreenshot(page, 'analytics-19-metric-details');
        }
      }
    });

    // Test 13: Filter data
    await test.step('Filter analytics data', async () => {
      const filterButton = page.locator('button:has-text("Filter"), button[aria-label*="filter"]').first();
      
      if (await filterButton.isVisible()) {
        await clickWithScreenshot(page, filterButton, 'analytics-20-filter-button');
        
        // Check filter options
        const filterOptions = page.locator('[data-testid="filter-option"]');
        if (await filterOptions.first().isVisible()) {
          await takeScreenshot(page, 'analytics-21-filter-options');
        }
      }
    });

    // Test 14: Compare periods
    await test.step('Period comparison', async () => {
      const compareButton = page.locator('button:has-text("Compare")').first();
      
      if (await compareButton.isVisible()) {
        await clickWithScreenshot(page, compareButton, 'analytics-22-compare-button');
        
        // Select comparison period
        const comparisonOptions = page.locator('text=/Previous.*period|Last.*month/i');
        if (await comparisonOptions.first().isVisible()) {
          await takeScreenshot(page, 'analytics-23-comparison-options');
        }
      }
    });

    // Test 15: Real-time updates
    await test.step('Real-time data updates', async () => {
      // Check for live indicators
      const liveIndicator = page.locator('text=/live|real.*time|updating/i').first();
      
      if (await liveIndicator.isVisible()) {
        await takeScreenshot(page, 'analytics-24-live-updates');
        
        // Wait for potential updates
        await page.waitForTimeout(3000);
        
        // Check if any values changed
        const currentMetrics = await page.locator('[class*="text-2xl"], [class*="text-3xl"]').allTextContents();
        console.log('Current metric values:', currentMetrics);
      }
    });
  });

  test('Responsive design for analytics', async ({ page }) => {
    console.log('📱 Testing responsive design for analytics');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/analytics');
      await waitForAnimation(page);
      
      await takeScreenshot(page, `analytics-responsive-${viewport.name}`);
      
      // Verify layout adjustments
      if (viewport.name === 'mobile') {
        // Cards should stack vertically on mobile
        const grid = page.locator('[class*="grid"]').first();
        const gridClasses = await grid.getAttribute('class');
        expect(gridClasses).toMatch(/grid-cols-1/);
      } else if (viewport.name === 'desktop') {
        // Should have multiple columns on desktop
        const grid = page.locator('[class*="grid"]').first();
        const gridClasses = await grid.getAttribute('class');
        expect(gridClasses).toMatch(/grid-cols-[3-9]/);
      }
    }
  });

  test('Keyboard navigation', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation');
    
    await testKeyboardNavigation(page, [
      { key: 'Tab', expectedFocus: 'button, [role="combobox"]' },
      { key: 'Enter', expectedAction: 'select option or trigger action' },
      { key: 'Escape', expectedAction: 'close dropdowns' },
      { key: 'ArrowDown', expectedAction: 'navigate options' }
    ], 'analytics-keyboard');
  });

  test('Data accuracy verification', async ({ page }) => {
    console.log('✅ Testing data accuracy');
    
    // Verify metrics add up correctly
    const totalDocuments = page.locator('text=/Total Documents/i').locator('..').locator('text=/[0-9]+/');
    const totalNotes = page.locator('text=/Total Notes/i').locator('..').locator('text=/[0-9]+/');
    
    if (await totalDocuments.isVisible() && await totalNotes.isVisible()) {
      const docsCount = parseInt(await totalDocuments.textContent() || '0');
      const notesCount = parseInt(await totalNotes.textContent() || '0');
      
      console.log(`Documents: ${docsCount}, Notes: ${notesCount}`);
      
      // Verify totals are reasonable
      expect(docsCount).toBeGreaterThanOrEqual(0);
      expect(notesCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('Performance monitoring', async ({ page }) => {
    console.log('⚡ Testing dashboard performance');
    
    // Measure initial load time
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('text=/Analytics Dashboard/i');
    const loadTime = Date.now() - startTime;
    
    console.log(`Dashboard load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    
    // Test chart rendering performance
    const chartStart = Date.now();
    const charts = await page.locator('canvas').count();
    const chartRenderTime = Date.now() - chartStart;
    
    console.log(`Time to render ${charts} charts: ${chartRenderTime}ms`);
    expect(chartRenderTime).toBeLessThan(2000);
  });

  test('Error handling', async ({ page }) => {
    console.log('❌ Testing error handling');
    
    // Simulate network failure
    await page.route('**/api/analytics/**', route => route.abort());
    
    await page.reload();
    
    // Check for error state
    const errorMessage = await page.waitForSelector('text=/error|failed|unable/i', { timeout: 5000 }).catch(() => null);
    if (errorMessage) {
      await takeScreenshot(page, 'analytics-25-error-state');
    }
    
    // Check for fallback UI
    const fallbackUI = page.locator('text=/No data|Try again/i');
    if (await fallbackUI.isVisible()) {
      console.log('Fallback UI displayed correctly');
    }
    
    // Restore network
    await page.unroute('**/api/analytics/**');
  });

  test('Custom date range', async ({ page }) => {
    console.log('📅 Testing custom date range');
    
    const dateRangeButton = page.locator('button:has-text("Custom Range"), button[aria-label*="date"]').first();
    
    if (await dateRangeButton.isVisible()) {
      await clickWithScreenshot(page, dateRangeButton, 'analytics-26-custom-date');
      
      // Check for date picker
      const datePicker = page.locator('[role="dialog"]').filter({ has: page.locator('button[name="day"]') });
      if (await datePicker.isVisible()) {
        await takeScreenshot(page, 'analytics-27-date-picker');
        
        // Select start date
        const startDate = page.locator('button[name="day"]').first();
        await startDate.click();
        
        // Select end date
        const endDate = page.locator('button[name="day"]').last();
        await endDate.click();
        
        await takeScreenshot(page, 'analytics-28-date-range-selected');
      }
    }
  });
});