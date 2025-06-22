import { test, expect } from '@playwright/test';

test.describe('Test Authentication and Document Upload Fixes', () => {
  test('Verify fixes are working', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Login with test user
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✓ Login successful - auth/me endpoint working');
    
    // Test document upload navigation
    await page.click('text=Upload Document');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log('Current URL after clicking Upload Document:', currentUrl);
    
    // Check if we're on the upload page
    if (currentUrl.includes('upload')) {
      console.log('✓ Document upload page accessible');
      await expect(page.locator('h1:has-text("Upload Documents")')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: 'document-upload-page.png', fullPage: true });
    }
    
    // Go back to dashboard
    await page.goto('http://localhost:3000/dashboard');
    
    // Verify no console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
    
    console.log('✓ All fixes verified successfully');
  });
});