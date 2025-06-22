import { Page, expect } from '@playwright/test';
import path from 'path';

// Test user credentials
export const TEST_USERS = {
  primary: {
    email: 'test.primary@example.com',
    password: 'TestPass123!',
    name: 'Primary Test User'
  },
  secondary: {
    email: 'test.secondary@example.com', 
    password: 'TestPass456!',
    name: 'Secondary Test User'
  },
  admin: {
    email: 'test.admin@example.com',
    password: 'AdminPass789!',
    name: 'Admin Test User'
  }
};

// Helper to login with a specific user
export async function loginUser(page: Page, user: typeof TEST_USERS.primary) {
  console.log(`🔐 Logging in as ${user.email}`);
  
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  
  // Take screenshot before login
  await page.screenshot({ 
    path: `screenshots/login-form-${user.email.split('@')[0]}.png`,
    fullPage: true 
  });
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for successful login
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  
  console.log(`✅ Successfully logged in as ${user.email}`);
}

// Helper to register a new user
export async function registerUser(page: Page, user: typeof TEST_USERS.primary) {
  console.log(`📝 Registering new user ${user.email}`);
  
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  
  // Fill registration form
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);
  
  // Take screenshot
  await page.screenshot({ 
    path: `screenshots/register-form-${user.email.split('@')[0]}.png`,
    fullPage: true 
  });
  
  // Submit registration
  await page.click('button[type="submit"]');
  
  // Wait for redirect or success message
  await page.waitForURL(/\/(dashboard|verify-email|login)/, { timeout: 10000 });
  
  console.log(`✅ Successfully registered ${user.email}`);
}

// Helper to logout
export async function logout(page: Page) {
  console.log('🚪 Logging out');
  
  // Look for logout button in header or dropdown
  const logoutButton = await page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL('**/login', { timeout: 5000 });
    console.log('✅ Successfully logged out');
  } else {
    console.log('⚠️ Logout button not found, navigating directly');
    await page.goto('/login');
  }
}

// Helper to take annotated screenshot
export async function takeScreenshot(page: Page, name: string, options?: {
  fullPage?: boolean;
  annotate?: string;
  highlight?: string;
}) {
  const { fullPage = true, annotate, highlight } = options || {};
  
  // Highlight element if specified
  if (highlight) {
    await page.locator(highlight).evaluate(el => {
      el.style.border = '3px solid red';
      el.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
    });
  }
  
  // Add annotation if specified
  if (annotate) {
    await page.evaluate((text) => {
      const annotation = document.createElement('div');
      annotation.textContent = text;
      annotation.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 16px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `;
      annotation.id = 'test-annotation';
      document.body.appendChild(annotation);
    }, annotate);
  }
  
  // Take screenshot
  await page.screenshot({ 
    path: `screenshots/${name}.png`,
    fullPage 
  });
  
  // Remove annotation
  if (annotate) {
    await page.evaluate(() => {
      const annotation = document.getElementById('test-annotation');
      if (annotation) annotation.remove();
    });
  }
  
  // Remove highlight
  if (highlight) {
    await page.locator(highlight).evaluate(el => {
      el.style.border = '';
      el.style.boxShadow = '';
    });
  }
  
  console.log(`📸 Screenshot saved: ${name}.png`);
}

// Helper to wait and click with screenshot
export async function clickWithScreenshot(page: Page, selector: string, screenshotName: string) {
  await page.waitForSelector(selector, { state: 'visible' });
  await takeScreenshot(page, `before-${screenshotName}`, { highlight: selector });
  await page.click(selector);
  await page.waitForTimeout(500); // Wait for any animations
  await takeScreenshot(page, `after-${screenshotName}`);
}

// Helper to fill form with screenshots
export async function fillFormWithScreenshots(page: Page, fields: Record<string, string>, formName: string) {
  await takeScreenshot(page, `${formName}-empty`);
  
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
    await takeScreenshot(page, `${formName}-filled-${selector.replace(/[^\w]/g, '-')}`);
  }
  
  await takeScreenshot(page, `${formName}-complete`);
}

// Helper to test hover states
export async function testHoverState(page: Page, selector: string, name: string) {
  await page.waitForSelector(selector, { state: 'visible' });
  
  // Normal state
  await takeScreenshot(page, `${name}-normal`);
  
  // Hover state
  await page.hover(selector);
  await page.waitForTimeout(300); // Wait for hover animation
  await takeScreenshot(page, `${name}-hover`);
  
  // Move away
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
}

// Helper to test keyboard navigation
export async function testKeyboardNavigation(page: Page, keys: string[], screenshotPrefix: string) {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    await page.keyboard.press(key);
    await page.waitForTimeout(300); // Wait for animation
    await takeScreenshot(page, `${screenshotPrefix}-${key}-${i}`);
  }
}

// Helper to wait for animation
export async function waitForAnimation(page: Page, selector?: string) {
  if (selector) {
    await page.waitForSelector(selector, { state: 'visible' });
  }
  await page.waitForTimeout(500); // General animation wait
  await page.waitForLoadState('networkidle');
}

// Helper to test responsive design
export async function testResponsive(page: Page, name: string) {
  const viewports = [
    { width: 375, height: 667, device: 'iphone' },
    { width: 768, height: 1024, device: 'ipad' },
    { width: 1920, height: 1080, device: 'desktop' }
  ];
  
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(500);
    await takeScreenshot(page, `${name}-${viewport.device}`);
  }
}

// Helper to create test data
export async function createTestFlashcard(page: Page, deck: string, question: string, answer: string) {
  console.log(`🎴 Creating flashcard in deck: ${deck}`);
  
  // Navigate to flashcards
  await page.goto('/dashboard/flashcards');
  await waitForAnimation(page);
  
  // Create new flashcard
  const createButton = page.locator('button:has-text("Create"), button:has-text("Add Card")').first();
  await clickWithScreenshot(page, createButton, 'create-flashcard');
  
  // Fill form
  await page.fill('input[placeholder*="question"], textarea[placeholder*="question"]', question);
  await page.fill('input[placeholder*="answer"], textarea[placeholder*="answer"]', answer);
  
  // Save
  await page.click('button:has-text("Save"), button[type="submit"]');
  await waitForAnimation(page);
  
  console.log(`✅ Created flashcard: ${question}`);
}

// Helper to create test mind map
export async function createTestMindMap(page: Page, title: string, description: string) {
  console.log(`🧠 Creating mind map: ${title}`);
  
  // Navigate to mind maps
  await page.goto('/dashboard/mindmaps');
  await waitForAnimation(page);
  
  // Create new mind map
  const createButton = page.locator('button:has-text("Create"), button:has-text("New Mind Map")').first();
  await clickWithScreenshot(page, createButton, 'create-mindmap');
  
  // Fill form if modal appears
  const titleInput = page.locator('input[placeholder*="title"], input[name="title"]');
  if (await titleInput.isVisible()) {
    await titleInput.fill(title);
    await page.fill('textarea[placeholder*="description"], textarea[name="description"]', description);
    await page.click('button:has-text("Create"), button[type="submit"]');
  }
  
  await waitForAnimation(page);
  console.log(`✅ Created mind map: ${title}`);
}

// Helper to verify element is visible with screenshot
export async function verifyVisible(page: Page, selector: string, name: string) {
  await expect(page.locator(selector)).toBeVisible();
  await takeScreenshot(page, `verify-${name}`, { highlight: selector });
}

// Helper to test drag and drop
export async function testDragAndDrop(page: Page, source: string, target: string, name: string) {
  await takeScreenshot(page, `${name}-before-drag`);
  
  const sourceElement = page.locator(source);
  const targetElement = page.locator(target);
  
  await sourceElement.dragTo(targetElement);
  await waitForAnimation(page);
  
  await takeScreenshot(page, `${name}-after-drag`);
}

// Helper to test file upload
export async function uploadFile(page: Page, selector: string, fileName: string, screenshotName: string) {
  const filePath = path.join(__dirname, '..', 'fixtures', fileName);
  
  await takeScreenshot(page, `${screenshotName}-before-upload`);
  await page.setInputFiles(selector, filePath);
  await waitForAnimation(page);
  await takeScreenshot(page, `${screenshotName}-after-upload`);
}

// Helper to test error states
export async function testErrorState(page: Page, triggerAction: () => Promise<void>, errorText: string, name: string) {
  await triggerAction();
  
  const errorElement = page.locator(`text=${errorText}`);
  await expect(errorElement).toBeVisible();
  await takeScreenshot(page, `${name}-error`, { highlight: `text=${errorText}` });
}

// Console log helper
export function setupConsoleLogging(page: Page) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`❌ Browser console error: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      console.warn(`⚠️ Browser console warning: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.error(`❌ Page error: ${error.message}`);
  });
}

// Export all helpers
export default {
  TEST_USERS,
  loginUser,
  registerUser,
  logout,
  takeScreenshot,
  clickWithScreenshot,
  fillFormWithScreenshots,
  testHoverState,
  testKeyboardNavigation,
  waitForAnimation,
  testResponsive,
  createTestFlashcard,
  createTestMindMap,
  verifyVisible,
  testDragAndDrop,
  uploadFile,
  testErrorState,
  setupConsoleLogging
};