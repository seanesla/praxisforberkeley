import { test } from '@playwright/test';

test('capture instant context retrieval demo', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com'); 
  await page.fill('input[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Navigate to smart note creation
  await page.goto('/notes/new?smart=true');
  await page.waitForLoadState('networkidle');
  
  // Fill in title
  await page.fill('input[placeholder="Note title..."]', 'Research Notes on Quantum Computing');
  
  // Capture initial smart note page
  await page.screenshot({ 
    path: 'screenshots/instant-context-01-smart-note-page.png',
    fullPage: true 
  });
  
  // Type in the editor
  const editor = page.locator('textarea[placeholder*="Start typing"]');
  if (await editor.isVisible()) {
    await editor.fill('Quantum computing is');
    
    // Wait for ghost text to appear (1.5 second pause)
    await page.waitForTimeout(2000);
    
    // Capture with ghost text
    await page.screenshot({ 
      path: 'screenshots/instant-context-02-ghost-text.png',
      fullPage: true 
    });
    
    // Type more content
    await editor.fill('Quantum computing is fascinating. Let me explore the key concepts including');
    await page.waitForTimeout(2000);
    
    // Capture alternative suggestions
    await page.screenshot({ 
      path: 'screenshots/instant-context-03-suggestions.png',
      fullPage: true 
    });
  }
  
  // Show the keyboard shortcuts
  const shortcutsVisible = page.locator('text=Tab').first();
  if (await shortcutsVisible.isVisible({ timeout: 5000 })) {
    await page.screenshot({ 
      path: 'screenshots/instant-context-04-shortcuts.png',
      clip: {
        x: 0,
        y: 400,
        width: 800,
        height: 400
      }
    });
  }
});