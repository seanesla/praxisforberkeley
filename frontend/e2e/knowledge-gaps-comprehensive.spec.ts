import { test, expect } from '@playwright/test';
import { authenticateUser, createTestUser, deleteTestUser } from './helpers/auth-helpers';
import { uploadTestDocument, waitForToast, waitForLoadingComplete, takeScreenshot } from './helpers/test-helpers';

test.describe('Knowledge Gap Analysis - Comprehensive Tests', () => {
  let testEmail: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    // Create unique test user
    const timestamp = Date.now();
    testEmail = `test.knowledge.${timestamp}@example.com`;
    testPassword = 'TestPass123!';
    
    await createTestUser(testEmail, testPassword);
    await authenticateUser(page, testEmail, testPassword);
    
    // Upload multiple test documents for analysis
    const documents = [
      {
        name: 'calculus-basics.txt',
        content: `
        Introduction to Calculus
        
        Calculus is the mathematical study of continuous change. It has two major branches:
        1. Differential calculus - concerning rates of change and slopes of curves
        2. Integral calculus - concerning accumulation of quantities and areas under curves
        
        Key concepts include:
        - Limits: The foundation of calculus
        - Derivatives: Rate of change of a function
        - Integrals: Accumulation of quantities
        - Fundamental Theorem of Calculus: Links derivatives and integrals
        `
      },
      {
        name: 'advanced-calculus.txt',
        content: `
        Advanced Calculus Topics
        
        Building on basic calculus:
        - Multivariable calculus: Functions of several variables
        - Vector calculus: Calculus of vector fields
        - Differential equations: Equations involving derivatives
        - Series and sequences: Infinite sums and patterns
        - Taylor series: Representing functions as infinite polynomials
        
        Applications include physics, engineering, economics, and more.
        `
      },
      {
        name: 'linear-algebra.txt',
        content: `
        Linear Algebra Fundamentals
        
        Linear algebra is the study of linear equations and their representations:
        - Vectors and vector spaces
        - Matrices and matrix operations
        - Systems of linear equations
        - Eigenvalues and eigenvectors
        - Linear transformations
        
        Prerequisites: Basic algebra and some familiarity with proofs
        `
      }
    ];
    
    for (const doc of documents) {
      await uploadTestDocument(page, doc.name, doc.content);
      await page.waitForTimeout(500); // Brief pause between uploads
    }
  });

  test.afterEach(async () => {
    await deleteTestUser(testEmail);
  });

  test('Complete knowledge gap analysis workflow', async ({ page }) => {
    await test.step('Navigate to knowledge gaps page', async () => {
      await page.goto('/knowledge-gaps');
      await expect(page).toHaveTitle(/Knowledge Gap Analysis/);
      await takeScreenshot(page, 'knowledge-gaps-01-main-page');
    });

    await test.step('Select documents for analysis', async () => {
      // Check initial state
      await expect(page.getByText('Select Documents to Analyze')).toBeVisible();
      await expect(page.getByText('Choose documents to identify knowledge gaps')).toBeVisible();
      
      // Select multiple documents
      const documents = ['calculus-basics.txt', 'advanced-calculus.txt', 'linear-algebra.txt'];
      
      for (const doc of documents) {
        const checkbox = page.getByRole('checkbox', { name: doc });
        await checkbox.click();
        await expect(checkbox).toBeChecked();
      }
      
      await expect(page.getByText('3 documents selected')).toBeVisible();
      await takeScreenshot(page, 'knowledge-gaps-02-document-selection');
    });

    await test.step('Start knowledge gap analysis', async () => {
      await page.getByRole('button', { name: 'Start Analysis' }).click();
      
      // Check progress indicators
      await expect(page.getByText('Analyzing documents...')).toBeVisible();
      await expect(page.getByRole('progressbar')).toBeVisible();
      
      // Wait for analysis steps
      const steps = [
        'Extracting concepts',
        'Identifying prerequisites',
        'Detecting gaps',
        'Generating learning paths'
      ];
      
      for (const step of steps) {
        await expect(page.getByText(step)).toBeVisible({ timeout: 30000 });
      }
      
      await waitForLoadingComplete(page);
      await takeScreenshot(page, 'knowledge-gaps-03-analysis-complete');
    });

    await test.step('Review detected knowledge gaps', async () => {
      // Check gap cards are displayed
      await expect(page.getByText('Knowledge Gaps Detected')).toBeVisible();
      
      // Verify different gap types
      const gapTypes = ['prerequisite', 'conceptual', 'application'];
      for (const type of gapTypes) {
        const gapCard = page.locator(`.glass-card:has-text("${type} gap")`).first();
        if (await gapCard.isVisible()) {
          await gapCard.click();
          
          // Check gap details
          await expect(page.getByText('Gap Details')).toBeVisible();
          await expect(page.getByText('Severity:')).toBeVisible();
          await expect(page.getByText('Resources:')).toBeVisible();
          
          await takeScreenshot(page, `knowledge-gaps-04-${type}-gap-details`);
        }
      }
    });

    await test.step('Generate and view learning path', async () => {
      // Click on a critical gap
      const criticalGap = page.locator('.glass-card').filter({ hasText: 'critical' }).first();
      await criticalGap.click();
      
      // Generate learning path
      await page.getByRole('button', { name: 'Generate Learning Path' }).click();
      await waitForLoadingComplete(page);
      
      // Check learning path visualization
      await expect(page.getByText('Your Learning Path')).toBeVisible();
      await expect(page.locator('.learning-path-node')).toHaveCount(3, { timeout: 10000 });
      
      // Check path details
      const firstNode = page.locator('.learning-path-node').first();
      await firstNode.click();
      
      await expect(page.getByText('Estimated time:')).toBeVisible();
      await expect(page.getByText('Resources:')).toBeVisible();
      
      await takeScreenshot(page, 'knowledge-gaps-05-learning-path');
    });

    await test.step('Test interactive features', async () => {
      // Test gap filtering
      await page.getByRole('button', { name: 'Filter Gaps' }).click();
      await page.getByLabel('Severity').selectOption('critical');
      await page.getByRole('button', { name: 'Apply' }).click();
      
      // Verify filtered results
      const gaps = await page.locator('.glass-card[data-severity]').all();
      for (const gap of gaps) {
        const severity = await gap.getAttribute('data-severity');
        expect(severity).toBe('critical');
      }
      
      // Test sorting
      await page.getByRole('button', { name: 'Sort by' }).click();
      await page.getByRole('option', { name: 'Severity (High to Low)' }).click();
      
      await takeScreenshot(page, 'knowledge-gaps-06-filtered-sorted');
    });

    await test.step('Export learning plan', async () => {
      // Export as PDF
      await page.getByRole('button', { name: 'Export Plan' }).click();
      await page.getByRole('option', { name: 'Export as PDF' }).click();
      
      // Wait for download
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download' }).click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('learning-path');
      expect(download.suggestedFilename()).toEndWith('.pdf');
    });
  });

  test('Knowledge gap visualization and insights', async ({ page }) => {
    await page.goto('/knowledge-gaps');
    
    await test.step('Analyze and view concept map', async () => {
      // Quick analysis with fewer documents
      await page.getByRole('checkbox', { name: 'calculus-basics.txt' }).click();
      await page.getByRole('checkbox', { name: 'advanced-calculus.txt' }).click();
      await page.getByRole('button', { name: 'Start Analysis' }).click();
      
      await waitForLoadingComplete(page);
      
      // View concept map
      await page.getByRole('tab', { name: 'Concept Map' }).click();
      
      // Check visualization elements
      await expect(page.locator('svg.concept-map')).toBeVisible();
      await expect(page.locator('.concept-node')).toHaveCount(5, { timeout: 10000 });
      await expect(page.locator('.concept-link')).toBeVisible();
      
      // Interact with nodes
      const conceptNode = page.locator('.concept-node').first();
      await conceptNode.hover();
      await expect(page.getByRole('tooltip')).toBeVisible();
      
      await takeScreenshot(page, 'knowledge-gaps-07-concept-map');
    });

    await test.step('View gap insights', async () => {
      await page.getByRole('tab', { name: 'Insights' }).click();
      
      // Check insights sections
      await expect(page.getByText('Key Findings')).toBeVisible();
      await expect(page.getByText('Learning Recommendations')).toBeVisible();
      await expect(page.getByText('Prerequisite Chain')).toBeVisible();
      
      // Check metrics
      await expect(page.getByText(/Total gaps identified:/)).toBeVisible();
      await expect(page.getByText(/Critical gaps:/)).toBeVisible();
      await expect(page.getByText(/Estimated study time:/)).toBeVisible();
      
      await takeScreenshot(page, 'knowledge-gaps-08-insights');
    });
  });

  test('Accessibility and keyboard navigation', async ({ page }) => {
    await page.goto('/knowledge-gaps');
    
    await test.step('Keyboard navigation through gaps', async () => {
      // Quick analysis
      await page.getByRole('checkbox', { name: 'calculus-basics.txt' }).click();
      await page.getByRole('button', { name: 'Start Analysis' }).click();
      await waitForLoadingComplete(page);
      
      // Tab through gap cards
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Select gap with keyboard
      await page.keyboard.press('Enter');
      await expect(page.getByText('Gap Details')).toBeVisible();
      
      // Check ARIA labels
      const gapCards = await page.locator('[role="button"][aria-label*="gap"]').all();
      expect(gapCards.length).toBeGreaterThan(0);
      
      for (const card of gapCards) {
        const ariaLabel = await card.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/gap.*severity/);
      }
    });

    await test.step('Screen reader announcements', async () => {
      // Check live regions
      const liveRegions = await page.locator('[aria-live]').all();
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Check form labels
      const inputs = await page.locator('input, select').all();
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          expect(label).toBeGreaterThan(0);
        }
      }
    });
  });

  test('Error handling and edge cases', async ({ page }) => {
    await test.step('No documents selected', async () => {
      await page.goto('/knowledge-gaps');
      await page.getByRole('button', { name: 'Start Analysis' }).click();
      
      await expect(page.getByText(/select at least one document/i)).toBeVisible();
      await takeScreenshot(page, 'knowledge-gaps-09-no-documents-error');
    });

    await test.step('Empty analysis results', async () => {
      // Upload a document with no learnable content
      await uploadTestDocument(page, 'empty-content.txt', 'This document has no educational content.');
      
      await page.goto('/knowledge-gaps');
      await page.getByRole('checkbox', { name: 'empty-content.txt' }).click();
      await page.getByRole('button', { name: 'Start Analysis' }).click();
      
      await waitForLoadingComplete(page);
      
      await expect(page.getByText(/No knowledge gaps detected/i)).toBeVisible();
      await takeScreenshot(page, 'knowledge-gaps-10-no-gaps');
    });

    await test.step('Network error handling', async () => {
      await page.goto('/knowledge-gaps');
      await page.getByRole('checkbox').first().click();
      
      // Go offline
      await page.context().setOffline(true);
      await page.getByRole('button', { name: 'Start Analysis' }).click();
      
      await expect(page.getByText(/error|failed|offline/i)).toBeVisible({ timeout: 10000 });
      await takeScreenshot(page, 'knowledge-gaps-11-network-error');
      
      await page.context().setOffline(false);
    });
  });

  test('Responsive design', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];

    // Perform quick analysis first
    await page.goto('/knowledge-gaps');
    await page.getByRole('checkbox').first().click();
    await page.getByRole('button', { name: 'Start Analysis' }).click();
    await waitForLoadingComplete(page);

    for (const viewport of viewports) {
      await test.step(`Test ${viewport.name} viewport`, async () => {
        await page.setViewportSize(viewport);
        
        // Check layout adapts
        if (viewport.name === 'mobile') {
          // Mobile should have stacked cards
          const cards = await page.locator('.glass-card').all();
          for (const card of cards.slice(0, 2)) {
            const box = await card.boundingBox();
            expect(box?.width).toBeLessThan(viewport.width - 40);
          }
        }
        
        // Check navigation remains accessible
        await expect(page.getByRole('navigation')).toBeVisible();
        
        await takeScreenshot(page, `knowledge-gaps-12-${viewport.name}`);
      });
    }
  });
});