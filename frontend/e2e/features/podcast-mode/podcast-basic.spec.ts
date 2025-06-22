import { test, expect } from '@playwright/test';

test.describe('Podcast Mode Basic Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Login with test credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard');
  });

  test('should navigate to podcast page from command palette', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForSelector('[data-testid="command-palette"]', { state: 'visible' });
    
    // Search for podcast
    await page.fill('[placeholder*="Search"]', 'podcast');
    
    // Click on podcast option
    await page.click('text=Start Podcast Mode');
    
    // Should navigate to podcast page
    await expect(page).toHaveURL('/podcast');
    
    // Should show podcast interface elements
    await expect(page.locator('text=Interactive Podcast Mode')).toBeVisible();
    await expect(page.locator('text=Select a Document to Discuss')).toBeVisible();
  });

  test('should show podcast page elements', async ({ page }) => {
    await page.goto('/podcast');
    
    // Check header
    await expect(page.locator('h1:has-text("Interactive Podcast Mode")')).toBeVisible();
    
    // Check welcome section
    await expect(page.locator('text=Start a Voice Conversation')).toBeVisible();
    await expect(page.locator('text=Select a document to discuss')).toBeVisible();
    
    // Check for start without document option
    await expect(page.locator('[data-testid="start-without-document"]')).toBeVisible();
  });

  test('should start general conversation without document', async ({ page }) => {
    await page.goto('/podcast');
    
    // Click start without document
    await page.click('[data-testid="start-without-document"]');
    
    // Should show podcast interface
    await expect(page.locator('[data-testid="podcast-interface"]')).toBeVisible();
    
    // Check for main controls
    await expect(page.locator('[data-testid="voice-input-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="pause-podcast"]')).toBeVisible();
    await expect(page.locator('[data-testid="end-podcast"]')).toBeVisible();
    
    // Check for transcript area
    await expect(page.locator('[data-testid="transcript-area"]')).toBeVisible();
    
    // Check for text input
    await expect(page.locator('[data-testid="text-input"]')).toBeVisible();
  });

  test('should send text message in podcast', async ({ page }) => {
    await page.goto('/podcast');
    await page.click('[data-testid="start-without-document"]');
    
    // Type a message
    await page.fill('[data-testid="text-input"]', 'Hello, this is a test message');
    await page.keyboard.press('Enter');
    
    // Should show user message in transcript
    await expect(page.locator('[data-testid="user-transcript"]')).toContainText('Hello, this is a test message');
    
    // Wait for AI response (mocked or real)
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });
  });

  test('should toggle language selector', async ({ page }) => {
    await page.goto('/podcast');
    await page.click('[data-testid="start-without-document"]');
    
    // Click language selector
    await page.click('[data-testid="language-selector"]');
    
    // Should show language options
    await expect(page.locator('[data-testid="language-spanish"]')).toBeVisible();
    await expect(page.locator('text=Español')).toBeVisible();
    
    // Select Spanish
    await page.click('[data-testid="language-spanish"]');
    
    // Language selector should update
    await expect(page.locator('[data-testid="language-selector"]')).toContainText('Español');
  });

  test('should pause and resume podcast', async ({ page }) => {
    await page.goto('/podcast');
    await page.click('[data-testid="start-without-document"]');
    
    // Click pause
    await page.click('[data-testid="pause-podcast"]');
    
    // Should show paused state
    await expect(page.locator('[data-testid="podcast-paused"]')).toBeVisible();
    
    // Resume button should be visible
    await expect(page.locator('[data-testid="resume-podcast"]')).toBeVisible();
    
    // Click resume
    await page.click('[data-testid="resume-podcast"]');
    
    // Should not show paused state
    await expect(page.locator('[data-testid="podcast-paused"]')).not.toBeVisible();
  });

  test('should navigate to saved podcasts', async ({ page }) => {
    // Use command palette to navigate
    await page.keyboard.press('Meta+k');
    await page.fill('[placeholder*="Search"]', 'saved podcasts');
    
    // Should have option to view saved podcasts
    const savedOption = page.locator('text=View Saved Podcasts').first();
    if (await savedOption.isVisible()) {
      await savedOption.click();
      await expect(page).toHaveURL('/podcasts');
    }
  });
});