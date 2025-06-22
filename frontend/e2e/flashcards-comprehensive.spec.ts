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
  createTestFlashcard,
  testResponsive,
  testDragAndDrop,
  setupConsoleLogging
} from './helpers/test-helpers';

test.describe('Flashcards - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/flashcards');
    await waitForAnimation(page);
  });

  test('Complete flashcard workflow with visual regression', async ({ page }) => {
    console.log('🎴 Starting comprehensive flashcard test');
    
    // Test 1: Flashcards dashboard
    await test.step('Flashcards dashboard', async () => {
      await takeScreenshot(page, 'flashcards-01-dashboard');
      await testResponsive(page, 'flashcards-dashboard');
      
      // Check empty state
      const emptyState = page.locator('text=/no flashcards|no decks|get started/i');
      if (await emptyState.isVisible()) {
        await takeScreenshot(page, 'flashcards-empty-state');
      }
    });

    // Test 2: Create deck
    await test.step('Create flashcard deck', async () => {
      const createDeckButton = page.locator('button:has-text("Create Deck"), button:has-text("New Deck")').first();
      await clickWithScreenshot(page, createDeckButton, 'flashcards-create-deck-button');
      
      // Fill deck form
      await fillFormWithScreenshots(page, {
        'input[name="name"], input[placeholder*="deck name"]': 'Physics Study Deck',
        'textarea[name="description"], textarea[placeholder*="description"]': 'Newton\'s Laws and basic physics concepts'
      }, 'flashcards-deck-form');
      
      // Save deck
      await clickWithScreenshot(page, 'button[type="submit"], button:has-text("Create")', 'flashcards-save-deck');
      await waitForAnimation(page);
      await takeScreenshot(page, 'flashcards-02-deck-created');
    });

    // Test 3: Create flashcards manually
    await test.step('Create flashcards manually', async () => {
      // Click on the deck or create card button
      const deckCard = page.locator('text=Physics Study Deck').first();
      if (await deckCard.isVisible()) {
        await clickWithScreenshot(page, deckCard, 'flashcards-open-deck');
      }
      
      // Create multiple flashcards
      const flashcards = [
        {
          question: 'What is Newton\'s First Law?',
          answer: 'An object at rest stays at rest and an object in motion stays in motion unless acted upon by an unbalanced force.'
        },
        {
          question: 'What is the formula for Newton\'s Second Law?',
          answer: 'F = ma (Force equals mass times acceleration)'
        },
        {
          question: 'What is Newton\'s Third Law?',
          answer: 'For every action, there is an equal and opposite reaction.'
        }
      ];
      
      for (let i = 0; i < flashcards.length; i++) {
        const card = flashcards[i];
        
        // Click create/add card button
        const addButton = page.locator('button:has-text("Add Card"), button:has-text("Create Card"), button:has-text("New Card")').first();
        await clickWithScreenshot(page, addButton, `flashcards-add-card-${i}`);
        
        // Fill card form
        await page.fill('textarea[name="question"], input[name="question"], textarea[placeholder*="question"]', card.question);
        await page.fill('textarea[name="answer"], input[name="answer"], textarea[placeholder*="answer"]', card.answer);
        
        await takeScreenshot(page, `flashcards-card-form-${i}`);
        
        // Save card
        await clickWithScreenshot(page, 'button[type="submit"], button:has-text("Save"), button:has-text("Add")', `flashcards-save-card-${i}`);
        await waitForAnimation(page);
      }
      
      await takeScreenshot(page, 'flashcards-03-cards-list');
    });

    // Test 4: Study mode
    await test.step('Study mode', async () => {
      // Start study session
      const studyButton = page.locator('button:has-text("Study"), button:has-text("Start Study")').first();
      await clickWithScreenshot(page, studyButton, 'flashcards-start-study');
      
      await waitForAnimation(page);
      await takeScreenshot(page, 'flashcards-04-study-mode');
      
      // Test card flip animation
      const card = page.locator('.flashcard, [data-testid="flashcard"]').first();
      if (await card.isVisible()) {
        // Front of card
        await takeScreenshot(page, 'flashcards-card-front');
        
        // Click to flip
        await card.click();
        await waitForAnimation(page);
        await takeScreenshot(page, 'flashcards-card-back');
        
        // Click again to flip back
        await card.click();
        await waitForAnimation(page);
        await takeScreenshot(page, 'flashcards-card-front-again');
      }
      
      // Test keyboard navigation
      await testKeyboardNavigation(page, ['Space', 'ArrowRight', 'ArrowLeft', 'Space'], 'flashcards-keyboard');
      
      // Test difficulty buttons
      const difficultyButtons = ['Easy', 'Medium', 'Hard'];
      for (const difficulty of difficultyButtons) {
        const button = page.locator(`button:has-text("${difficulty}")`);
        if (await button.isVisible()) {
          await testHoverState(page, button, `flashcards-difficulty-${difficulty.toLowerCase()}`);
        }
      }
    });

    // Test 5: AI generation
    await test.step('AI flashcard generation', async () => {
      // Go back to flashcards dashboard
      await page.goto('/dashboard/flashcards');
      await waitForAnimation(page);
      
      // Find AI generation button
      const aiButton = page.locator('button:has-text("Generate"), button:has-text("AI Generate")').first();
      if (await aiButton.isVisible()) {
        await clickWithScreenshot(page, aiButton, 'flashcards-ai-generate-button');
        
        // Fill generation form
        await page.fill('textarea[placeholder*="topic"], textarea[name="topic"]', 'Quantum Physics basics');
        await page.fill('input[type="number"], input[name="count"]', '5');
        
        await takeScreenshot(page, 'flashcards-ai-generation-form');
        
        // Generate
        await clickWithScreenshot(page, 'button[type="submit"], button:has-text("Generate")', 'flashcards-ai-generate-submit');
        
        // Wait for generation
        await page.waitForSelector('text=/generated|success/i', { timeout: 30000 });
        await takeScreenshot(page, 'flashcards-05-ai-generated');
      }
    });

    // Test 6: Statistics and progress
    await test.step('Statistics and progress', async () => {
      // Look for stats section
      const statsButton = page.locator('button:has-text("Stats"), button:has-text("Progress")').first();
      if (await statsButton.isVisible()) {
        await clickWithScreenshot(page, statsButton, 'flashcards-stats-button');
        await takeScreenshot(page, 'flashcards-06-statistics');
      }
      
      // Check for progress indicators
      const progressBar = page.locator('[role="progressbar"], .progress-bar');
      if (await progressBar.isVisible()) {
        await takeScreenshot(page, 'flashcards-progress-bar');
      }
    });

    // Test 7: Edit and delete cards
    await test.step('Edit and delete cards', async () => {
      // Find a card to edit
      const editButton = page.locator('button:has-text("Edit")').first();
      if (await editButton.isVisible()) {
        await clickWithScreenshot(page, editButton, 'flashcards-edit-button');
        
        // Modify the card
        const questionField = page.locator('textarea[name="question"], input[name="question"]');
        await questionField.clear();
        await questionField.fill('Updated: What is Newton\'s First Law of Motion?');
        
        await takeScreenshot(page, 'flashcards-edit-form');
        
        // Save changes
        await clickWithScreenshot(page, 'button[type="submit"], button:has-text("Save")', 'flashcards-save-edit');
        await waitForAnimation(page);
      }
      
      // Delete a card
      const deleteButton = page.locator('button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await clickWithScreenshot(page, deleteButton, 'flashcards-delete-button');
        
        // Confirm deletion if modal appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible()) {
          await takeScreenshot(page, 'flashcards-delete-confirm');
          await confirmButton.click();
        }
        
        await waitForAnimation(page);
        await takeScreenshot(page, 'flashcards-07-after-delete');
      }
    });

    // Test 8: Import/Export
    await test.step('Import and export', async () => {
      // Export deck
      const exportButton = page.locator('button:has-text("Export")').first();
      if (await exportButton.isVisible()) {
        await clickWithScreenshot(page, exportButton, 'flashcards-export-button');
        await takeScreenshot(page, 'flashcards-export-options');
      }
      
      // Import deck
      const importButton = page.locator('button:has-text("Import")').first();
      if (await importButton.isVisible()) {
        await clickWithScreenshot(page, importButton, 'flashcards-import-button');
        await takeScreenshot(page, 'flashcards-import-dialog');
      }
    });

    // Test 9: Search and filter
    await test.step('Search and filter', async () => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('Newton');
        await takeScreenshot(page, 'flashcards-search-results');
        
        await searchInput.clear();
        await searchInput.fill('xyz123notfound');
        await takeScreenshot(page, 'flashcards-search-no-results');
      }
    });

    // Test 10: Responsive study mode
    await test.step('Responsive study mode', async () => {
      // Start study session
      const studyButton = page.locator('button:has-text("Study")').first();
      if (await studyButton.isVisible()) {
        await studyButton.click();
        await waitForAnimation(page);
        
        // Test different viewports
        await testResponsive(page, 'flashcards-study-responsive');
      }
    });

    console.log('✅ Flashcard tests completed');
  });

  test('Test flashcard animations and interactions', async ({ page }) => {
    await test.step('Card flip animation timing', async () => {
      // Create a test card
      await createTestFlashcard(page, 'Test Deck', 'Test Question', 'Test Answer');
      
      // Start study
      const studyButton = page.locator('button:has-text("Study")').first();
      await studyButton.click();
      await waitForAnimation(page);
      
      const card = page.locator('.flashcard, [data-testid="flashcard"]').first();
      
      // Test multiple rapid flips
      for (let i = 0; i < 5; i++) {
        await card.click();
        await page.waitForTimeout(200); // Short wait between flips
        await takeScreenshot(page, `flashcards-rapid-flip-${i}`);
      }
    });

    await test.step('Drag and drop card ordering', async () => {
      // If the UI supports drag and drop
      const draggableCard = page.locator('[draggable="true"]').first();
      if (await draggableCard.isVisible()) {
        await testDragAndDrop(
          page,
          '[draggable="true"]:first-child',
          '[draggable="true"]:last-child',
          'flashcards-drag-drop'
        );
      }
    });

    await test.step('Swipe gestures on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const card = page.locator('.flashcard').first();
      if (await card.isVisible()) {
        // Simulate swipe
        const box = await card.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width + 100, box.y + box.height / 2);
          await page.mouse.up();
          await takeScreenshot(page, 'flashcards-swipe-gesture');
        }
      }
    });
  });

  test('Test spaced repetition algorithm', async ({ page }) => {
    await test.step('Create cards with different difficulties', async () => {
      const cards = [
        { q: 'Easy question', a: 'Easy answer', difficulty: 'Easy' },
        { q: 'Medium question', a: 'Medium answer', difficulty: 'Medium' },
        { q: 'Hard question', a: 'Hard answer', difficulty: 'Hard' }
      ];
      
      for (const card of cards) {
        await createTestFlashcard(page, 'Spaced Repetition Test', card.q, card.a);
      }
      
      // Study and mark difficulties
      const studyButton = page.locator('button:has-text("Study")').first();
      await studyButton.click();
      await waitForAnimation(page);
      
      for (const card of cards) {
        // Flip card
        await page.locator('.flashcard').first().click();
        await waitForAnimation(page);
        
        // Mark difficulty
        const diffButton = page.locator(`button:has-text("${card.difficulty}")`);
        if (await diffButton.isVisible()) {
          await diffButton.click();
          await waitForAnimation(page);
          await takeScreenshot(page, `flashcards-spaced-${card.difficulty.toLowerCase()}`);
        }
      }
    });
  });
});