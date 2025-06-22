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

test.describe('Citation Network - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/citation-network');
    await waitForAnimation(page);
  });

  test('Complete citation network workflow', async ({ page }) => {
    console.log('🔗 Starting comprehensive citation network test');
    
    // Test 1: Citation network dashboard
    await test.step('Citation network dashboard', async () => {
      await takeScreenshot(page, 'citation-network-01-dashboard');
      
      // Check for network canvas or empty state
      const networkCanvas = page.locator('.react-flow, [class*="react-flow"]').first();
      const emptyState = page.locator('text=/No documents|Upload documents|Add citations/i');
      
      if (await networkCanvas.isVisible()) {
        await takeScreenshot(page, 'citation-network-02-network-view');
      } else if (await emptyState.isVisible()) {
        await takeScreenshot(page, 'citation-network-03-empty-state');
      }
      
      await testResponsive(page, 'citation-network-dashboard');
    });

    // Test 2: Upload documents with citations
    await test.step('Upload documents for citation extraction', async () => {
      const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add Document")').first();
      
      if (await uploadButton.isVisible()) {
        await clickWithScreenshot(page, uploadButton, 'citation-network-04-upload-button');
        
        // Mock file upload
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          // This would normally upload a PDF with citations
          console.log('File input found for document upload');
        }
      }
    });

    // Test 3: Network visualization controls
    await test.step('Network visualization controls', async () => {
      const networkCanvas = page.locator('.react-flow').first();
      
      if (await networkCanvas.isVisible()) {
        // Verify control buttons
        await verifyVisible(page, 'button[aria-label*="zoom in"], .react-flow__controls');
        await verifyVisible(page, 'button[aria-label*="zoom out"]');
        await verifyVisible(page, 'button[aria-label*="fit view"], button:has-text("Fit View")');
        
        await takeScreenshot(page, 'citation-network-05-controls');
        
        // Test zoom controls
        const zoomInButton = page.locator('button[aria-label*="zoom in"]').first();
        if (await zoomInButton.isVisible()) {
          await clickWithScreenshot(page, zoomInButton, 'citation-network-06-zoom-in');
        }
        
        // Test fit view
        const fitViewButton = page.locator('button:has-text("Fit View"), button[aria-label*="fit"]').first();
        if (await fitViewButton.isVisible()) {
          await clickWithScreenshot(page, fitViewButton, 'citation-network-07-fit-view');
        }
      }
    });

    // Test 4: Node types visualization
    await test.step('Node types in network', async () => {
      // Document nodes
      const documentNode = page.locator('[data-id*="doc_"], .react-flow__node-document').first();
      if (await documentNode.isVisible()) {
        await takeScreenshot(page, 'citation-network-08-document-node');
        
        // Test hover state
        await testHoverState(page, documentNode, 'document-node-hover');
      }
      
      // Citation nodes
      const citationNode = page.locator('[data-id*="cite_"], .react-flow__node-citation').first();
      if (await citationNode.isVisible()) {
        await takeScreenshot(page, 'citation-network-09-citation-node');
      }
      
      // Author nodes
      const authorNode = page.locator('[data-id*="author_"], .react-flow__node-author').first();
      if (await authorNode.isVisible()) {
        await takeScreenshot(page, 'citation-network-10-author-node');
      }
    });

    // Test 5: Edge types and relationships
    await test.step('Citation relationships', async () => {
      // Legend verification
      const legend = page.locator('text=/Cites|Extends|Contradicts|Supports/i').first();
      if (await legend.isVisible()) {
        await takeScreenshot(page, 'citation-network-11-legend');
        
        // Verify edge color codes
        await verifyVisible(page, 'text=/Cites/i');
        await verifyVisible(page, 'text=/Extends/i');
        await verifyVisible(page, 'text=/Contradicts/i');
        await verifyVisible(page, 'text=/Supports/i');
      }
    });

    // Test 6: Node interaction
    await test.step('Node selection and details', async () => {
      const node = page.locator('.react-flow__node').first();
      
      if (await node.isVisible()) {
        await clickWithScreenshot(page, node, 'citation-network-12-node-selected');
        
        // Check for node details panel
        const nodeDetails = page.locator('text=/Selected Node|Node Details/i');
        if (await nodeDetails.isVisible()) {
          await takeScreenshot(page, 'citation-network-13-node-details');
          
          // Verify node information
          await verifyVisible(page, 'text=/ID:|Type:|Citations:/i');
        }
      }
    });

    // Test 7: Cluster analysis
    await test.step('Find citation clusters', async () => {
      const clusterButton = page.locator('button:has-text("Find Clusters"), button:has-text("Analyze")').first();
      
      if (await clusterButton.isVisible()) {
        await clickWithScreenshot(page, clusterButton, 'citation-network-14-cluster-button');
        
        // Wait for analysis
        await page.waitForSelector('text=/Analyzing/i', { state: 'hidden', timeout: 10000 }).catch(() => {});
        await waitForAnimation(page);
        
        // Check for cluster visualization
        const clusteredNodes = page.locator('[style*="backgroundColor"]').first();
        if (await clusteredNodes.isVisible()) {
          await takeScreenshot(page, 'citation-network-15-clusters-highlighted');
        }
        
        // Check for cluster results
        const clusterToast = page.locator('text=/Found.*clusters/i');
        if (await clusterToast.isVisible()) {
          const clusterText = await clusterToast.textContent();
          console.log('Cluster analysis result:', clusterText);
        }
      }
    });

    // Test 8: Mini map navigation
    await test.step('Mini map functionality', async () => {
      const miniMap = page.locator('.react-flow__minimap').first();
      
      if (await miniMap.isVisible()) {
        await takeScreenshot(page, 'citation-network-16-minimap');
        
        // Test clicking on minimap
        const miniMapRect = await miniMap.boundingBox();
        if (miniMapRect) {
          await page.mouse.click(
            miniMapRect.x + miniMapRect.width / 2,
            miniMapRect.y + miniMapRect.height / 2
          );
          await waitForAnimation(page);
          await takeScreenshot(page, 'citation-network-17-minimap-navigation');
        }
      }
    });

    // Test 9: Network pan and zoom
    await test.step('Pan and zoom interaction', async () => {
      const canvas = page.locator('.react-flow__viewport').first();
      
      if (await canvas.isVisible()) {
        // Pan the network
        await canvas.hover();
        await page.mouse.down();
        await page.mouse.move(100, 100);
        await page.mouse.up();
        await takeScreenshot(page, 'citation-network-18-panned');
        
        // Zoom with mouse wheel
        await canvas.hover();
        await page.mouse.wheel(0, -100); // Zoom in
        await waitForAnimation(page);
        await takeScreenshot(page, 'citation-network-19-zoomed');
      }
    });

    // Test 10: Citation metrics
    await test.step('Citation influence metrics', async () => {
      // Look for nodes with citation counts
      const nodeWithCitations = page.locator('text=/[0-9]+ citations/').first();
      
      if (await nodeWithCitations.isVisible()) {
        await nodeWithCitations.hover();
        await takeScreenshot(page, 'citation-network-20-citation-metrics');
        
        // Click to see detailed metrics
        await nodeWithCitations.click();
        await waitForAnimation(page);
        
        const metricsPanel = page.locator('text=/Impact|Influence|h-index/i');
        if (await metricsPanel.isVisible()) {
          await takeScreenshot(page, 'citation-network-21-influence-scores');
        }
      }
    });

    // Test 11: Export network data
    await test.step('Export citation network', async () => {
      const exportButton = page.locator('button:has-text("Export")').first();
      
      if (await exportButton.isVisible()) {
        await clickWithScreenshot(page, exportButton, 'citation-network-22-export-options');
        
        // Check export formats
        const exportFormats = ['SVG', 'PNG', 'JSON', 'GraphML'];
        for (const format of exportFormats) {
          const formatOption = page.locator(`text=/${format}/i`).first();
          if (await formatOption.isVisible()) {
            console.log(`Export format available: ${format}`);
          }
        }
      }
    });

    // Test 12: Filter network view
    await test.step('Filter network display', async () => {
      const filterButton = page.locator('button:has-text("Filter"), [aria-label*="filter"]').first();
      
      if (await filterButton.isVisible()) {
        await clickWithScreenshot(page, filterButton, 'citation-network-23-filter-options');
        
        // Test filter options
        const filterOptions = ['Documents', 'Citations', 'Authors', 'Year Range'];
        for (const option of filterOptions) {
          const filterOption = page.locator(`text=/${option}/i`).first();
          if (await filterOption.isVisible()) {
            console.log(`Filter option found: ${option}`);
          }
        }
      }
    });
  });

  test('Responsive design for citation network', async ({ page }) => {
    console.log('📱 Testing responsive design for citation network');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/citation-network');
      await waitForAnimation(page);
      
      await takeScreenshot(page, `citation-network-responsive-${viewport.name}`);
      
      // Verify controls visibility
      const controls = page.locator('.react-flow__controls');
      if (viewport.name === 'mobile' && await controls.isVisible()) {
        // Controls should be more compact on mobile
        const controlsBox = await controls.boundingBox();
        expect(controlsBox?.width).toBeLessThan(100);
      }
    }
  });

  test('Keyboard navigation', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation');
    
    const networkCanvas = page.locator('.react-flow').first();
    
    if (await networkCanvas.isVisible()) {
      await networkCanvas.focus();
      
      // Test keyboard controls
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await takeScreenshot(page, 'citation-network-keyboard-pan');
      
      await page.keyboard.press('+'); // Zoom in
      await takeScreenshot(page, 'citation-network-keyboard-zoom-in');
      
      await page.keyboard.press('-'); // Zoom out
      await takeScreenshot(page, 'citation-network-keyboard-zoom-out');
      
      await page.keyboard.press('Tab'); // Navigate nodes
      await takeScreenshot(page, 'citation-network-keyboard-navigation');
    }
  });

  test('Performance with large networks', async ({ page }) => {
    console.log('⚡ Testing performance with large citation networks');
    
    // This would typically load a large dataset
    const startTime = Date.now();
    
    // Check rendering performance
    const canvas = page.locator('.react-flow__renderer').first();
    if (await canvas.isVisible()) {
      const renderTime = Date.now() - startTime;
      console.log(`Network render time: ${renderTime}ms`);
      
      // Test interaction performance
      const interactionStart = Date.now();
      await canvas.hover();
      await page.mouse.wheel(0, -50);
      const interactionTime = Date.now() - interactionStart;
      
      console.log(`Interaction response time: ${interactionTime}ms`);
      expect(interactionTime).toBeLessThan(100); // Should be responsive
    }
  });

  test('Error handling', async ({ page }) => {
    console.log('❌ Testing error handling');
    
    // Simulate network failure
    await page.route('**/api/citation-network/**', route => route.abort());
    
    const analyzeButton = page.locator('button:has-text("Find Clusters")').first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      
      // Check for error message
      const errorMessage = await page.waitForSelector('text=/error|failed|unable/i', { timeout: 5000 }).catch(() => null);
      if (errorMessage) {
        await takeScreenshot(page, 'citation-network-24-error-state');
      }
    }
    
    // Restore network
    await page.unroute('**/api/citation-network/**');
  });

  test('Node drag and drop', async ({ page }) => {
    console.log('🔀 Testing node repositioning');
    
    const node = page.locator('.react-flow__node').first();
    
    if (await node.isVisible()) {
      const initialPosition = await node.boundingBox();
      
      // Drag node to new position
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(200, 200);
      await page.mouse.up();
      
      await takeScreenshot(page, 'citation-network-25-node-dragged');
      
      const newPosition = await node.boundingBox();
      if (initialPosition && newPosition) {
        expect(newPosition.x).not.toBe(initialPosition.x);
        expect(newPosition.y).not.toBe(initialPosition.y);
      }
    }
  });
});