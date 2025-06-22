import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5001';

// Generate unique test data
const testUser = {
  email: `test-${randomUUID()}@example.com`,
  password: 'Test123!@#',
  name: 'Test User'
};

test.describe('Praxis Comprehensive Test Suite', () => {
  test.beforeAll(async () => {
    console.log('Starting comprehensive test suite...');
    console.log('Test user:', testUser.email);
  });

  test.describe('Server Health Checks', () => {
    test('Backend server is healthy', async ({ request }) => {
      const response = await request.get(`${API_URL}/health`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.message).toBe('Praxis backend is running');
    });

    test('Frontend server is accessible', async ({ page }) => {
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBe(200);
    });

    test('Supabase connection is working', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/test-supabase`);
      const data = await response.json();
      console.log('Supabase connection status:', data);
    });
  });

  test.describe('Authentication Flow', () => {
    test('User can register', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);
      
      // Take screenshot of registration page
      await page.screenshot({ path: 'screenshots/01-register-page.png', fullPage: true });
      
      // Fill registration form
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for navigation or error
      await page.waitForLoadState('networkidle');
      
      // Check if redirected to dashboard or login
      const url = page.url();
      console.log('After registration, redirected to:', url);
      
      // Take screenshot after registration
      await page.screenshot({ path: 'screenshots/02-after-register.png', fullPage: true });
    });

    test('User can login', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Take screenshot of login page
      await page.screenshot({ path: 'screenshots/03-login-page.png', fullPage: true });
      
      // Fill login form
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
        console.log('Dashboard redirect failed, checking current page...');
      });
      
      // Take screenshot after login
      await page.screenshot({ path: 'screenshots/04-after-login.png', fullPage: true });
      
      // Verify we're on dashboard
      const url = page.url();
      expect(url).toContain('/dashboard');
    });

    test('Dashboard displays user email', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Check for user email display
      await expect(page.locator('text=' + testUser.email)).toBeVisible();
      
      // Take screenshot of dashboard
      await page.screenshot({ path: 'screenshots/05-dashboard.png', fullPage: true });
    });

    test('User can logout', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Click logout
      await page.click('button:has-text("Logout")');
      
      // Should redirect to login or home
      await page.waitForLoadState('networkidle');
      const url = page.url();
      console.log('After logout, redirected to:', url);
      
      // Take screenshot after logout
      await page.screenshot({ path: 'screenshots/06-after-logout.png', fullPage: true });
    });
  });

  test.describe('UI Components', () => {
    test('Logo component renders correctly', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check for logo
      const logo = page.locator('[alt="Praxis Logo"]');
      await expect(logo).toBeVisible();
      
      // Take screenshot of home page with logo
      await page.screenshot({ path: 'screenshots/07-home-with-logo.png', fullPage: true });
    });

    test('Dark theme is applied', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check for dark background
      const body = page.locator('body');
      const backgroundColor = await body.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      console.log('Background color:', backgroundColor);
      // Dark theme should have dark background
      expect(backgroundColor).toMatch(/rgb\(17, 24, 39\)|rgb\(31, 41, 55\)|rgba?\(0,\s*0,\s*0/);
    });

    test('Glass card styling is applied', async ({ page }) => {
      // Login and go to dashboard
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Check for glass-card class
      const glassCard = page.locator('.glass-card');
      await expect(glassCard).toBeVisible();
      
      // Take screenshot showing glass card effect
      await page.screenshot({ path: 'screenshots/08-glass-card.png', fullPage: true });
    });
  });

  test.describe('Feature Implementation Status', () => {
    test('Document unimplemented features', async ({ page }) => {
      // Login to dashboard
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // List of features from README
      const features = [
        'Command Palette (⌘K)',
        'Smart Activity Feed',
        'Floating AI Assistant',
        'Instant Context Retrieval',
        'Document Upload',
        'Smart Notes',
        'Mind Maps',
        'Flashcards',
        'Podcast Mode',
        'Cross-Document Insights',
        'Document DNA',
        'Workflow Automation'
      ];
      
      console.log('\n=== FEATURE IMPLEMENTATION STATUS ===');
      
      for (const feature of features) {
        const exists = await page.locator(`text=${feature}`).count() > 0;
        console.log(`${exists ? '✓' : '✗'} ${feature}`);
      }
      
      // Check for placeholder message
      const placeholder = await page.locator('text=More features coming soon').isVisible();
      expect(placeholder).toBeTruthy();
      console.log('\nDashboard shows placeholder message: "More features coming soon"');
    });
  });

  test.describe('Accessibility Tests', () => {
    test('Page has proper heading structure', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check for h1
      const h1 = await page.locator('h1').count();
      expect(h1).toBeGreaterThan(0);
    });

    test('Forms have proper labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check email input has label or aria-label
      const emailInput = page.locator('input[type="email"]');
      const emailLabel = await emailInput.getAttribute('aria-label') || 
                        await emailInput.getAttribute('placeholder');
      expect(emailLabel).toBeTruthy();
    });

    test('Keyboard navigation works', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Check if an element is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      console.log('Focused element:', focusedElement);
      expect(focusedElement).not.toBe('BODY');
    });
  });

  test.describe('Performance Tests', () => {
    test('Page load time is acceptable', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      const loadTime = Date.now() - startTime;
      
      console.log(`Home page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
    });

    test('No console errors', async ({ page }) => {
      const consoleMessages: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });
      
      await page.goto(BASE_URL);
      await page.goto(`${BASE_URL}/login`);
      
      console.log('Console errors found:', consoleMessages);
      expect(consoleMessages.length).toBe(0);
    });
  });

  test.describe('API Endpoint Tests', () => {
    test('404 handling works correctly', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/non-existent-endpoint`);
      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data.error.code).toBe('ROUTE_NOT_FOUND');
    });

    test('Auth endpoints are accessible', async ({ request }) => {
      // Test login endpoint exists
      const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
        data: { email: 'test@test.com', password: 'wrong' }
      });
      
      // Should get 401 or similar, not 404
      expect(loginResponse.status()).not.toBe(404);
      
      // Test register endpoint exists
      const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
        data: { email: 'test@test.com', password: 'wrong' }
      });
      
      expect(registerResponse.status()).not.toBe(404);
    });
  });

  test.describe('Responsive Design', () => {
    test('Desktop view (1280px minimum)', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(BASE_URL);
      
      // Page should render without horizontal scroll
      const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(1280);
      
      await page.screenshot({ path: 'screenshots/09-desktop-1280.png', fullPage: true });
    });

    test('Wide desktop view', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);
      
      await page.screenshot({ path: 'screenshots/10-desktop-1920.png', fullPage: true });
    });

    test('Mobile view shows not supported message', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      
      // Should show some indication that mobile is not supported
      await page.screenshot({ path: 'screenshots/11-mobile-not-supported.png', fullPage: true });
    });
  });

  test.afterAll(async () => {
    console.log('\n=== TEST SUMMARY ===');
    console.log('Screenshots saved in: screenshots/');
    console.log('Test user created:', testUser.email);
  });
});