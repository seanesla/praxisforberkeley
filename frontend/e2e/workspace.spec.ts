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

test.describe('Workspace - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/workspace');
    await waitForAnimation(page);
  });

  test('Complete workspace collaboration workflow', async ({ page }) => {
    console.log('👥 Starting comprehensive workspace test');
    
    // Test 1: Workspace dashboard
    await test.step('Workspace dashboard overview', async () => {
      await takeScreenshot(page, 'workspace-01-dashboard');
      
      // Verify workspace components
      await verifyVisible(page, 'text=/Documents|Workspace/i');
      
      // Check for empty state or existing workspaces
      const emptyState = page.locator('text=/No documents open/i');
      const documentList = page.locator('[class*="space-y-2"]').locator('div[class*="cursor-pointer"]');
      
      if (await emptyState.isVisible()) {
        await takeScreenshot(page, 'workspace-02-empty-state');
      } else if (await documentList.first().isVisible()) {
        await takeScreenshot(page, 'workspace-03-documents-available');
      }
      
      await testResponsive(page, 'workspace-dashboard');
    });

    // Test 2: Add documents to workspace
    await test.step('Add documents to workspace', async () => {
      const firstDocument = page.locator('div[class*="cursor-pointer"]').filter({ hasText: /[^Layout]/ }).first();
      
      if (await firstDocument.isVisible()) {
        await clickWithScreenshot(page, firstDocument, 'workspace-04-select-document');
        
        // Add second document for split view
        const secondDocument = page.locator('div[class*="cursor-pointer"]:not([class*="bg-purple"])').first();
        if (await secondDocument.isVisible()) {
          await clickWithScreenshot(page, secondDocument, 'workspace-05-select-second-document');
        }
      }
    });

    // Test 3: Layout options
    await test.step('Test different layout types', async () => {
      const layoutLabel = page.locator('text=/Layout/i');
      
      if (await layoutLabel.isVisible()) {
        // Split view
        const splitButton = page.locator('button[aria-label*="split"], button:has([class*="ViewColumnsIcon"])').first();
        if (await splitButton.isVisible()) {
          await clickWithScreenshot(page, splitButton, 'workspace-06-split-layout');
          await waitForAnimation(page);
        }
        
        // Tabs view
        const tabsButton = page.locator('button[aria-label*="tabs"], button:has([class*="RectangleStackIcon"])').first();
        if (await tabsButton.isVisible()) {
          await clickWithScreenshot(page, tabsButton, 'workspace-07-tabs-layout');
          await waitForAnimation(page);
        }
        
        // Grid view
        const gridButton = page.locator('button[aria-label*="grid"], button:has([class*="Squares2X2Icon"])').first();
        if (await gridButton.isVisible()) {
          await clickWithScreenshot(page, gridButton, 'workspace-08-grid-layout');
          await waitForAnimation(page);
        }
      }
    });

    // Test 4: Sync scrolling
    await test.step('Test synchronized scrolling', async () => {
      const syncScrollButton = page.locator('text=/Sync Scrolling/i').locator('..');
      
      if (await syncScrollButton.isVisible()) {
        // Enable sync scrolling
        await clickWithScreenshot(page, syncScrollButton, 'workspace-09-sync-scroll-enabled');
        
        // Test scrolling in one document
        const firstDocContent = page.locator('[class*="prose"]').first();
        if (await firstDocContent.isVisible()) {
          await firstDocContent.hover();
          await page.mouse.wheel(0, 200);
          await waitForAnimation(page);
          await takeScreenshot(page, 'workspace-10-synchronized-scroll');
        }
        
        // Verify lock icon state
        const lockIcon = page.locator('[class*="LockClosedIcon"], [class*="LockOpenIcon"]').first();
        if (await lockIcon.isVisible()) {
          const isLocked = await lockIcon.evaluate(el => el.classList.toString().includes('LockClosed'));
          console.log(`Sync scrolling is ${isLocked ? 'enabled' : 'disabled'}`);
        }
      }
    });

    // Test 5: Document tabs navigation
    await test.step('Navigate document tabs', async () => {
      // Switch to tabs layout first
      const tabsButton = page.locator('button:has([class*="RectangleStackIcon"])').first();
      if (await tabsButton.isVisible()) {
        await tabsButton.click();
        await waitForAnimation(page);
        
        // Click on different tabs
        const tabs = page.locator('button[class*="px-4 py-2"]');
        const tabCount = await tabs.count();
        
        if (tabCount > 1) {
          await clickWithScreenshot(page, tabs.nth(1), 'workspace-11-tab-switch');
          
          // Verify active tab styling
          const activeTab = page.locator('button[class*="border-purple-500"]').first();
          await expect(activeTab).toBeVisible();
        }
      }
    });

    // Test 6: Save workspace
    await test.step('Save workspace configuration', async () => {
      const saveButton = page.locator('button:has-text("Save Workspace")');
      
      if (await saveButton.isVisible()) {
        await clickWithScreenshot(page, saveButton, 'workspace-12-save-button');
        
        // Check for success message
        const successToast = page.locator('text=/saved.*successfully/i');
        if (await successToast.isVisible({ timeout: 3000 })) {
          await takeScreenshot(page, 'workspace-13-save-success');
        }
      }
    });

    // Test 7: Close documents
    await test.step('Close documents from workspace', async () => {
      const closeButton = page.locator('[class*="XMarkIcon"]').first();
      
      if (await closeButton.isVisible()) {
        await testHoverState(page, closeButton, 'close-button-hover');
        await clickWithScreenshot(page, closeButton, 'workspace-14-close-document');
        
        // Verify document removed
        await waitForAnimation(page);
        const documentHeaders = page.locator('[class*="bg-gray-800"]').filter({ has: page.locator('[class*="DocumentTextIcon"]') });
        const remainingDocs = await documentHeaders.count();
        console.log(`Remaining documents: ${remainingDocs}`);
      }
    });

    // Test 8: Zoom controls
    await test.step('Document zoom functionality', async () => {
      // Look for zoom controls or keyboard shortcuts
      const documentContent = page.locator('[style*="zoom"]').first();
      
      if (await documentContent.isVisible()) {
        // Test zoom in
        await page.keyboard.press('Control+Plus');
        await waitForAnimation(page);
        await takeScreenshot(page, 'workspace-15-zoomed-in');
        
        // Test zoom out
        await page.keyboard.press('Control+Minus');
        await waitForAnimation(page);
        await takeScreenshot(page, 'workspace-16-zoomed-out');
        
        // Reset zoom
        await page.keyboard.press('Control+0');
      }
    });

    // Test 9: Collaboration features (simulated)
    await test.step('Collaboration indicators', async () => {
      // Look for collaboration features like user avatars, presence indicators
      const userIndicator = page.locator('[aria-label*="user"], [class*="avatar"]').first();
      
      if (await userIndicator.isVisible()) {
        await takeScreenshot(page, 'workspace-17-collaboration-indicators');
      }
      
      // Check for real-time sync indicators
      const syncIndicator = page.locator('text=/syncing|live|real-time/i').first();
      if (await syncIndicator.isVisible()) {
        await takeScreenshot(page, 'workspace-18-sync-status');
      }
    });

    // Test 10: Version control
    await test.step('Version control features', async () => {
      // Look for version history or save points
      const versionButton = page.locator('button:has-text("Version"), button:has-text("History")').first();
      
      if (await versionButton.isVisible()) {
        await clickWithScreenshot(page, versionButton, 'workspace-19-version-button');
        
        // Check for version list
        const versionList = page.locator('text=/Version.*[0-9]|Save.*point/i');
        if (await versionList.first().isVisible()) {
          await takeScreenshot(page, 'workspace-20-version-history');
        }
      }
    });

    // Test 11: Permission levels
    await test.step('Workspace permissions', async () => {
      // Look for permission controls
      const permissionButton = page.locator('button:has-text("Share"), button:has-text("Permissions")').first();
      
      if (await permissionButton.isVisible()) {
        await clickWithScreenshot(page, permissionButton, 'workspace-21-permissions-button');
        
        // Check permission levels
        const permissionLevels = ['Viewer', 'Editor', 'Admin'];
        for (const level of permissionLevels) {
          const permissionOption = page.locator(`text=/${level}/i`).first();
          if (await permissionOption.isVisible()) {
            console.log(`Permission level available: ${level}`);
          }
        }
        
        await takeScreenshot(page, 'workspace-22-permission-levels');
      }
    });

    // Test 12: Workspace list
    await test.step('Browse saved workspaces', async () => {
      // Navigate to workspace list if available
      const workspaceListButton = page.locator('button:has-text("My Workspaces"), button:has-text("Browse")').first();
      
      if (await workspaceListButton.isVisible()) {
        await clickWithScreenshot(page, workspaceListButton, 'workspace-23-list-button');
        
        // Check for saved workspaces
        const savedWorkspaces = page.locator('[data-testid="saved-workspace"]');
        if (await savedWorkspaces.first().isVisible()) {
          await takeScreenshot(page, 'workspace-24-saved-workspaces');
          
          const workspaceCount = await savedWorkspaces.count();
          console.log(`Found ${workspaceCount} saved workspaces`);
        }
      }
    });
  });

  test('Responsive design for workspace', async ({ page }) => {
    console.log('📱 Testing responsive design for workspace');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/workspace');
      await waitForAnimation(page);
      
      await takeScreenshot(page, `workspace-responsive-${viewport.name}`);
      
      // Verify layout adjustments
      if (viewport.name === 'mobile') {
        // Sidebar should be collapsible on mobile
        const sidebar = page.locator('[class*="w-64"]').first();
        const sidebarBox = await sidebar.boundingBox();
        
        // On mobile, sidebar might be hidden or overlayed
        if (sidebarBox && sidebarBox.width > viewport.width * 0.8) {
          console.log('Sidebar takes full width on mobile');
        }
      }
    }
  });

  test('Keyboard navigation and shortcuts', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation');
    
    // Add documents first
    const firstDocument = page.locator('div[class*="cursor-pointer"]').first();
    if (await firstDocument.isVisible()) {
      await firstDocument.click();
    }
    
    await testKeyboardNavigation(page, [
      { key: 'Tab', expectedFocus: 'button, [class*="cursor-pointer"]' },
      { key: 'Control+S', expectedAction: 'save workspace' },
      { key: 'Control+W', expectedAction: 'close document' },
      { key: 'Control+Tab', expectedAction: 'switch tabs' }
    ], 'workspace-keyboard');
  });

  test('Multi-user collaboration simulation', async ({ page, context }) => {
    console.log('👥 Testing multi-user collaboration');
    
    // Open second page to simulate another user
    const page2 = await context.newPage();
    await loginUser(page2, TEST_USERS.secondary);
    await page2.goto('/dashboard/workspace');
    
    // Both users add documents
    const doc1 = page.locator('div[class*="cursor-pointer"]').first();
    const doc2 = page2.locator('div[class*="cursor-pointer"]').first();
    
    if (await doc1.isVisible() && await doc2.isVisible()) {
      await doc1.click();
      await doc2.click();
      
      await takeScreenshot(page, 'workspace-25-user1-view');
      await takeScreenshot(page2, 'workspace-26-user2-view');
    }
    
    await page2.close();
  });

  test('Performance with multiple documents', async ({ page }) => {
    console.log('⚡ Testing performance with multiple documents');
    
    // Add multiple documents
    const documents = page.locator('div[class*="cursor-pointer"]');
    const docCount = Math.min(await documents.count(), 4);
    
    const startTime = Date.now();
    for (let i = 0; i < docCount; i++) {
      await documents.nth(i).click();
      await page.waitForTimeout(100);
    }
    const loadTime = Date.now() - startTime;
    
    console.log(`Time to load ${docCount} documents: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000); // Should load quickly
    
    // Test scrolling performance
    const scrollStart = Date.now();
    await page.mouse.wheel(0, 500);
    const scrollTime = Date.now() - scrollStart;
    
    console.log(`Scroll response time: ${scrollTime}ms`);
    expect(scrollTime).toBeLessThan(100);
  });

  test('Error handling', async ({ page }) => {
    console.log('❌ Testing error handling');
    
    // Simulate network failure
    await page.route('**/api/document-workspaces/**', route => route.abort());
    
    const saveButton = page.locator('button:has-text("Save Workspace")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Check for error message
      const errorMessage = await page.waitForSelector('text=/error|failed|unable/i', { timeout: 5000 }).catch(() => null);
      if (errorMessage) {
        await takeScreenshot(page, 'workspace-27-error-state');
      }
    }
    
    // Restore network
    await page.unroute('**/api/document-workspaces/**');
  });

  test('Document comparison mode', async ({ page }) => {
    console.log('🔄 Testing document comparison');
    
    // Add two documents
    const documents = page.locator('div[class*="cursor-pointer"]');
    if (await documents.first().isVisible()) {
      await documents.nth(0).click();
      await documents.nth(1).click();
      
      // Switch to split view
      const splitButton = page.locator('button:has([class*="ViewColumnsIcon"])').first();
      await splitButton.click();
      
      await takeScreenshot(page, 'workspace-28-comparison-mode');
      
      // Test synchronized scrolling for comparison
      const syncButton = page.locator('text=/Sync Scrolling/i').locator('..');
      await syncButton.click();
      
      // Scroll first document
      const firstDoc = page.locator('[class*="prose"]').first();
      await firstDoc.hover();
      await page.mouse.wheel(0, 300);
      
      await takeScreenshot(page, 'workspace-29-synchronized-comparison');
    }
  });
});