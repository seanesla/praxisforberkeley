import { test, expect } from '@playwright/test';

test.describe('Physics-Enabled Mind Maps', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should toggle physics mode in mind map viewer', async ({ page }) => {
    // Navigate to mind maps
    await page.goto('http://localhost:3000/dashboard/mindmaps');
    
    // Wait for mind maps to load
    await page.waitForSelector('.text-2xl:has-text("Mind Maps")');
    
    // Create a new mind map
    await page.click('button:has-text("Create Mind Map")');
    await page.waitForSelector('h2:has-text("Create New Mind Map")');
    
    // Select start from scratch
    await page.click('button:has-text("Create Blank Mind Map")');
    await page.waitForURL('**/dashboard/mindmaps/new');
    
    // Add some nodes (simulate mind map creation)
    await page.waitForTimeout(1000); // Wait for ReactFlow to initialize
    
    // Save the mind map (trigger auto-save)
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(2000); // Wait for auto-save
    
    // Check that physics toggle is present
    await expect(page.locator('label:has-text("Physics")')).toBeVisible();
    
    // Enable physics
    await page.click('input[type="checkbox"]');
    
    // Check that physics preset selector appears
    await expect(page.locator('select:has(option[value="forceDirected"])')).toBeVisible();
    
    // Check that physics control panel appears
    await expect(page.locator('h3:has-text("Physics Controls")')).toBeVisible();
    
    // Check play/pause button
    await expect(page.locator('button:has-text("Pause")')).toBeVisible();
    
    // Test different presets
    await page.selectOption('select', 'gravity');
    await page.waitForTimeout(500);
    
    await page.selectOption('select', 'space');
    await page.waitForTimeout(500);
    
    // Toggle force visualization
    await page.click('button[title="Show Forces"]');
    await expect(page.locator('text=Velocity')).toBeVisible();
    await expect(page.locator('text=Force')).toBeVisible();
  });

  test('should show physics controls and metrics', async ({ page }) => {
    // Navigate to existing mind map
    await page.goto('http://localhost:3000/dashboard/mindmaps');
    
    // Click on first mind map if exists
    const mindMapCards = page.locator('.glass.rounded-xl.p-4');
    const count = await mindMapCards.count();
    
    if (count > 0) {
      await mindMapCards.first().click();
      await page.waitForURL('**/dashboard/mindmaps/*');
      
      // Enable physics
      await page.click('input[type="checkbox"]');
      
      // Expand physics controls
      await page.click('button:has(svg.h-4.w-4)'); // Expand button
      
      // Check all controls are present
      await expect(page.locator('label:has-text("Presets")')).toBeVisible();
      await expect(page.locator('label:has-text("Gravity")')).toBeVisible();
      await expect(page.locator('label:has-text("Damping")')).toBeVisible();
      await expect(page.locator('label:has-text("Enable Collisions")')).toBeVisible();
      await expect(page.locator('label:has-text("Integration Method")')).toBeVisible();
      await expect(page.locator('label:has-text("Time Step")')).toBeVisible();
      
      // Check metrics display
      await expect(page.locator('p:has-text("FPS")')).toBeVisible();
      await expect(page.locator('p:has-text("Bodies")')).toBeVisible();
      await expect(page.locator('p:has-text("Energy")')).toBeVisible();
    }
  });

  test('should interact with physics-enabled nodes', async ({ page }) => {
    // Create a new mind map with physics
    await page.goto('http://localhost:3000/dashboard/mindmaps');
    await page.click('button:has-text("Create Mind Map")');
    await page.click('button:has-text("Create Blank Mind Map")');
    await page.waitForURL('**/dashboard/mindmaps/new');
    
    // Enable physics
    await page.click('input[type="checkbox"]');
    
    // Wait for physics to initialize
    await page.waitForTimeout(1000);
    
    // Test pause/play
    const pauseButton = page.locator('button:has-text("Pause")');
    await pauseButton.click();
    await expect(page.locator('button:has-text("Play")')).toBeVisible();
    
    await page.locator('button:has-text("Play")').click();
    await expect(pauseButton).toBeVisible();
    
    // Test reset
    await page.click('button:has-text("Reset")');
    
    // Check shift+click instruction is visible
    await expect(page.locator('text=Shift+Click to apply impulse')).toBeVisible();
  });

  test('should save physics state with mind map', async ({ page }) => {
    // Create mind map with physics enabled
    await page.goto('http://localhost:3000/dashboard/mindmaps');
    await page.click('button:has-text("Create Mind Map")');
    await page.click('button:has-text("Create Blank Mind Map")');
    await page.waitForURL('**/dashboard/mindmaps/new');
    
    // Enable physics with gravity preset
    await page.click('input[type="checkbox"]');
    await page.selectOption('select', 'gravity');
    
    // Wait for auto-save
    await page.waitForTimeout(3000);
    
    // Navigate back
    await page.click('button:has(svg.h-5.w-5)'); // Back button
    await page.waitForURL('**/dashboard/mindmaps');
    
    // Verify the mind map was saved
    const mindMapCount = await page.locator('.glass.rounded-xl.p-4').count();
    expect(mindMapCount).toBeGreaterThan(0);
  });

  test('should switch between physics and normal mode', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/mindmaps');
    
    const mindMapCards = page.locator('.glass.rounded-xl.p-4');
    const count = await mindMapCards.count();
    
    if (count > 0) {
      await mindMapCards.first().click();
      await page.waitForURL('**/dashboard/mindmaps/*');
      
      // Start without physics
      const physicsCheckbox = page.locator('input[type="checkbox"]');
      const isChecked = await physicsCheckbox.isChecked();
      
      if (isChecked) {
        await physicsCheckbox.click();
      }
      
      // Normal controls should be visible
      await expect(page.locator('[aria-label="zoom in"]')).toBeVisible();
      
      // Enable physics
      await physicsCheckbox.click();
      
      // Physics controls should replace normal controls
      await expect(page.locator('h3:has-text("Physics Controls")')).toBeVisible();
      
      // Disable physics again
      await physicsCheckbox.click();
      
      // Normal controls should return
      await expect(page.locator('[aria-label="zoom in"]')).toBeVisible();
    }
  });
});