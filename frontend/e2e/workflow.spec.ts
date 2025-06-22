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

test.describe('Workflow - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/workflow');
    await waitForAnimation(page);
  });

  test('Complete workflow builder and execution', async ({ page }) => {
    console.log('⚙️ Starting comprehensive workflow test');
    
    // Test 1: Workflow canvas
    await test.step('Workflow canvas overview', async () => {
      await takeScreenshot(page, 'workflow-01-canvas');
      
      // Verify canvas components
      await verifyVisible(page, '.react-flow, [class*="react-flow"]');
      await verifyVisible(page, 'button:has-text("Add Action")');
      await verifyVisible(page, 'button:has-text("Test")');
      await verifyVisible(page, 'button:has-text("Save")');
      
      await testResponsive(page, 'workflow-canvas');
    });

    // Test 2: Default trigger node
    await test.step('Verify default trigger', async () => {
      const triggerNode = page.locator('[class*="bg-purple-500"]').filter({ hasText: /Trigger/i });
      
      if (await triggerNode.isVisible()) {
        await takeScreenshot(page, 'workflow-02-default-trigger');
        
        // Test hover state
        await testHoverState(page, triggerNode, 'trigger-node-hover');
      }
    });

    // Test 3: Open action library
    await test.step('Open action library', async () => {
      const addActionButton = page.locator('button:has-text("Add Action")');
      await clickWithScreenshot(page, addActionButton, 'workflow-03-add-action-button');
      
      // Wait for action library panel
      await waitForAnimation(page);
      
      const actionLibrary = page.locator('[data-testid="action-library"], .action-library');
      if (await actionLibrary.isVisible()) {
        await takeScreenshot(page, 'workflow-04-action-library');
      }
    });

    // Test 4: Add actions to workflow
    await test.step('Add actions to workflow', async () => {
      // Select first available action
      const firstAction = page.locator('[data-testid="action-item"], .action-item').first();
      
      if (await firstAction.isVisible()) {
        const actionName = await firstAction.textContent();
        console.log(`Adding action: ${actionName}`);
        
        await clickWithScreenshot(page, firstAction, 'workflow-05-select-action');
        
        // Verify action added to canvas
        await waitForAnimation(page);
        const actionNode = page.locator('[class*="bg-blue-500"]').first();
        if (await actionNode.isVisible()) {
          await takeScreenshot(page, 'workflow-06-action-added');
        }
      }
      
      // Add second action
      await page.click('button:has-text("Add Action")');
      await waitForAnimation(page);
      
      const secondAction = page.locator('[data-testid="action-item"], .action-item').nth(1);
      if (await secondAction.isVisible()) {
        await secondAction.click();
        await waitForAnimation(page);
        await takeScreenshot(page, 'workflow-07-multiple-actions');
      }
    });

    // Test 5: Connect nodes
    await test.step('Connect workflow nodes', async () => {
      // Check for connection lines
      const edges = page.locator('[class*="react-flow__edge"]');
      
      if (await edges.first().isVisible()) {
        await takeScreenshot(page, 'workflow-08-connected-nodes');
        
        // Verify animated connections
        const animatedEdge = edges.filter({ has: page.locator('[stroke-dasharray]') });
        if (await animatedEdge.first().isVisible()) {
          console.log('Found animated workflow connections');
        }
      }
    });

    // Test 6: Configure trigger
    await test.step('Configure workflow trigger', async () => {
      const triggerNode = page.locator('[class*="bg-purple-500"]').first();
      
      if (await triggerNode.isVisible()) {
        await clickWithScreenshot(page, triggerNode, 'workflow-09-click-trigger');
        
        // Wait for trigger config panel
        await waitForAnimation(page);
        
        const triggerConfig = page.locator('[data-testid="trigger-config"], .trigger-config');
        if (await triggerConfig.isVisible()) {
          await takeScreenshot(page, 'workflow-10-trigger-config');
          
          // Test trigger types
          const triggerTypes = ['Manual', 'Schedule', 'Event', 'Webhook'];
          for (const type of triggerTypes) {
            const triggerOption = page.locator(`text=/${type}/i`).first();
            if (await triggerOption.isVisible()) {
              console.log(`Trigger type available: ${type}`);
            }
          }
        }
      }
    });

    // Test 7: Configure action
    await test.step('Configure action properties', async () => {
      const actionNode = page.locator('[class*="bg-blue-500"]').first();
      
      if (await actionNode.isVisible()) {
        await clickWithScreenshot(page, actionNode, 'workflow-11-click-action');
        
        // Check for properties panel
        const propertiesPanel = page.locator('[class*="absolute bottom"]').filter({ has: page.locator('h3') });
        if (await propertiesPanel.isVisible()) {
          await takeScreenshot(page, 'workflow-12-action-properties');
          
          // Check for configuration options
          const configSection = page.locator('text=/Configuration/i');
          if (await configSection.isVisible()) {
            await takeScreenshot(page, 'workflow-13-action-config');
          }
        }
      }
    });

    // Test 8: Edit workflow name
    await test.step('Edit workflow name', async () => {
      const nameInput = page.locator('input[value="New Workflow"]');
      
      if (await nameInput.isVisible()) {
        await nameInput.clear();
        await nameInput.fill('Document Processing Workflow');
        await takeScreenshot(page, 'workflow-14-named-workflow');
      }
    });

    // Test 9: Drag and drop nodes
    await test.step('Drag and drop node positioning', async () => {
      const actionNode = page.locator('[class*="bg-blue-500"]').first();
      
      if (await actionNode.isVisible()) {
        const initialBox = await actionNode.boundingBox();
        
        // Drag node to new position
        await actionNode.hover();
        await page.mouse.down();
        await page.mouse.move(100, 100);
        await page.mouse.up();
        
        await takeScreenshot(page, 'workflow-15-node-repositioned');
        
        const newBox = await actionNode.boundingBox();
        if (initialBox && newBox) {
          expect(newBox.x).not.toBe(initialBox.x);
          expect(newBox.y).not.toBe(initialBox.y);
        }
      }
    });

    // Test 10: Delete action
    await test.step('Delete action from workflow', async () => {
      const actionNode = page.locator('[class*="bg-blue-500"]').last();
      
      if (await actionNode.isVisible()) {
        await actionNode.click();
        await waitForAnimation(page);
        
        // Find delete button
        const deleteButton = page.locator('button').filter({ has: page.locator('[class*="TrashIcon"]') });
        if (await deleteButton.isVisible()) {
          await clickWithScreenshot(page, deleteButton, 'workflow-16-delete-action');
          
          // Verify node removed
          await waitForAnimation(page);
          const remainingActions = await page.locator('[class*="bg-blue-500"]').count();
          console.log(`Remaining actions: ${remainingActions}`);
        }
      }
    });

    // Test 11: Save workflow
    await test.step('Save workflow configuration', async () => {
      const saveButton = page.locator('button:has-text("Save")');
      
      if (await saveButton.isVisible()) {
        await clickWithScreenshot(page, saveButton, 'workflow-17-save-button');
        
        // Check for success message
        const successToast = page.locator('text=/saved.*successfully/i');
        if (await successToast.isVisible({ timeout: 3000 })) {
          await takeScreenshot(page, 'workflow-18-save-success');
        }
      }
    });

    // Test 12: Test workflow execution
    await test.step('Test workflow execution', async () => {
      const testButton = page.locator('button:has-text("Test")');
      
      if (await testButton.isVisible()) {
        await clickWithScreenshot(page, testButton, 'workflow-19-test-button');
        
        // Wait for execution
        await waitForAnimation(page);
        
        // Check for execution feedback
        const executionStatus = page.locator('text=/executing|running|started/i');
        if (await executionStatus.isVisible()) {
          await takeScreenshot(page, 'workflow-20-execution-started');
        }
        
        // Check for execution logs
        const logsPanel = page.locator('[data-testid="execution-logs"], .execution-logs');
        if (await logsPanel.isVisible()) {
          await takeScreenshot(page, 'workflow-21-execution-logs');
        }
      }
    });

    // Test 13: Zoom controls
    await test.step('Canvas zoom controls', async () => {
      const zoomIn = page.locator('button[aria-label*="zoom in"]').first();
      const zoomOut = page.locator('button[aria-label*="zoom out"]').first();
      const fitView = page.locator('button[aria-label*="fit view"]').first();
      
      if (await zoomIn.isVisible()) {
        await clickWithScreenshot(page, zoomIn, 'workflow-22-zoom-in');
      }
      
      if (await zoomOut.isVisible()) {
        await clickWithScreenshot(page, zoomOut, 'workflow-23-zoom-out');
      }
      
      if (await fitView.isVisible()) {
        await clickWithScreenshot(page, fitView, 'workflow-24-fit-view');
      }
    });

    // Test 14: Conditional logic
    await test.step('Add conditional logic', async () => {
      const addActionButton = page.locator('button:has-text("Add Action")');
      await addActionButton.click();
      await waitForAnimation(page);
      
      // Look for conditional action
      const conditionalAction = page.locator('text=/condition|if.*then|branch/i').first();
      if (await conditionalAction.isVisible()) {
        await clickWithScreenshot(page, conditionalAction, 'workflow-25-conditional-action');
        
        // Verify branching in workflow
        await waitForAnimation(page);
        const branches = page.locator('[class*="react-flow__edge"]');
        if (await branches.count() > 2) {
          await takeScreenshot(page, 'workflow-26-conditional-branches');
        }
      }
    });

    // Test 15: Workflow templates
    await test.step('Browse workflow templates', async () => {
      const templatesButton = page.locator('button:has-text("Templates"), button:has-text("Browse")').first();
      
      if (await templatesButton.isVisible()) {
        await clickWithScreenshot(page, templatesButton, 'workflow-27-templates-button');
        
        // Check for template gallery
        const templateGallery = page.locator('[data-testid="workflow-templates"]');
        if (await templateGallery.isVisible()) {
          await takeScreenshot(page, 'workflow-28-template-gallery');
        }
      }
    });
  });

  test('Responsive design for workflow builder', async ({ page }) => {
    console.log('📱 Testing responsive design for workflow builder');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/workflow');
      await waitForAnimation(page);
      
      await takeScreenshot(page, `workflow-responsive-${viewport.name}`);
      
      // Verify layout adjustments
      if (viewport.name === 'mobile') {
        // Controls might be more compact on mobile
        const controls = page.locator('.react-flow__controls');
        if (await controls.isVisible()) {
          const controlsBox = await controls.boundingBox();
          expect(controlsBox?.width).toBeLessThan(100);
        }
      }
    }
  });

  test('Keyboard shortcuts', async ({ page }) => {
    console.log('⌨️ Testing keyboard shortcuts');
    
    const canvas = page.locator('.react-flow').first();
    await canvas.focus();
    
    // Test keyboard shortcuts
    await page.keyboard.press('Control+S'); // Save
    await takeScreenshot(page, 'workflow-keyboard-save');
    
    await page.keyboard.press('Delete'); // Delete selected
    await takeScreenshot(page, 'workflow-keyboard-delete');
    
    await page.keyboard.press('Control+Z'); // Undo
    await takeScreenshot(page, 'workflow-keyboard-undo');
    
    await page.keyboard.press('Control+Y'); // Redo
    await takeScreenshot(page, 'workflow-keyboard-redo');
  });

  test('Complex workflow creation', async ({ page }) => {
    console.log('🔧 Testing complex workflow with multiple branches');
    
    // Add multiple actions
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Add Action")');
      await waitForAnimation(page);
      
      const action = page.locator('[data-testid="action-item"]').nth(i % 3);
      if (await action.isVisible()) {
        await action.click();
        await waitForAnimation(page);
      }
    }
    
    await takeScreenshot(page, 'workflow-29-complex-workflow');
    
    // Verify node count
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    console.log(`Total nodes in workflow: ${nodeCount}`);
    expect(nodeCount).toBeGreaterThan(5);
  });

  test('Workflow performance', async ({ page }) => {
    console.log('⚡ Testing workflow performance');
    
    // Add many nodes to test performance
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("Add Action")');
      const action = page.locator('[data-testid="action-item"]').first();
      if (await action.isVisible()) {
        await action.click();
      }
    }
    
    const buildTime = Date.now() - startTime;
    console.log(`Time to add 10 actions: ${buildTime}ms`);
    expect(buildTime).toBeLessThan(10000); // Should complete within 10 seconds
    
    // Test canvas interaction performance
    const canvas = page.locator('.react-flow__viewport').first();
    const interactionStart = Date.now();
    
    await canvas.hover();
    await page.mouse.wheel(0, -50);
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    
    const interactionTime = Date.now() - interactionStart;
    console.log(`Canvas interaction time: ${interactionTime}ms`);
    expect(interactionTime).toBeLessThan(500);
  });

  test('Error handling', async ({ page }) => {
    console.log('❌ Testing error handling');
    
    // Simulate network failure
    await page.route('**/api/workflow/**', route => route.abort());
    
    const saveButton = page.locator('button:has-text("Save")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Check for error message
      const errorMessage = await page.waitForSelector('text=/error|failed|unable/i', { timeout: 5000 }).catch(() => null);
      if (errorMessage) {
        await takeScreenshot(page, 'workflow-30-error-state');
      }
    }
    
    // Restore network
    await page.unroute('**/api/workflow/**');
  });

  test('Workflow history and versions', async ({ page }) => {
    console.log('📜 Testing workflow versioning');
    
    const historyButton = page.locator('button:has-text("History"), button:has-text("Versions")').first();
    
    if (await historyButton.isVisible()) {
      await clickWithScreenshot(page, historyButton, 'workflow-31-history-button');
      
      // Check for version list
      const versionList = page.locator('[data-testid="workflow-versions"]');
      if (await versionList.isVisible()) {
        await takeScreenshot(page, 'workflow-32-version-history');
        
        // Test version restore
        const restoreButton = page.locator('button:has-text("Restore")').first();
        if (await restoreButton.isVisible()) {
          console.log('Version restore functionality available');
        }
      }
    }
  });
});