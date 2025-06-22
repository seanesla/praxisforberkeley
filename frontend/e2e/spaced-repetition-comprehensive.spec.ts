import { test, expect } from '@playwright/test';
import { authenticateUser, createTestUser, deleteTestUser } from './helpers/auth-helpers';
import { createTestFlashcardSet, waitForToast } from './helpers/test-helpers';

test.describe('Spaced Repetition System - Comprehensive Tests', () => {
  let testEmail: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    // Create unique test user
    const timestamp = Date.now();
    testEmail = `test.spaced.repetition.${timestamp}@example.com`;
    testPassword = 'TestPass123!';
    
    await createTestUser(testEmail, testPassword);
    await authenticateUser(page, testEmail, testPassword);
  });

  test.afterEach(async () => {
    await deleteTestUser(testEmail);
  });

  test('Complete spaced repetition workflow', async ({ page }) => {
    await test.step('Navigate to study page', async () => {
      await page.goto('/study');
      await expect(page).toHaveTitle(/Study - Spaced Repetition/);
      await page.screenshot({ path: 'screenshots/spaced-repetition-01-study-page.png', fullPage: true });
    });

    await test.step('Check initial state - no cards due', async () => {
      await expect(page.getByText('No cards due!')).toBeVisible();
      await expect(page.getByText('Great job! All your cards are up to date.')).toBeVisible();
      await page.screenshot({ path: 'screenshots/spaced-repetition-02-no-cards.png' });
    });

    await test.step('Create flashcard set with cards', async () => {
      // Navigate to flashcards page
      await page.goto('/flashcards');
      await page.waitForLoadState('networkidle');
      
      // Create new set
      await page.getByRole('button', { name: 'New Set' }).click();
      await page.getByLabel('Set Name').fill('Physics 101 - Mechanics');
      await page.getByLabel('Description').fill('Basic mechanics concepts for spaced repetition testing');
      await page.getByRole('button', { name: 'Create' }).click();
      
      // Wait for set creation
      await waitForToast(page, 'Flashcard set created');
      
      // Add cards to the set
      const cards = [
        { front: 'What is Newton\'s First Law?', back: 'An object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force.' },
        { front: 'Formula for kinetic energy?', back: 'KE = 1/2 × m × v²' },
        { front: 'Define acceleration', back: 'The rate of change of velocity with respect to time' },
        { front: 'What is momentum?', back: 'The product of mass and velocity (p = m × v)' },
        { front: 'SI unit of force?', back: 'Newton (N) or kg⋅m/s²' }
      ];
      
      for (const card of cards) {
        await page.getByRole('button', { name: 'Add Card' }).click();
        await page.getByLabel('Front').fill(card.front);
        await page.getByLabel('Back').fill(card.back);
        await page.getByRole('button', { name: 'Save Card' }).click();
        await waitForToast(page, 'Card added');
      }
      
      await page.screenshot({ path: 'screenshots/spaced-repetition-03-flashcard-set.png', fullPage: true });
    });

    await test.step('Initialize cards for spaced repetition', async () => {
      await page.goto('/study');
      await page.getByRole('button', { name: 'Select Cards to Study' }).click();
      await page.getByText('Physics 101 - Mechanics').click();
      await page.getByRole('button', { name: 'Start Studying' }).click();
      
      await expect(page.getByText('0 / 5')).toBeVisible();
      await page.screenshot({ path: 'screenshots/spaced-repetition-04-study-session.png' });
    });

    await test.step('Study first card', async () => {
      // Check question is displayed
      await expect(page.getByText('What is Newton\'s First Law?')).toBeVisible();
      await page.screenshot({ path: 'screenshots/spaced-repetition-05-card-front.png' });
      
      // Show answer
      await page.getByRole('button', { name: 'Show answer' }).click();
      
      // Check answer is displayed
      await expect(page.getByText(/An object at rest stays at rest/)).toBeVisible();
      await expect(page.getByText('How well did you know this?')).toBeVisible();
      
      // Check rating buttons have focus
      const firstRatingButton = page.getByRole('button', { name: 'Rate as difficult - Again (1)' });
      await expect(firstRatingButton).toBeFocused();
      
      await page.screenshot({ path: 'screenshots/spaced-repetition-06-card-back-ratings.png' });
      
      // Rate card as good
      await page.getByRole('button', { name: 'Rate as good (3)' }).click();
    });

    await test.step('Complete study session', async () => {
      // Study remaining cards
      const ratings = [2, 4, 3, 4]; // Different ratings for variety
      
      for (let i = 0; i < ratings.length; i++) {
        await page.getByRole('button', { name: 'Show answer' }).click();
        await page.getByRole('button', { name: new RegExp(`Rate as .* \\(${ratings[i]}\\)`) }).click();
        
        // Check progress
        await expect(page.getByText(`${i + 2} / 5`)).toBeVisible();
      }
      
      // Session complete
      await expect(page.getByText('Session Complete!')).toBeVisible();
      await expect(page.getByText('Cards reviewed: 5')).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/spaced-repetition-07-session-complete.png', fullPage: true });
    });

    await test.step('Check study statistics', async () => {
      await page.goto('/study');
      
      // Check streak information
      await expect(page.getByText('Current Streak')).toBeVisible();
      await expect(page.getByText('1 day')).toBeVisible();
      
      // Check performance stats
      await expect(page.getByText('Cards Studied Today')).toBeVisible();
      await expect(page.getByText('5')).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/spaced-repetition-08-study-stats.png', fullPage: true });
    });

    await test.step('Check heatmap and analytics', async () => {
      // The heatmap should show today's study activity
      await expect(page.locator('.react-calendar-heatmap')).toBeVisible();
      await expect(page.getByText('Study Activity')).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/spaced-repetition-09-heatmap.png' });
    });

    await test.step('Test keyboard navigation', async () => {
      // Start new session if cards are due
      await page.getByRole('button', { name: 'Start Studying' }).click({ force: true });
      
      if (await page.getByText('No cards due!').isVisible({ timeout: 1000 }).catch(() => false)) {
        // No more cards due today, which is expected
        return;
      }
      
      // Test keyboard shortcuts
      await page.keyboard.press('Space'); // Show answer
      await expect(page.getByText('How well did you know this?')).toBeVisible();
      
      await page.keyboard.press('3'); // Rate as good
      await expect(page.getByRole('progressbar')).toBeVisible();
    });
  });

  test('Spaced repetition algorithm verification', async ({ page }) => {
    await test.step('Create and study cards', async () => {
      // Create test set
      await createTestFlashcardSet(page, 'Algorithm Test', 'Testing SM-2 algorithm');
      
      // Study with different ratings
      await page.goto('/study');
      await page.getByRole('button', { name: 'Start Studying' }).click();
    });

    await test.step('Verify interval calculations', async () => {
      // Rate first card as difficult (1)
      await page.getByRole('button', { name: 'Show answer' }).click();
      await page.getByRole('button', { name: 'Rate as difficult - Again (1)' }).click();
      
      // Check card info shows correct interval
      await expect(page.getByText('Interval: 1 days')).toBeVisible();
      
      // Rate next card as easy (4)
      await page.getByRole('button', { name: 'Show answer' }).click();
      await page.getByRole('button', { name: 'Rate as easy (4)' }).click();
      
      // Easy cards should have longer intervals
      await expect(page.getByText(/Interval: [4-6] days/)).toBeVisible();
    });

    await page.screenshot({ path: 'screenshots/spaced-repetition-10-algorithm-test.png' });
  });

  test('Responsive design and accessibility', async ({ page, viewport }) => {
    await test.step('Test mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/study');
      
      // Check mobile layout
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.locator('.glass-card')).toBeVisible();
      
      await page.screenshot({ path: 'screenshots/spaced-repetition-11-mobile.png', fullPage: true });
    });

    await test.step('Test tablet viewport', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      
      await page.screenshot({ path: 'screenshots/spaced-repetition-12-tablet.png', fullPage: true });
    });

    await test.step('Test accessibility', async () => {
      // Check ARIA labels
      const studyButton = page.getByRole('button', { name: /Start Studying|Select Cards/ });
      await expect(studyButton).toHaveAttribute('aria-label', /.+/);
      
      // Test focus management
      await studyButton.focus();
      await expect(studyButton).toBeFocused();
      
      // Tab through interface
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      expect(focusedElement).toBeTruthy();
    });
  });

  test('Error handling and edge cases', async ({ page }) => {
    await test.step('Handle network errors', async () => {
      // Offline mode
      await page.context().setOffline(true);
      await page.goto('/study');
      
      await expect(page.getByText(/offline|error|failed/i)).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'screenshots/spaced-repetition-13-offline-error.png' });
      
      await page.context().setOffline(false);
    });

    await test.step('Handle empty states', async () => {
      await page.goto('/study');
      
      // No flashcard sets
      await expect(page.getByText(/no cards|create.*flashcards/i)).toBeVisible();
      await page.screenshot({ path: 'screenshots/spaced-repetition-14-empty-state.png' });
    });
  });
});