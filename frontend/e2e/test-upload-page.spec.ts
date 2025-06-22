import { test, expect } from '@playwright/test';

test.describe('Document Upload Page Test', () => {
  test('Access document upload page directly', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Navigate directly to upload page
    console.log('Navigating to document upload page...');
    await page.goto('http://localhost:3000/dashboard/documents/upload');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'document-upload-direct.png', fullPage: true });
    
    // Check if upload UI is visible
    const hasDropzone = await page.locator('text=Drag & drop files here').count();
    console.log('Found dropzone:', hasDropzone > 0);
    
    // Check for error messages
    const errorText = await page.locator('.text-red-400, .text-red-500').allTextContents();
    if (errorText.length > 0) {
      console.log('Error messages:', errorText);
    }
    
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
  });
});