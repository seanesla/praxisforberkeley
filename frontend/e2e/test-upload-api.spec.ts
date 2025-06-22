import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Upload API Test', () => {
  test('Test document upload functionality', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Navigate to upload page
    await page.goto('http://localhost:3000/dashboard/documents/upload');
    await page.waitForTimeout(2000);
    
    // Create a test file
    const testFilePath = path.join(__dirname, '../../test-document.txt');
    
    // Upload file using file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=Drag & drop files here');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testFilePath);
    
    // Wait for file to appear in list
    await expect(page.locator('text=test-document.txt')).toBeVisible();
    
    // Click upload button
    await page.click('button:has-text("Upload")');
    
    // Monitor network for the upload request
    page.on('response', response => {
      if (response.url().includes('/api/documents/upload')) {
        console.log('Upload response status:', response.status());
        console.log('Upload response URL:', response.url());
      }
    });
    
    // Check for error messages
    await page.waitForTimeout(5000);
    const errorText = await page.locator('.text-red-400, .text-red-500, [class*="error"]').allTextContents();
    if (errorText.length > 0) {
      console.log('Error messages found:', errorText);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'upload-test-result.png', fullPage: true });
    
    // Check console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });
});