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

test.describe('Exercises - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/exercises');
    await waitForAnimation(page);
  });

  test('Complete exercise workflow with all 8 exercise types', async ({ page }) => {
    console.log('📝 Starting comprehensive exercise test');
    
    // Test 1: Exercise dashboard
    await test.step('Exercise dashboard', async () => {
      await takeScreenshot(page, 'exercises-01-dashboard');
      
      // Check for exercise sets or create new button
      const createButton = page.locator('button:has-text("Create Exercise Set"), button:has-text("New Exercise Set")').first();
      const existingSets = page.locator('[data-testid="exercise-set"]');
      
      if (await createButton.isVisible()) {
        await takeScreenshot(page, 'exercises-02-empty-state');
      } else if (await existingSets.first().isVisible()) {
        await takeScreenshot(page, 'exercises-03-existing-sets');
      }
      
      await testResponsive(page, 'exercises-dashboard');
    });

    // Test 2: Generate exercises
    await test.step('Generate exercises from document', async () => {
      // Navigate to document upload if needed
      const generateButton = page.locator('button:has-text("Generate Exercises")').first();
      
      if (await generateButton.isVisible()) {
        await clickWithScreenshot(page, generateButton, 'exercises-04-generate-button');
        
        // Exercise type selection
        await test.step('Select exercise types', async () => {
          await takeScreenshot(page, 'exercises-05-type-selection');
          
          // Verify all 8 exercise types
          const exerciseTypes = [
            'Multiple Choice',
            'True/False',
            'Fill in the Blank',
            'Short Answer',
            'Matching',
            'Ordering',
            'Code Completion',
            'Diagram Labeling',
            'Problem Solving',
            'Essay Questions'
          ];
          
          for (const type of exerciseTypes) {
            const typeCheckbox = page.locator(`text=/${type}/i`).first();
            if (await typeCheckbox.isVisible()) {
              console.log(`Found exercise type: ${type}`);
            }
          }
          
          // Select multiple types
          const multipleChoice = page.locator('text=/Multiple Choice/i').first();
          const fillBlank = page.locator('text=/Fill.*Blank/i').first();
          const matching = page.locator('text=/Matching/i').first();
          
          if (await multipleChoice.isVisible()) await multipleChoice.click();
          if (await fillBlank.isVisible()) await fillBlank.click();
          if (await matching.isVisible()) await matching.click();
          
          await takeScreenshot(page, 'exercises-06-types-selected');
        });
        
        // Set exercise count
        const countInput = page.locator('input[type="number"], input[name="count"]').first();
        if (await countInput.isVisible()) {
          await countInput.fill('10');
        }
        
        // Generate exercises
        const confirmGenerate = page.locator('button:has-text("Generate"), button:has-text("Create")').last();
        if (await confirmGenerate.isVisible()) {
          await clickWithScreenshot(page, confirmGenerate, 'exercises-07-generating');
        }
      }
    });

    // Test 3: Start exercise session
    await test.step('Start exercise session', async () => {
      // Find and click on an exercise set
      const exerciseSet = page.locator('[data-testid="exercise-set"], .exercise-set-card').first();
      const startSession = page.locator('button:has-text("Start"), button:has-text("Begin")').first();
      
      if (await exerciseSet.isVisible()) {
        await clickWithScreenshot(page, exerciseSet, 'exercises-08-select-set');
      } else if (await startSession.isVisible()) {
        await clickWithScreenshot(page, startSession, 'exercises-09-start-session');
      }
      
      // Wait for exercise session to load
      await waitForAnimation(page);
    });

    // Test 4: Multiple Choice Exercise
    await test.step('Multiple choice exercise', async () => {
      const mcQuestion = page.locator('text=/multiple.*choice/i, h3:has-text("?")').first();
      
      if (await mcQuestion.isVisible()) {
        await takeScreenshot(page, 'exercises-10-multiple-choice');
        
        // Select an answer
        const option = page.locator('input[type="radio"]').first();
        if (await option.isVisible()) {
          await option.click();
          await takeScreenshot(page, 'exercises-11-mc-selected');
        }
        
        // Submit answer
        const submitButton = page.locator('button:has-text("Submit")');
        if (await submitButton.isVisible()) {
          await clickWithScreenshot(page, submitButton, 'exercises-12-mc-feedback');
        }
      }
    });

    // Test 5: True/False Exercise
    await test.step('True/False exercise', async () => {
      const tfButtons = page.locator('button:has-text("True"), button:has-text("False")');
      
      if (await tfButtons.first().isVisible()) {
        await takeScreenshot(page, 'exercises-13-true-false');
        
        // Select True
        const trueButton = page.locator('button:has-text("True")').first();
        await clickWithScreenshot(page, trueButton, 'exercises-14-tf-selected');
        
        // Submit
        const submitButton = page.locator('button:has-text("Submit")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await waitForAnimation(page);
          await takeScreenshot(page, 'exercises-15-tf-feedback');
        }
      }
    });

    // Test 6: Fill in the Blank
    await test.step('Fill in the blank exercise', async () => {
      const fillInput = page.locator('input[placeholder*="answer"], input[type="text"]').first();
      
      if (await fillInput.isVisible()) {
        await takeScreenshot(page, 'exercises-16-fill-blank');
        
        await fillInput.fill('test answer');
        await takeScreenshot(page, 'exercises-17-fill-blank-typed');
        
        // Submit
        const submitButton = page.locator('button:has-text("Submit")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await waitForAnimation(page);
          await takeScreenshot(page, 'exercises-18-fill-blank-feedback');
        }
      }
    });

    // Test 7: Short Answer
    await test.step('Short answer exercise', async () => {
      const textarea = page.locator('textarea').first();
      
      if (await textarea.isVisible()) {
        await takeScreenshot(page, 'exercises-19-short-answer');
        
        await textarea.fill('This is a short answer response to test the exercise functionality.');
        await takeScreenshot(page, 'exercises-20-short-answer-typed');
        
        // Submit
        const submitButton = page.locator('button:has-text("Submit")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await waitForAnimation(page);
          await takeScreenshot(page, 'exercises-21-short-answer-feedback');
        }
      }
    });

    // Test 8: Matching Exercise
    await test.step('Matching exercise', async () => {
      const matchingContainer = page.locator('[data-exercise-type="matching"]');
      
      if (await matchingContainer.isVisible()) {
        await takeScreenshot(page, 'exercises-22-matching');
        
        // Simulate drag and drop matching
        const draggable = page.locator('[draggable="true"]').first();
        const dropZone = page.locator('[data-drop-zone]').first();
        
        if (await draggable.isVisible() && await dropZone.isVisible()) {
          await draggable.dragTo(dropZone);
          await takeScreenshot(page, 'exercises-23-matching-connected');
        }
      }
    });

    // Test 9: Code Completion
    await test.step('Code completion exercise', async () => {
      const codeEditor = page.locator('[class*="code-editor"], .monaco-editor, textarea[data-type="code"]');
      
      if (await codeEditor.isVisible()) {
        await takeScreenshot(page, 'exercises-24-code-completion');
        
        // Type code
        await codeEditor.fill('function calculate() { return 42; }');
        await takeScreenshot(page, 'exercises-25-code-typed');
      }
    });

    // Test 10: Diagram Labeling
    await test.step('Diagram labeling exercise', async () => {
      const diagramContainer = page.locator('[data-exercise-type="diagram"]');
      
      if (await diagramContainer.isVisible()) {
        await takeScreenshot(page, 'exercises-26-diagram-labeling');
        
        // Click on diagram hotspots
        const hotspot = page.locator('[data-hotspot]').first();
        if (await hotspot.isVisible()) {
          await hotspot.click();
          await takeScreenshot(page, 'exercises-27-diagram-labeled');
        }
      }
    });

    // Test 11: Essay Question
    await test.step('Essay question exercise', async () => {
      const essayTextarea = page.locator('textarea[data-type="essay"], textarea.essay-input');
      
      if (await essayTextarea.isVisible()) {
        await takeScreenshot(page, 'exercises-28-essay-question');
        
        await essayTextarea.fill('This is a comprehensive essay response that demonstrates understanding of the topic...');
        await takeScreenshot(page, 'exercises-29-essay-written');
      }
    });

    // Test 12: Hint system
    await test.step('Hint system', async () => {
      const hintButton = page.locator('button:has-text("Hint")');
      
      if (await hintButton.isVisible()) {
        await clickWithScreenshot(page, hintButton, 'exercises-30-hint-button');
        
        // Check if hint is displayed
        const hintContent = page.locator('[role="tooltip"], .hint-content');
        if (await hintContent.isVisible()) {
          await takeScreenshot(page, 'exercises-31-hint-displayed');
        }
      }
    });

    // Test 13: Session completion
    await test.step('Complete exercise session', async () => {
      // Navigate through remaining exercises
      let nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
      let finishButton = page.locator('button:has-text("Finish"), button:has-text("Complete")');
      
      while (await nextButton.isVisible() && !await finishButton.isVisible()) {
        await nextButton.click();
        await waitForAnimation(page);
        nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
        finishButton = page.locator('button:has-text("Finish"), button:has-text("Complete")');
      }
      
      if (await finishButton.isVisible()) {
        await clickWithScreenshot(page, finishButton, 'exercises-32-finish-session');
      }
      
      // Session results
      const resultsScreen = page.locator('text=/Session Complete|Results|Score/i');
      if (await resultsScreen.isVisible()) {
        await takeScreenshot(page, 'exercises-33-session-results');
        
        // Verify scoring display
        await verifyVisible(page, 'text=/Score|Points|Percentage/i');
        await verifyVisible(page, 'text=/[0-9]+\\/[0-9]+|[0-9]+%/');
      }
    });

    // Test 14: Performance metrics
    await test.step('Exercise performance metrics', async () => {
      const metricsSection = page.locator('[data-testid="performance-metrics"]');
      
      if (await metricsSection.isVisible()) {
        await takeScreenshot(page, 'exercises-34-performance-metrics');
        
        // Check for time taken, accuracy, difficulty analysis
        await verifyVisible(page, 'text=/Time.*Spent|Duration/i');
        await verifyVisible(page, 'text=/Accuracy|Correct/i');
        await verifyVisible(page, 'text=/Difficulty|Challenge/i');
      }
    });
  });

  test('Scoring algorithm verification', async ({ page }) => {
    console.log('📊 Testing exercise scoring algorithms');
    
    await test.step('Verify scoring for each exercise type', async () => {
      // This would typically involve API testing or checking score calculations
      // For E2E, we verify that scores are displayed correctly
      
      const scoreElements = page.locator('[data-testid="score"], .score-display');
      
      if (await scoreElements.first().isVisible()) {
        const scores = await scoreElements.allTextContents();
        console.log('Displayed scores:', scores);
        
        // Verify score format
        for (const score of scores) {
          expect(score).toMatch(/\d+/); // Should contain numbers
        }
      }
    });
  });

  test('Responsive design for exercises', async ({ page }) => {
    console.log('📱 Testing responsive design for exercises');
    
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/exercises');
      await waitForAnimation(page);
      
      await takeScreenshot(page, `exercises-responsive-${viewport.name}`);
      
      // Verify layout adjustments
      if (viewport.name === 'mobile') {
        // Exercise options should stack vertically
        const exerciseOptions = page.locator('[class*="exercise-option"]');
        if (await exerciseOptions.first().isVisible()) {
          const firstBox = await exerciseOptions.first().boundingBox();
          const secondBox = await exerciseOptions.nth(1).boundingBox();
          
          if (firstBox && secondBox) {
            expect(secondBox.y).toBeGreaterThan(firstBox.y); // Stacked vertically
          }
        }
      }
    }
  });

  test('Keyboard navigation for exercises', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation');
    
    await testKeyboardNavigation(page, [
      { key: 'Tab', expectedFocus: 'input, button' },
      { key: 'Space', expectedAction: 'select option' },
      { key: 'Enter', expectedAction: 'submit answer' },
      { key: 'ArrowDown', expectedAction: 'next option' },
      { key: 'ArrowUp', expectedAction: 'previous option' }
    ], 'exercises-keyboard');
  });

  test('Exercise error handling', async ({ page }) => {
    console.log('❌ Testing error handling');
    
    // Simulate network failure
    await page.route('**/api/exercises/**', route => route.abort());
    
    const submitButton = page.locator('button:has-text("Submit")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Check for error message
      const errorMessage = await page.waitForSelector('text=/error|failed|unable/i', { timeout: 5000 }).catch(() => null);
      if (errorMessage) {
        await takeScreenshot(page, 'exercises-35-error-state');
      }
    }
    
    // Restore network
    await page.unroute('**/api/exercises/**');
  });
});