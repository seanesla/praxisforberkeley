import { test, expect } from '@playwright/test';
import { 
  TEST_USERS,
  loginUser,
  registerUser,
  logout,
  takeScreenshot,
  clickWithScreenshot,
  fillFormWithScreenshots,
  testHoverState,
  waitForAnimation,
  testResponsive,
  verifyVisible,
  testErrorState,
  setupConsoleLogging
} from './helpers/test-helpers';

test.describe('Authentication - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await page.goto('/');
    await waitForAnimation(page);
  });

  test('Complete authentication flow with visual regression', async ({ page }) => {
    console.log('🚀 Starting comprehensive authentication test');
    
    // Test 1: Landing page
    await test.step('Landing page', async () => {
      await takeScreenshot(page, 'auth-01-landing-page');
      await testResponsive(page, 'auth-landing');
      
      // Test hover states on buttons
      await testHoverState(page, 'a[href="/login"]', 'auth-login-button');
      await testHoverState(page, 'a[href="/register"]', 'auth-register-button');
    });

    // Test 2: Registration flow
    await test.step('Registration flow', async () => {
      await clickWithScreenshot(page, 'a[href="/register"]', 'auth-go-to-register');
      await waitForAnimation(page);
      
      // Empty form validation
      await testErrorState(
        page,
        async () => {
          await page.click('button[type="submit"]');
        },
        'required',
        'auth-register-validation'
      );
      
      // Fill registration form step by step
      await fillFormWithScreenshots(page, {
        'input[name="name"]': TEST_USERS.primary.name,
        'input[name="email"]': TEST_USERS.primary.email,
        'input[name="password"]': TEST_USERS.primary.password,
        'input[name="confirmPassword"]': TEST_USERS.primary.password
      }, 'auth-register-form');
      
      // Test password mismatch
      await page.fill('input[name="confirmPassword"]', 'WrongPassword123!');
      await takeScreenshot(page, 'auth-register-password-mismatch');
      
      // Fix password and submit
      await page.fill('input[name="confirmPassword"]', TEST_USERS.primary.password);
      await clickWithScreenshot(page, 'button[type="submit"]', 'auth-register-submit');
      
      // Wait for redirect
      await page.waitForURL(/\/(dashboard|verify-email|login)/, { timeout: 10000 });
      await takeScreenshot(page, 'auth-register-success');
    });

    // Test 3: Login flow
    await test.step('Login flow', async () => {
      await page.goto('/login');
      await waitForAnimation(page);
      await takeScreenshot(page, 'auth-02-login-page');
      
      // Test empty form validation
      await testErrorState(
        page,
        async () => {
          await page.click('button[type="submit"]');
        },
        'required',
        'auth-login-validation'
      );
      
      // Test invalid credentials
      await page.fill('input[type="email"]', 'wrong@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await clickWithScreenshot(page, 'button[type="submit"]', 'auth-login-invalid');
      
      // Look for error message
      const errorMessage = page.locator('text=/invalid|incorrect|failed/i');
      if (await errorMessage.isVisible()) {
        await takeScreenshot(page, 'auth-login-error-message');
      }
      
      // Login with correct credentials
      await page.fill('input[type="email"]', TEST_USERS.primary.email);
      await page.fill('input[type="password"]', TEST_USERS.primary.password);
      await takeScreenshot(page, 'auth-login-filled');
      
      await clickWithScreenshot(page, 'button[type="submit"]', 'auth-login-submit');
      
      // Wait for dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await waitForAnimation(page);
      await takeScreenshot(page, 'auth-03-dashboard-after-login');
      
      // Verify user is logged in
      await verifyVisible(page, `text=${TEST_USERS.primary.name}`, 'auth-username-display');
    });

    // Test 4: Session persistence
    await test.step('Session persistence', async () => {
      // Reload page
      await page.reload();
      await waitForAnimation(page);
      await takeScreenshot(page, 'auth-session-after-reload');
      
      // Should still be on dashboard
      expect(page.url()).toContain('/dashboard');
      
      // Navigate away and back
      await page.goto('/');
      await page.goto('/dashboard');
      await waitForAnimation(page);
      await takeScreenshot(page, 'auth-session-navigation');
    });

    // Test 5: Logout flow
    await test.step('Logout flow', async () => {
      // Find logout button (might be in dropdown)
      const userMenu = page.locator('[data-testid="user-menu"], button:has-text("' + TEST_USERS.primary.name + '")');
      if (await userMenu.isVisible()) {
        await clickWithScreenshot(page, userMenu, 'auth-user-menu');
      }
      
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();
      await clickWithScreenshot(page, logoutButton, 'auth-logout');
      
      // Should redirect to login
      await page.waitForURL('**/login', { timeout: 5000 });
      await takeScreenshot(page, 'auth-04-after-logout');
      
      // Try to access protected route
      await page.goto('/dashboard');
      await waitForAnimation(page);
      
      // Should redirect to login
      expect(page.url()).toContain('/login');
      await takeScreenshot(page, 'auth-protected-route-redirect');
    });

    // Test 6: Password reset flow
    await test.step('Password reset flow', async () => {
      await page.goto('/login');
      await waitForAnimation(page);
      
      const forgotLink = page.locator('a:has-text("Forgot password"), a:has-text("Reset password")');
      if (await forgotLink.isVisible()) {
        await clickWithScreenshot(page, forgotLink, 'auth-forgot-password-link');
        
        // Fill reset form
        await page.fill('input[type="email"]', TEST_USERS.primary.email);
        await takeScreenshot(page, 'auth-reset-password-form');
        
        await clickWithScreenshot(page, 'button[type="submit"]', 'auth-reset-password-submit');
        
        // Look for success message
        await waitForAnimation(page);
        await takeScreenshot(page, 'auth-reset-password-success');
      }
    });

    // Test 7: Multiple user sessions
    await test.step('Multiple user sessions', async () => {
      // Login as secondary user
      await loginUser(page, TEST_USERS.secondary);
      await takeScreenshot(page, 'auth-secondary-user-dashboard');
      
      // Verify correct user
      await verifyVisible(page, `text=${TEST_USERS.secondary.name}`, 'auth-secondary-username');
      
      // Logout
      await logout(page);
      
      // Login as primary user again
      await loginUser(page, TEST_USERS.primary);
      await takeScreenshot(page, 'auth-primary-user-return');
    });

    console.log('✅ Authentication tests completed');
  });

  test('Test authentication error states', async ({ page }) => {
    await test.step('SQL injection attempt', async () => {
      await page.goto('/login');
      await page.fill('input[type="email"]', "admin'--");
      await page.fill('input[type="password"]', "' OR '1'='1");
      await clickWithScreenshot(page, 'button[type="submit"]', 'auth-sql-injection-attempt');
      
      // Should show error, not crash
      await waitForAnimation(page);
      const errorVisible = await page.locator('text=/error|invalid/i').isVisible();
      expect(errorVisible).toBeTruthy();
    });

    await test.step('XSS attempt', async () => {
      await page.goto('/register');
      await page.fill('input[name="name"]', '<script>alert("XSS")</script>');
      await page.fill('input[name="email"]', 'xss@test.com');
      await page.fill('input[name="password"]', 'Test123!');
      await page.fill('input[name="confirmPassword"]', 'Test123!');
      await clickWithScreenshot(page, 'button[type="submit"]', 'auth-xss-attempt');
      
      // Should sanitize input, not execute script
      await waitForAnimation(page);
    });

    await test.step('Rate limiting', async () => {
      await page.goto('/login');
      
      // Try multiple failed logins
      for (let i = 0; i < 5; i++) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        await waitForAnimation(page);
      }
      
      await takeScreenshot(page, 'auth-rate-limiting');
    });
  });

  test('Test responsive authentication forms', async ({ page }) => {
    const pages = [
      { url: '/login', name: 'login' },
      { url: '/register', name: 'register' }
    ];

    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await waitForAnimation(page);
      
      // Test different viewport sizes
      const viewports = [
        { width: 320, height: 568, name: 'mobile-small' },
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'desktop' },
        { width: 1920, height: 1080, name: 'desktop-hd' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await waitForAnimation(page);
        await takeScreenshot(page, `auth-responsive-${pageInfo.name}-${viewport.name}`);
      }
    }
  });

  test('Test keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    await waitForAnimation(page);
    
    // Tab through form
    await page.keyboard.press('Tab'); // Focus email
    await takeScreenshot(page, 'auth-keyboard-email-focus');
    
    await page.keyboard.type(TEST_USERS.primary.email);
    
    await page.keyboard.press('Tab'); // Focus password
    await takeScreenshot(page, 'auth-keyboard-password-focus');
    
    await page.keyboard.type(TEST_USERS.primary.password);
    
    await page.keyboard.press('Tab'); // Focus submit button
    await takeScreenshot(page, 'auth-keyboard-submit-focus');
    
    await page.keyboard.press('Enter'); // Submit form
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await takeScreenshot(page, 'auth-keyboard-login-success');
  });
});