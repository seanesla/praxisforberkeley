import { test, expect } from '@playwright/test';
import { authenticateUser, createTestUser, deleteTestUser } from './helpers/auth-helpers';
import { uploadTestDocument, waitForToast, waitForLoadingComplete } from './helpers/test-helpers';

test.describe('Interactive Exercise Engine - Comprehensive Tests', () => {
  let testEmail: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    // Create unique test user
    const timestamp = Date.now();
    testEmail = `test.exercises.${timestamp}@example.com`;
    testPassword = 'TestPass123!';
    
    await createTestUser(testEmail, testPassword);
    await authenticateUser(page, testEmail, testPassword);
    
    // Upload test document for exercise generation
    await uploadTestDocument(
      page,
      'biology-basics.txt',
      `
      Chapter 1: Cell Biology Basics
      
      The cell is the basic unit of life. All living organisms are composed of one or more cells.
      
      There are two main types of cells:
      1. Prokaryotic cells - lack a nucleus and membrane-bound organelles (bacteria)
      2. Eukaryotic cells - have a nucleus and membrane-bound organelles (plants, animals, fungi)
      
      Key cell components:
      - Cell membrane: Controls what enters and exits the cell
      - Nucleus: Contains genetic material (DNA)
      - Mitochondria: Powerhouse of the cell, produces ATP
      - Ribosomes: Protein synthesis
      - Endoplasmic reticulum: Protein and lipid synthesis
      - Golgi apparatus: Modifies and packages proteins
      
      Cell division occurs through:
      - Mitosis: Division of somatic cells, produces two identical daughter cells
      - Meiosis: Division of sex cells, produces four haploid gametes
      `
    );
  });

  test.afterEach(async () => {
    await deleteTestUser(testEmail);
  });

  test('Complete exercise generation and practice workflow', async ({ page }) => {
    await test.step('Navigate to exercises page', async () => {
      await page.goto('/exercises');
      await expect(page).toHaveTitle(/Interactive Exercises/);
      await page.screenshot({ path: 'screenshots/exercises-01-main-page.png', fullPage: true });
    });

    await test.step('Generate exercises from document', async () => {
      // Switch to generate tab
      await page.getByRole('tab', { name: 'Generate' }).click();
      
      // Select document
      await page.getByRole('button', { name: 'Select Document' }).click();
      await page.getByText('biology-basics.txt').click();
      
      // Configure exercise types
      await expect(page.getByText('Select Exercise Types')).toBeVisible();
      
      // Select multiple exercise types with keyboard navigation
      const exerciseTypes = [
        'Multiple Choice',
        'Fill in the Blank',
        'True/False',
        'Short Answer'
      ];
      
      for (const type of exerciseTypes) {
        const typeElement = page.getByText(type, { exact: true }).locator('..');
        await typeElement.click();
        await expect(typeElement).toHaveClass(/border-purple-500/);
      }
      
      await page.screenshot({ path: 'screenshots/exercises-02-type-selection.png' });
      
      // Set difficulty and count
      await page.getByLabel('Difficulty').selectOption('medium');
      await page.getByLabel('Number of exercises').fill('12');
      
      // Generate exercises
      await page.getByRole('button', { name: 'Generate Exercises' }).click();
      await waitForLoadingComplete(page);
      await waitForToast(page, 'Exercises generated successfully');
      
      await page.screenshot({ path: 'screenshots/exercises-03-generated.png', fullPage: true });
    });

    await test.step('Practice multiple choice questions', async () => {
      // Switch to practice tab
      await page.getByRole('tab', { name: 'Practice' }).click();
      
      // Filter by type
      await page.getByRole('button', { name: 'Filter' }).click();
      await page.getByLabel('Exercise Type').selectOption('multiple_choice');
      await page.getByRole('button', { name: 'Apply Filters' }).click();
      
      // Start practice session
      await page.getByRole('button', { name: 'Start Practice' }).first().click();
      
      await expect(page.getByText('Question 1 of')).toBeVisible();
      await page.screenshot({ path: 'screenshots/exercises-04-multiple-choice.png' });
      
      // Answer question
      const options = await page.getByRole('radio').all();
      expect(options.length).toBeGreaterThanOrEqual(4);
      
      // Select an answer
      await options[0].click();
      await page.getByRole('button', { name: 'Submit Answer' }).click();
      
      // Check feedback
      await expect(page.getByText(/Correct|Incorrect/)).toBeVisible();
      await page.screenshot({ path: 'screenshots/exercises-05-feedback.png' });
      
      // Continue to next question
      await page.getByRole('button', { name: 'Next Question' }).click();
    });

    await test.step('Practice fill in the blank', async () => {
      // Complete current session first
      await page.getByRole('button', { name: 'Exit Session' }).click();
      
      // Filter for fill in the blank
      await page.getByRole('button', { name: 'Filter' }).click();
      await page.getByLabel('Exercise Type').selectOption('fill_blank');
      await page.getByRole('button', { name: 'Apply Filters' }).click();
      
      // Start new session
      await page.getByRole('button', { name: 'Start Practice' }).first().click();
      
      // Fill in the blank
      const input = page.getByRole('textbox', { name: /answer|blank/i });
      await input.fill('mitochondria');
      
      await page.screenshot({ path: 'screenshots/exercises-06-fill-blank.png' });
      
      await page.getByRole('button', { name: 'Submit Answer' }).click();
      await expect(page.getByText(/Correct|Incorrect/)).toBeVisible();
    });

    await test.step('Check practice statistics', async () => {
      // Exit current session
      await page.getByRole('button', { name: 'Exit Session' }).click();
      
      // View statistics
      await expect(page.getByText('Practice Statistics')).toBeVisible();
      await expect(page.getByText(/Total Attempted:/)).toBeVisible();
      await expect(page.getByText(/Accuracy:/)).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/exercises-07-statistics.png', fullPage: true });
    });

    await test.step('Test accessibility features', async () => {
      // Check exercise type selection accessibility
      await page.getByRole('tab', { name: 'Generate' }).click();
      
      // Keyboard navigation through exercise types
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space'); // Select with keyboard
      
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const ariaLabel = await focusedElement.evaluate(el => el.getAttribute('aria-label'));
      expect(ariaLabel).toContain('exercise type');
      
      // Check ARIA labels on form elements
      const difficultySelect = page.getByLabel('Difficulty');
      await expect(difficultySelect).toHaveAttribute('aria-required', 'true');
    });
  });

  test('Exercise type variations', async ({ page }) => {
    await page.goto('/exercises');
    await page.getByRole('tab', { name: 'Generate' }).click();
    
    await test.step('True/False questions', async () => {
      // Generate only true/false
      await page.getByText('True/False').locator('..').click();
      await page.getByRole('button', { name: 'Generate Exercises' }).click();
      await waitForLoadingComplete(page);
      
      // Practice
      await page.getByRole('tab', { name: 'Practice' }).click();
      await page.getByRole('button', { name: 'Start Practice' }).first().click();
      
      // Check for True/False buttons
      await expect(page.getByRole('button', { name: 'True' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'False' })).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/exercises-08-true-false.png' });
    });

    await test.step('Matching exercises', async () => {
      // Generate matching exercises
      await page.goto('/exercises');
      await page.getByRole('tab', { name: 'Generate' }).click();
      await page.getByText('Matching').locator('..').click();
      await page.getByRole('button', { name: 'Generate Exercises' }).click();
      await waitForLoadingComplete(page);
      
      // Practice matching
      await page.getByRole('tab', { name: 'Practice' }).click();
      await page.getByRole('button', { name: 'Start Practice' }).first().click();
      
      // Check for drag and drop interface
      await expect(page.getByText('Match the items')).toBeVisible();
      await page.screenshot({ path: 'screenshots/exercises-09-matching.png' });
    });
  });

  test('Performance and error handling', async ({ page }) => {
    await test.step('Handle generation errors', async () => {
      await page.goto('/exercises');
      await page.getByRole('tab', { name: 'Generate' }).click();
      
      // Try to generate without selecting document
      await page.getByRole('button', { name: 'Generate Exercises' }).click();
      await expect(page.getByText(/select.*document/i)).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/exercises-10-validation-error.png' });
    });

    await test.step('Handle network errors', async () => {
      // Go offline
      await page.context().setOffline(true);
      await page.goto('/exercises');
      
      await expect(page.getByText(/offline|error|failed/i)).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'screenshots/exercises-11-offline.png' });
      
      await page.context().setOffline(false);
    });

    await test.step('Test with large exercise sets', async () => {
      await page.goto('/exercises');
      await page.getByRole('tab', { name: 'Generate' }).click();
      
      // Generate maximum exercises
      await page.getByLabel('Number of exercises').fill('50');
      await page.getByRole('button', { name: 'Generate Exercises' }).click();
      
      // Check pagination
      await waitForLoadingComplete(page);
      await page.getByRole('tab', { name: 'Practice' }).click();
      
      await expect(page.getByText(/Page 1/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible();
    });
  });

  test('Responsive design', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      await test.step(`Test ${viewport.name} viewport`, async () => {
        await page.setViewportSize(viewport);
        await page.goto('/exercises');
        
        // Check layout adapts
        await expect(page.getByRole('main')).toBeVisible();
        
        // Mobile should have stacked layout
        if (viewport.name === 'mobile') {
          const tabs = await page.getByRole('tab').all();
          for (const tab of tabs) {
            const box = await tab.boundingBox();
            expect(box?.width).toBeLessThan(200);
          }
        }
        
        await page.screenshot({ 
          path: `screenshots/exercises-12-${viewport.name}.png`,
          fullPage: true 
        });
      });
    }
  });
});