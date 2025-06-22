import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

/**
 * Global setup runs once before all tests
 * Sets up test environment and authentication
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup');
  
  // Create necessary directories
  const directories = [
    'test-results',
    'playwright-report',
    'screenshots',
    '.auth'
  ];
  
  for (const dir of directories) {
    await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
  }
  
  // Set environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_TELEMETRY_DISABLED = '1';
  
  // Check if we need to create test users
  if (!process.env.SKIP_AUTH_SETUP) {
    console.log('🔐 Setting up authentication');
    
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Navigate to the app
      const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
      await page.goto(baseURL);
      
      // Create test users if they don't exist
      const testUsers = [
        {
          email: 'test.primary@example.com',
          password: 'TestPass123!',
          name: 'Primary Test User'
        },
        {
          email: 'test.secondary@example.com',
          password: 'TestPass456!',
          name: 'Secondary Test User'
        }
      ];
      
      for (const user of testUsers) {
        try {
          // Try to register the user
          await page.goto(`${baseURL}/register`);
          await page.fill('input[name="name"]', user.name);
          await page.fill('input[name="email"]', user.email);
          await page.fill('input[name="password"]', user.password);
          await page.fill('input[name="confirmPassword"]', user.password);
          await page.click('button[type="submit"]');
          
          // Wait for redirect
          await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 }).catch(() => {});
          
          console.log(`✅ Created test user: ${user.email}`);
        } catch (error) {
          // User might already exist, try logging in
          await page.goto(`${baseURL}/login`);
          await page.fill('input[type="email"]', user.email);
          await page.fill('input[type="password"]', user.password);
          await page.click('button[type="submit"]');
          
          if (await page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => null)) {
            console.log(`✅ Test user already exists: ${user.email}`);
          } else {
            console.error(`❌ Failed to setup user: ${user.email}`, error);
          }
        }
      }
      
      // Save authentication state for the primary user
      await page.goto(`${baseURL}/login`);
      await page.fill('input[type="email"]', testUsers[0].email);
      await page.fill('input[type="password"]', testUsers[0].password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      
      // Save storage state
      await context.storageState({ path: '.auth/user.json' });
      console.log('💾 Saved authentication state');
      
    } catch (error) {
      console.error('❌ Error during global setup:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
  
  // Setup test database if needed
  if (process.env.TEST_DATABASE_URL) {
    console.log('🗄️ Setting up test database');
    // Database setup logic would go here
  }
  
  // Create performance baseline file
  const performanceBaseline = {
    timestamp: new Date().toISOString(),
    environment: process.env.CI ? 'ci' : 'local',
    baselines: {
      pageLoad: 3000,
      apiResponse: 1000,
      interaction: 300
    }
  };
  
  await fs.writeFile(
    'test-results/performance-baseline.json',
    JSON.stringify(performanceBaseline, null, 2)
  );
  
  console.log('✅ Global setup completed');
  
  // Return a teardown function
  return async () => {
    console.log('🧹 Running global teardown');
  };
}

export default globalSetup;