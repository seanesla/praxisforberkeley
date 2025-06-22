import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test.describe('Full Feature Test', () => {
  const testUser = {
    email: `test-${randomUUID()}@praxis.ai`,
    password: 'Test123!@#',
    name: 'Test User'
  };

  test('complete user journey through all features', async ({ page, context }) => {
    test.setTimeout(600000); // 10 minutes for full test
    
    console.log('Starting full feature test...');
    console.log('Test user:', testUser.email);

    // 1. REGISTRATION
    console.log('\n1. Testing Registration...');
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[placeholder="Enter your name"]', testUser.name);
    await page.fill('input[placeholder="Enter your email"]', testUser.email);
    await page.fill('input[placeholder="At least 8 characters"]', testUser.password);
    await page.fill('input[placeholder="Confirm your password"]', testUser.password);
    
    await page.screenshot({ path: 'screenshots/01-registration-form.png', fullPage: true });
    
    await page.click('button:has-text("Create account")');
    
    // Wait for either dashboard or login redirect
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 });
    
    // 2. LOGIN (if redirected to login)
    if (page.url().includes('/login')) {
      console.log('\n2. Testing Login...');
      await page.fill('input[placeholder="Enter your email"]', testUser.email);
      await page.fill('input[placeholder="Enter your password"]', testUser.password);
      await page.screenshot({ path: 'screenshots/02-login-form.png', fullPage: true });
      await page.click('button:has-text("Sign in")');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    // 3. DASHBOARD
    console.log('\n3. Testing Dashboard...');
    await page.waitForTimeout(3000); // Wait for all components to load
    await page.screenshot({ path: 'screenshots/03-dashboard-full.png', fullPage: true });
    
    // Test Command Palette
    console.log('\n4. Testing Command Palette...');
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/04-command-palette.png', fullPage: true });
    await page.keyboard.type('create smart note');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/05-command-search.png', fullPage: true });
    await page.keyboard.press('Escape');
    
    // Test AI Assistant
    console.log('\n5. Testing AI Assistant...');
    await page.keyboard.press('Meta+/');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/06-ai-assistant.png', fullPage: true });
    await page.fill('input[placeholder="Ask anything about your documents..."]', 'How does Praxis work?');
    await page.screenshot({ path: 'screenshots/07-ai-question.png', fullPage: true });
    await page.keyboard.press('Escape');
    
    // 4. DOCUMENT UPLOAD
    console.log('\n6. Testing Document Upload...');
    await page.click('text=Upload Document');
    await page.waitForTimeout(1000);
    
    // Create a test file
    const testContent = `# Test Document
    
This is a test document for Praxis.
It contains information about machine learning and AI.

## Key Concepts
- Neural Networks
- Deep Learning
- Natural Language Processing

## Summary
This document explores the fundamentals of AI and its applications.`;
    
    const buffer = Buffer.from(testContent, 'utf-8');
    const testFile = {
      name: 'test-document.md',
      mimeType: 'text/markdown',
      buffer: buffer
    };
    
    // Upload file
    await page.locator('input[type="file"]').setInputFiles({
      name: testFile.name,
      mimeType: testFile.mimeType,
      buffer: testFile.buffer
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/08-document-upload.png', fullPage: true });
    
    // Wait for upload button and click
    await page.click('button:has-text("Upload All")');
    await page.waitForTimeout(3000);
    
    // 5. DOCUMENTS PAGE
    console.log('\n7. Testing Documents Page...');
    await page.goto('http://localhost:3000/documents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/09-documents-list.png', fullPage: true });
    
    // 6. CREATE SMART NOTE
    console.log('\n8. Testing Smart Note Creation...');
    await page.goto('http://localhost:3000/notes/new?smart=true');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[placeholder="Note title..."]', 'My Smart Note with AI');
    await page.click('text=Add tag');
    await page.keyboard.type('ai-test');
    await page.keyboard.press('Enter');
    
    // Select document if available
    const documentButton = page.locator('button:has-text("test-document.md")').first();
    if (await documentButton.count() > 0) {
      await documentButton.click();
    }
    
    await page.screenshot({ path: 'screenshots/10-smart-note-setup.png', fullPage: true });
    
    // Type in editor to trigger AI suggestions
    const editor = page.locator('textarea[placeholder*="Start typing"]');
    await editor.click();
    await editor.type('Machine learning is ');
    await page.waitForTimeout(2000); // Wait for AI suggestions
    
    await page.screenshot({ path: 'screenshots/11-smart-note-suggestions.png', fullPage: true });
    
    // 7. TEST OTHER FEATURES
    console.log('\n9. Testing Quick Actions...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Hover over quick actions to show them
    const quickActions = page.locator('text=Quick Actions').first();
    await quickActions.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/12-quick-actions.png', fullPage: true });
    
    // Test activity feed
    const activityFeed = page.locator('text=Activity Feed').first();
    await activityFeed.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/13-activity-feed.png', fullPage: true });
    
    // Test analytics
    const analytics = page.locator('text=Analytics').first();
    await analytics.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/14-analytics.png', fullPage: true });
    
    console.log('\n✅ All tests completed!');
    console.log('Screenshots saved in screenshots/ directory');
    
    // Keep browser open for manual inspection
    console.log('\n Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
  });
});