import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially for better observation
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for ultra test
  workers: 1, // Single worker for consistent experience
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/ultra-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on',
    screenshot: {
      mode: 'on',
      fullPage: true
    },
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 }
    },
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 30000,
    navigationTimeout: 30000,
    launchOptions: {
      slowMo: 100 // Slow down actions by 100ms for visibility
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          headless: false,
          args: ['--disable-dev-shm-usage', '--no-sandbox', '--start-maximized'],
          slowMo: 100
        }
      },
    }
  ],

  // No webServer config - we'll use the already running server on port 3001
  
  outputDir: 'test-results/',
});