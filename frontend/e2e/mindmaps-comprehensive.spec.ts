import { test, expect } from '@playwright/test';
import { 
  TEST_USERS,
  loginUser,
  takeScreenshot,
  clickWithScreenshot,
  fillFormWithScreenshots,
  testHoverState,
  waitForAnimation,
  verifyVisible,
  createTestMindMap,
  testDragAndDrop,
  testResponsive,
  setupConsoleLogging
} from './helpers/test-helpers';

test.describe('Mind Maps - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/mindmaps');
    await waitForAnimation(page);
  });

  test('Complete mind map workflow with visual regression', async ({ page }) => {
    console.log('🧠 Starting comprehensive mind map test');
    
    // Test 1: Mind maps dashboard
    await test.step('Mind maps dashboard', async () => {
      await takeScreenshot(page, 'mindmaps-01-dashboard');
      await testResponsive(page, 'mindmaps-dashboard');
      
      // Check empty state
      const emptyState = page.locator('text=/no mind maps|create your first|get started/i');
      if (await emptyState.isVisible()) {
        await takeScreenshot(page, 'mindmaps-empty-state');
      }
    });

    // Test 2: Create mind map
    await test.step('Create mind map', async () => {
      const createButton = page.locator('button:has-text("Create"), button:has-text("New Mind Map")').first();
      await clickWithScreenshot(page, createButton, 'mindmaps-create-button');
      
      // Fill form
      await fillFormWithScreenshots(page, {
        'input[name="title"], input[placeholder*="title"]': 'Physics Concepts',
        'textarea[name="description"], textarea[placeholder*="description"]': 'Understanding Newton\'s Laws and related concepts'
      }, 'mindmaps-create-form');
      
      // Submit
      await clickWithScreenshot(page, 'button[type="submit"], button:has-text("Create")', 'mindmaps-create-submit');
      await waitForAnimation(page);
      
      // Should redirect to mind map editor
      await page.waitForSelector('canvas, svg, .mind-map-canvas', { timeout: 10000 });
      await takeScreenshot(page, 'mindmaps-02-editor');
    });

    // Test 3: Add nodes
    await test.step('Add and edit nodes', async () => {
      // Add root node
      const canvas = page.locator('canvas, svg, .mind-map-canvas').first();
      const canvasBox = await canvas.boundingBox();
      
      if (canvasBox) {
        // Click center to add root node
        await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
        await waitForAnimation(page);
        await takeScreenshot(page, 'mindmaps-root-node');
        
        // Edit root node
        const rootNode = page.locator('.mind-map-node, [data-testid="mind-map-node"]').first();
        if (await rootNode.isVisible()) {
          await rootNode.dblclick();
          await page.keyboard.type('Newton\'s Laws');
          await page.keyboard.press('Enter');
          await takeScreenshot(page, 'mindmaps-root-node-edited');
        }
        
        // Add child nodes
        const positions = [
          { x: canvasBox.width / 2 - 150, y: canvasBox.height / 2 - 100, text: 'First Law' },
          { x: canvasBox.width / 2 + 150, y: canvasBox.height / 2 - 100, text: 'Second Law' },
          { x: canvasBox.width / 2, y: canvasBox.height / 2 + 100, text: 'Third Law' }
        ];
        
        for (let i = 0; i < positions.length; i++) {
          const pos = positions[i];
          
          // Add node
          await page.mouse.click(canvasBox.x + pos.x, canvasBox.y + pos.y);
          await waitForAnimation(page);
          
          // Edit node
          const newNode = page.locator('.mind-map-node').nth(i + 1);
          if (await newNode.isVisible()) {
            await newNode.dblclick();
            await page.keyboard.type(pos.text);
            await page.keyboard.press('Enter');
          }
          
          await takeScreenshot(page, `mindmaps-child-node-${i}`);
        }
      }
      
      await takeScreenshot(page, 'mindmaps-03-nodes-added');
    });

    // Test 4: Create connections
    await test.step('Create connections', async () => {
      // Connect nodes
      const nodes = page.locator('.mind-map-node, [data-testid="mind-map-node"]');
      const nodeCount = await nodes.count();
      
      if (nodeCount >= 2) {
        // Drag from first node to second
        const firstNode = nodes.nth(0);
        const secondNode = nodes.nth(1);
        
        // Start connection
        const firstBox = await firstNode.boundingBox();
        const secondBox = await secondNode.boundingBox();
        
        if (firstBox && secondBox) {
          // Drag from edge of first node to second node
          await page.mouse.move(firstBox.x + firstBox.width, firstBox.y + firstBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(secondBox.x, secondBox.y + secondBox.height / 2);
          await page.mouse.up();
          await waitForAnimation(page);
          await takeScreenshot(page, 'mindmaps-connection-created');
        }
      }
      
      await takeScreenshot(page, 'mindmaps-04-with-connections');
    });

    // Test 5: Node operations
    await test.step('Node operations', async () => {
      // Test node hover states
      const node = page.locator('.mind-map-node').first();
      if (await node.isVisible()) {
        await testHoverState(page, node, 'mindmaps-node-hover');
        
        // Right-click for context menu
        await node.click({ button: 'right' });
        await waitForAnimation(page);
        
        const contextMenu = page.locator('.context-menu, [role="menu"]');
        if (await contextMenu.isVisible()) {
          await takeScreenshot(page, 'mindmaps-context-menu');
        }
        
        // Click elsewhere to close menu
        await page.mouse.click(100, 100);
      }
      
      // Test node expansion/collapse
      const expandButton = page.locator('button[aria-label*="expand"], .expand-button').first();
      if (await expandButton.isVisible()) {
        await clickWithScreenshot(page, expandButton, 'mindmaps-expand-button');
        await clickWithScreenshot(page, expandButton, 'mindmaps-collapse-button');
      }
    });

    // Test 6: Physics controls
    await test.step('Physics engine controls', async () => {
      // Look for physics control panel
      const physicsPanel = page.locator('.physics-control-panel, [data-testid="physics-controls"]');
      if (await physicsPanel.isVisible()) {
        await takeScreenshot(page, 'mindmaps-physics-panel');
        
        // Test physics presets
        const presets = ['Force Directed', 'Gravity', 'Space'];
        for (const preset of presets) {
          const presetButton = page.locator(`button:has-text("${preset}")`);
          if (await presetButton.isVisible()) {
            await clickWithScreenshot(page, presetButton, `mindmaps-physics-${preset.toLowerCase().replace(' ', '-')}`);
            await page.waitForTimeout(1000); // Let physics settle
            await takeScreenshot(page, `mindmaps-physics-${preset.toLowerCase().replace(' ', '-')}-applied`);
          }
        }
        
        // Test force visualizer
        const forceToggle = page.locator('button:has-text("Show Forces"), input[type="checkbox"][name*="force"]');
        if (await forceToggle.isVisible()) {
          await clickWithScreenshot(page, forceToggle, 'mindmaps-force-visualizer-toggle');
          await takeScreenshot(page, 'mindmaps-05-forces-visible');
        }
        
        // Test play/pause
        const playPauseButton = page.locator('button[aria-label*="play"], button[aria-label*="pause"]').first();
        if (await playPauseButton.isVisible()) {
          await clickWithScreenshot(page, playPauseButton, 'mindmaps-physics-pause');
          await clickWithScreenshot(page, playPauseButton, 'mindmaps-physics-play');
        }
      }
    });

    // Test 7: Drag nodes with physics
    await test.step('Drag nodes with physics', async () => {
      const node = page.locator('.mind-map-node').first();
      if (await node.isVisible()) {
        const box = await node.boundingBox();
        if (box) {
          // Drag node
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await takeScreenshot(page, 'mindmaps-node-drag-start');
          
          await page.mouse.move(box.x + 200, box.y + 100);
          await takeScreenshot(page, 'mindmaps-node-dragging');
          
          await page.mouse.up();
          await page.waitForTimeout(1000); // Let physics settle
          await takeScreenshot(page, 'mindmaps-node-drag-end');
        }
      }
      
      // Test shift+click impulse
      await page.keyboard.down('Shift');
      await node.click();
      await page.keyboard.up('Shift');
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'mindmaps-06-impulse-applied');
    });

    // Test 8: AI generation
    await test.step('AI mind map generation', async () => {
      // Look for AI generation button
      const aiButton = page.locator('button:has-text("Generate"), button:has-text("AI")').first();
      if (await aiButton.isVisible()) {
        await clickWithScreenshot(page, aiButton, 'mindmaps-ai-button');
        
        // Fill prompt
        await page.fill('textarea[placeholder*="describe"], textarea[name="prompt"]', 'Create a mind map about quantum physics basics');
        await takeScreenshot(page, 'mindmaps-ai-prompt');
        
        // Generate
        await clickWithScreenshot(page, 'button[type="submit"], button:has-text("Generate")', 'mindmaps-ai-generate');
        
        // Wait for generation
        await page.waitForSelector('text=/generated|complete/i', { timeout: 30000 });
        await takeScreenshot(page, 'mindmaps-07-ai-generated');
      }
    });

    // Test 9: Export options
    await test.step('Export mind map', async () => {
      // Find export button
      const exportButton = page.locator('button:has-text("Export")').first();
      if (await exportButton.isVisible()) {
        await clickWithScreenshot(page, exportButton, 'mindmaps-export-button');
        
        // Test different export formats
        const formats = ['PNG', 'SVG', 'JSON'];
        for (const format of formats) {
          const formatButton = page.locator(`button:has-text("${format}")`);
          if (await formatButton.isVisible()) {
            await testHoverState(page, formatButton, `mindmaps-export-${format.toLowerCase()}`);
          }
        }
        
        await takeScreenshot(page, 'mindmaps-export-options');
      }
    });

    // Test 10: Collaboration features
    await test.step('Collaboration features', async () => {
      // Look for share button
      const shareButton = page.locator('button:has-text("Share")').first();
      if (await shareButton.isVisible()) {
        await clickWithScreenshot(page, shareButton, 'mindmaps-share-button');
        
        const shareDialog = page.locator('.share-dialog, [role="dialog"]');
        if (await shareDialog.isVisible()) {
          await takeScreenshot(page, 'mindmaps-share-dialog');
          
          // Close dialog
          await page.keyboard.press('Escape');
        }
      }
    });

    // Test 11: Responsive mind map editor
    await test.step('Responsive editor', async () => {
      await testResponsive(page, 'mindmaps-editor-responsive');
    });

    console.log('✅ Mind map tests completed');
  });

  test('Test mind map performance with many nodes', async ({ page }) => {
    await test.step('Create large mind map', async () => {
      await createTestMindMap(page, 'Performance Test', 'Testing with many nodes');
      
      // Add many nodes programmatically
      const nodeCount = 20;
      const canvas = page.locator('canvas, svg, .mind-map-canvas').first();
      const canvasBox = await canvas.boundingBox();
      
      if (canvasBox) {
        for (let i = 0; i < nodeCount; i++) {
          const angle = (i / nodeCount) * 2 * Math.PI;
          const radius = 200;
          const x = canvasBox.width / 2 + radius * Math.cos(angle);
          const y = canvasBox.height / 2 + radius * Math.sin(angle);
          
          await page.mouse.click(canvasBox.x + x, canvasBox.y + y);
          await page.waitForTimeout(100);
        }
        
        await takeScreenshot(page, 'mindmaps-performance-many-nodes');
        
        // Test physics with many nodes
        const physicsButton = page.locator('button:has-text("Force Directed")').first();
        if (await physicsButton.isVisible()) {
          await physicsButton.click();
          await page.waitForTimeout(2000); // Let physics settle
          await takeScreenshot(page, 'mindmaps-performance-physics');
        }
      }
    });
  });

  test('Test mind map gestures and interactions', async ({ page }) => {
    await createTestMindMap(page, 'Gesture Test', 'Testing touch and mouse gestures');
    
    await test.step('Pan and zoom', async () => {
      const canvas = page.locator('canvas, svg, .mind-map-canvas').first();
      const box = await canvas.boundingBox();
      
      if (box) {
        // Test pan
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down({ button: 'middle' });
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
        await page.mouse.up();
        await takeScreenshot(page, 'mindmaps-pan-gesture');
        
        // Test zoom
        await page.mouse.wheel(0, -100);
        await takeScreenshot(page, 'mindmaps-zoom-in');
        
        await page.mouse.wheel(0, 200);
        await takeScreenshot(page, 'mindmaps-zoom-out');
      }
    });
    
    await test.step('Multi-select', async () => {
      // Hold shift and click multiple nodes
      await page.keyboard.down('Shift');
      
      const nodes = page.locator('.mind-map-node');
      const nodeCount = await nodes.count();
      
      for (let i = 0; i < Math.min(3, nodeCount); i++) {
        await nodes.nth(i).click();
        await page.waitForTimeout(200);
      }
      
      await page.keyboard.up('Shift');
      await takeScreenshot(page, 'mindmaps-multi-select');
    });
  });
});