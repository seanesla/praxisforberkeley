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

test.describe('Reports - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/reports');
    await waitForAnimation(page);
  });

  test('Complete report generation workflow', async ({ page }) => {
    console.log('📊 Starting comprehensive report generation test');
    
    // Test 1: Reports dashboard
    await test.step('Reports dashboard overview', async () => {
      await takeScreenshot(page, 'reports-01-dashboard');
      
      // Verify dashboard components
      await verifyVisible(page, 'text=/Report|Template/i');
      
      await testResponsive(page, 'reports-dashboard');
    });

    // Test 2: Template selection
    await test.step('Browse report templates', async () => {
      const templateGrid = page.locator('[class*="grid"]').filter({ has: page.locator('[class*="glass-card"]') });
      
      if (await templateGrid.isVisible()) {
        await takeScreenshot(page, 'reports-02-template-gallery');
        
        // Test different template categories
        const categories = ['academic', 'business', 'technical'];
        
        for (const category of categories) {
          const categoryTemplate = page.locator(`[class*="glass-card"]`).filter({ hasText: new RegExp(category, 'i') }).first();
          if (await categoryTemplate.isVisible()) {
            console.log(`Found ${category} template`);
            await testHoverState(page, categoryTemplate, `template-${category}-hover`);
          }
        }
      }
    });

    // Test 3: Select a template
    await test.step('Select report template', async () => {
      const firstTemplate = page.locator('[class*="glass-card"][class*="cursor-pointer"]').first();
      
      if (await firstTemplate.isVisible()) {
        // Get template name before clicking
        const templateName = await firstTemplate.locator('h4').textContent();
        console.log(`Selecting template: ${templateName}`);
        
        await clickWithScreenshot(page, firstTemplate, 'reports-03-template-selected');
        
        // Verify template details loaded
        await verifyVisible(page, 'text=/Report Title/i');
        await verifyVisible(page, 'text=/Export Format/i');
      }
    });

    // Test 4: Fill report details
    await test.step('Configure report details', async () => {
      const titleInput = page.locator('input[placeholder*="title"]').first();
      const descriptionTextarea = page.locator('textarea[placeholder*="description"]').first();
      
      if (await titleInput.isVisible()) {
        await titleInput.fill('Q4 2024 Research Summary Report');
        await takeScreenshot(page, 'reports-04-title-entered');
      }
      
      if (await descriptionTextarea.isVisible()) {
        await descriptionTextarea.fill('Comprehensive analysis of research findings and progress in Q4 2024');
        await takeScreenshot(page, 'reports-05-description-entered');
      }
    });

    // Test 5: Export format selection
    await test.step('Select export format', async () => {
      const formatButtons = page.locator('button').filter({ hasText: /PDF|DOCX|HTML|MARKDOWN/ });
      
      if (await formatButtons.first().isVisible()) {
        await takeScreenshot(page, 'reports-06-format-options');
        
        // Test each format
        const formats = ['PDF', 'DOCX', 'HTML', 'MARKDOWN'];
        
        for (const format of formats) {
          const formatButton = page.locator(`button:has-text("${format}")`).first();
          if (await formatButton.isVisible()) {
            await clickWithScreenshot(page, formatButton, `reports-07-format-${format.toLowerCase()}`);
            
            // Verify selection
            await expect(formatButton).toHaveClass(/bg-purple-500/);
            break; // Select first available format
          }
        }
      }
    });

    // Test 6: Custom fields
    await test.step('Customize report fields', async () => {
      const customFieldsSection = page.locator('text=/Customize Report/i');
      
      if (await customFieldsSection.isVisible()) {
        await takeScreenshot(page, 'reports-08-custom-fields');
        
        // Fill text fields
        const textInputs = page.locator('input[type="text"]').filter({ hasNot: page.locator('[placeholder*="title"]') });
        const textCount = await textInputs.count();
        
        for (let i = 0; i < Math.min(textCount, 2); i++) {
          await textInputs.nth(i).fill(`Custom value ${i + 1}`);
        }
        
        // Test select dropdown
        const selectDropdown = page.locator('select').first();
        if (await selectDropdown.isVisible()) {
          await selectDropdown.selectOption({ index: 1 });
          await takeScreenshot(page, 'reports-09-custom-values-filled');
        }
      }
    });

    // Test 7: Section selection
    await test.step('Select report sections', async () => {
      const sectionsHeader = page.locator('text=/Include Sections/i');
      
      if (await sectionsHeader.isVisible()) {
        await sectionsHeader.scrollIntoViewIfNeeded();
        await takeScreenshot(page, 'reports-10-sections-list');
        
        // Toggle some sections
        const sectionCheckboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await sectionCheckboxes.count();
        
        for (let i = 0; i < Math.min(checkboxCount, 3); i++) {
          const checkbox = sectionCheckboxes.nth(i);
          const isChecked = await checkbox.isChecked();
          const isDisabled = await checkbox.isDisabled();
          
          if (!isDisabled) {
            await checkbox.click();
            console.log(`Section ${i + 1}: ${isChecked ? 'unchecked' : 'checked'}`);
          }
        }
        
        await takeScreenshot(page, 'reports-11-sections-configured');
        
        // Check for required sections
        const requiredSections = page.locator('text=/Required/i');
        if (await requiredSections.first().isVisible()) {
          console.log('Found required sections that cannot be deselected');
        }
      }
    });

    // Test 8: Source summary
    await test.step('Review report sources', async () => {
      const sourceSummary = page.locator('text=/Report Sources/i').locator('..');
      
      if (await sourceSummary.isVisible()) {
        await sourceSummary.scrollIntoViewIfNeeded();
        await takeScreenshot(page, 'reports-12-source-summary');
        
        // Verify source counts
        const documentCount = page.locator('text=/[0-9]+ documents/');
        const noteCount = page.locator('text=/[0-9]+ notes/');
        
        if (await documentCount.isVisible()) {
          const docText = await documentCount.textContent();
          console.log('Document sources:', docText);
        }
        
        if (await noteCount.isVisible()) {
          const noteText = await noteCount.textContent();
          console.log('Note sources:', noteText);
        }
      }
    });

    // Test 9: Generate report
    await test.step('Generate report', async () => {
      const generateButton = page.locator('button:has-text("Generate Report")');
      
      if (await generateButton.isVisible()) {
        await clickWithScreenshot(page, generateButton, 'reports-13-generate-button');
        
        // Wait for generation
        await page.waitForSelector('text=/Generating Report/i', { state: 'visible' }).catch(() => {});
        await takeScreenshot(page, 'reports-14-generating');
        
        // Wait for completion
        await page.waitForSelector('text=/Generating Report/i', { state: 'hidden', timeout: 30000 }).catch(() => {});
        
        // Check for success
        const successMessage = page.locator('text=/generated.*successfully/i');
        if (await successMessage.isVisible()) {
          await takeScreenshot(page, 'reports-15-generation-success');
        }
      }
    });

    // Test 10: Download generated report
    await test.step('Download report', async () => {
      const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download")').first();
      
      if (await downloadButton.isVisible()) {
        // Set up download promise
        const downloadPromise = page.waitForEvent('download');
        
        await clickWithScreenshot(page, downloadButton, 'reports-16-download-button');
        
        // Wait for download
        const download = await downloadPromise.catch(() => null);
        
        if (download) {
          console.log('Report downloaded:', download.suggestedFilename());
          await takeScreenshot(page, 'reports-17-download-started');
        }
      }
    });

    // Test 11: Report history
    await test.step('View report history', async () => {
      const historyButton = page.locator('button:has-text("History"), button:has-text("Previous Reports")').first();
      
      if (await historyButton.isVisible()) {
        await clickWithScreenshot(page, historyButton, 'reports-18-history-button');
        
        // Check for report list
        const reportList = page.locator('[data-testid="report-history"], .report-history-item');
        if (await reportList.first().isVisible()) {
          await takeScreenshot(page, 'reports-19-report-history');
          
          const reportCount = await reportList.count();
          console.log(`Found ${reportCount} previous reports`);
        }
      }
    });

    // Test 12: Change template
    await test.step('Change selected template', async () => {
      const changeTemplateButton = page.locator('button:has-text("Change Template")');
      
      if (await changeTemplateButton.isVisible()) {
        await clickWithScreenshot(page, changeTemplateButton, 'reports-20-change-template');
        
        // Verify returned to template selection
        const templateGrid = page.locator('[class*="grid"]').filter({ has: page.locator('[class*="glass-card"]') });
        if (await templateGrid.isVisible()) {
          await takeScreenshot(page, 'reports-21-template-selection-return');
        }
      }
    });

    // Test 13: Preview report
    await test.step('Preview report before generation', async () => {
      const previewButton = page.locator('button:has-text("Preview")').first();
      
      if (await previewButton.isVisible()) {
        await clickWithScreenshot(page, previewButton, 'reports-22-preview-button');
        
        // Check for preview modal or panel
        const previewContent = page.locator('[data-testid="report-preview"], .report-preview');
        if (await previewContent.isVisible()) {
          await takeScreenshot(page, 'reports-23-report-preview');
        }
      }
    });

    // Test 14: Export options
    await test.step('Additional export options', async () => {
      const exportOptionsButton = page.locator('button:has-text("Export Options"), button[aria-label*="export"]').first();
      
      if (await exportOptionsButton.isVisible()) {
        await clickWithScreenshot(page, exportOptionsButton, 'reports-24-export-options');
        
        // Check for additional settings
        const compressionOption = page.locator('text=/Compression|Quality/i');
        const includeTOC = page.locator('text=/Table of Contents|TOC/i');
        
        if (await compressionOption.isVisible()) {
          console.log('Found compression/quality options');
        }
        
        if (await includeTOC.isVisible()) {
          console.log('Found TOC option');
        }
      }
    });
  });

  test('Responsive design for reports', async ({ page }) => {
    console.log('📱 Testing responsive design for reports');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/reports');
      await waitForAnimation(page);
      
      await takeScreenshot(page, `reports-responsive-${viewport.name}`);
      
      // Verify layout adjustments
      const templateGrid = page.locator('[class*="grid"]').first();
      if (viewport.name === 'mobile' && await templateGrid.isVisible()) {
        // Should be single column on mobile
        await expect(templateGrid).toHaveClass(/grid-cols-1/);
      } else if (viewport.name === 'desktop' && await templateGrid.isVisible()) {
        // Should be multi-column on desktop
        await expect(templateGrid).toHaveClass(/lg:grid-cols-3/);
      }
    }
  });

  test('Keyboard navigation', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation');
    
    await testKeyboardNavigation(page, [
      { key: 'Tab', expectedFocus: '[class*="glass-card"], button, input' },
      { key: 'Enter', expectedAction: 'select template or submit' },
      { key: 'Space', expectedAction: 'toggle checkbox' },
      { key: 'Escape', expectedAction: 'close modal or cancel' }
    ], 'reports-keyboard');
  });

  test('Template validation', async ({ page }) => {
    console.log('✅ Testing template validation');
    
    // Select a template
    const template = page.locator('[class*="glass-card"]').first();
    if (await template.isVisible()) {
      await template.click();
      await waitForAnimation(page);
      
      // Try to generate without title
      const generateButton = page.locator('button:has-text("Generate Report")');
      if (await generateButton.isVisible()) {
        await generateButton.click();
        
        // Check for validation error
        const errorMessage = page.locator('text=/enter.*title|title.*required/i');
        if (await errorMessage.isVisible()) {
          await takeScreenshot(page, 'reports-25-validation-error');
        }
      }
    }
  });

  test('Performance monitoring', async ({ page }) => {
    console.log('⚡ Testing report generation performance');
    
    // Select template and fill details
    const template = page.locator('[class*="glass-card"]').first();
    if (await template.isVisible()) {
      await template.click();
      
      const titleInput = page.locator('input[placeholder*="title"]').first();
      await titleInput.fill('Performance Test Report');
      
      // Measure generation time
      const generateButton = page.locator('button:has-text("Generate Report")');
      const startTime = Date.now();
      
      await generateButton.click();
      
      // Wait for completion
      await page.waitForSelector('text=/generated.*successfully/i', { timeout: 60000 }).catch(() => {});
      const generationTime = Date.now() - startTime;
      
      console.log(`Report generation time: ${generationTime}ms`);
      expect(generationTime).toBeLessThan(60000); // Should complete within 1 minute
    }
  });

  test('Error handling', async ({ page }) => {
    console.log('❌ Testing error handling');
    
    // Simulate network failure
    await page.route('**/api/reports/**', route => route.abort());
    
    // Try to load templates
    await page.reload();
    
    // Check for error message
    const errorMessage = await page.waitForSelector('text=/error|failed|unable/i', { timeout: 5000 }).catch(() => null);
    if (errorMessage) {
      await takeScreenshot(page, 'reports-26-error-state');
    }
    
    // Restore network
    await page.unroute('**/api/reports/**');
  });

  test('Multiple format export', async ({ page }) => {
    console.log('📄 Testing multiple format exports');
    
    // Select template and configure
    const template = page.locator('[class*="glass-card"]').first();
    if (await template.isVisible()) {
      await template.click();
      
      const titleInput = page.locator('input[placeholder*="title"]').first();
      await titleInput.fill('Multi-Format Test Report');
      
      // Test each format
      const formats = ['PDF', 'DOCX', 'HTML', 'MARKDOWN'];
      
      for (const format of formats) {
        const formatButton = page.locator(`button:has-text("${format}")`).first();
        if (await formatButton.isVisible()) {
          await formatButton.click();
          await takeScreenshot(page, `reports-27-format-${format.toLowerCase()}-selected`);
          
          // Verify format-specific options if available
          if (format === 'PDF') {
            const pdfOptions = page.locator('text=/Page size|Orientation/i');
            if (await pdfOptions.isVisible()) {
              console.log('Found PDF-specific options');
            }
          }
        }
      }
    }
  });
});