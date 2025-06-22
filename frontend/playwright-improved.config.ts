import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Import test configuration
const TEST_CONFIG = {
  timeouts: {
    navigation: 30000,
    element: 5000,
    network: 10000,
    animation: 1000,
  },
  retries: {
    test: 2,
    element: 3,
  },
  performance: {
    pageLoad: 3000,
    apiResponse: 1000,
  }
};

/**
 * Enhanced Playwright configuration with improved performance and stability
 */
export default defineConfig({
  name: 'Praxis E2E Tests',
  testDir: './e2e',
  
  /* Test execution settings */
  fullyParallel: process.env.CI ? false : true, // Sequential in CI for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? TEST_CONFIG.retries.test : 1,
  workers: process.env.CI ? 2 : undefined, // Limited parallelism in CI
  
  /* Timeout configuration */
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: TEST_CONFIG.timeouts.element,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled',
    }
  },
  
  /* Global test configuration */
  globalSetup: path.resolve(__dirname, './e2e/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './e2e/global-teardown.ts'),
  
  /* Output settings */
  outputDir: './test-results',
  preserveOutput: 'failures-only',
  
  /* Reporter configuration */
  reporter: [
    ['list', { printSteps: true }],
    ['html', { 
      open: process.env.CI ? 'never' : 'on-failure',
      outputFolder: 'playwright-report',
      host: '0.0.0.0',
      port: 9323
    }],
    ['json', { 
      outputFile: 'test-results/results.json',
      outputFolder: 'test-results'
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml',
      embedAnnotationsAsProperties: true,
      stripANSIControlSequences: true
    }],
    process.env.CI ? ['github'] : null,
    // Custom reporter for performance metrics
    ['./e2e/reporters/performance-reporter.ts'],
  ].filter(Boolean) as any,
  
  /* Metadata for reports */
  metadata: {
    environment: process.env.CI ? 'ci' : 'local',
    branch: process.env.GITHUB_REF_NAME || 'local',
    commit: process.env.GITHUB_SHA || 'local',
    runId: process.env.GITHUB_RUN_ID || Date.now().toString(),
  },
  
  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* API URL for backend testing */
    extraHTTPHeaders: {
      'X-Test-Suite': 'playwright-e2e',
      'X-Test-Run-Id': process.env.GITHUB_RUN_ID || Date.now().toString(),
    },
    
    /* Timeouts */
    actionTimeout: TEST_CONFIG.timeouts.element,
    navigationTimeout: TEST_CONFIG.timeouts.navigation,
    
    /* Viewport */
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2, // Retina screenshots
    
    /* Context options */
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    
    /* Screenshot settings */
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
      animations: 'disabled',
    },
    
    /* Video recording */
    video: {
      mode: process.env.CI ? 'retain-on-failure' : 'off',
      size: { width: 1920, height: 1080 }
    },
    
    /* Trace collection */
    trace: {
      mode: 'retain-on-failure',
      screenshots: true,
      snapshots: true,
      sources: true,
    },
    
    /* Browser context options */
    contextOptions: {
      reducedMotion: 'reduce',
      forcedColors: 'none',
    },
    
    /* Permissions */
    permissions: ['clipboard-read', 'clipboard-write', 'notifications'],
    
    /* Geolocation */
    geolocation: { longitude: -122.4194, latitude: 37.7749 }, // San Francisco
    
    /* User agent */
    userAgent: process.env.CI 
      ? 'Mozilla/5.0 (Playwright E2E Tests; CI) AppleWebKit/537.36'
      : undefined,
  },

  /* Configure projects for different scenarios */
  projects: [
    /* Setup/Teardown projects */
    {
      name: 'setup',
      testMatch: /global-setup\\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /global-teardown\\.ts/,
    },
    
    /* Desktop browsers */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: process.env.CI ? undefined : 'chrome',
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
          ]
        }
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
          }
        }
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    /* Mobile testing */
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        hasTouch: true,
        isMobile: true,
      },
      testMatch: '**/*mobile*.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true,
      },
      testMatch: '**/*mobile*.spec.ts',
      dependencies: ['setup'],
    },
    
    /* Specialized testing projects */
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-gpu-benchmarking',
            '--enable-thread-composting',
          ]
        }
      },
      testMatch: '**/*performance*.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        forcedColors: 'active',
      },
      testMatch: '**/*accessibility*.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent rendering for visual tests
        launchOptions: {
          args: [
            '--font-render-hinting=none',
            '--disable-skia-renderer',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
          ]
        }
      },
      testMatch: '**/*visual*.spec.ts',
      retries: 0, // No retries for visual tests
    },
    
    /* API testing project */
    {
      name: 'api',
      use: {
        baseURL: process.env.API_URL || 'http://localhost:3001',
      },
      testMatch: '**/*api*.spec.ts',
    },
  ],

  /* Web server configuration */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
    {
      command: 'cd ../backend && npm run dev:test',
      url: 'http://localhost:3001/health',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        JWT_SECRET: 'test-secret',
        PORT: '3001',
      },
    },
  ],
  
  /* Test filtering */
  grep: process.env.GREP ? new RegExp(process.env.GREP) : undefined,
  grepInvert: process.env.GREP_INVERT ? new RegExp(process.env.GREP_INVERT) : undefined,
  
  /* Shard configuration for distributed testing */
  shard: process.env.SHARD ? {
    current: parseInt(process.env.SHARD.split('/')[0]),
    total: parseInt(process.env.SHARD.split('/')[1])
  } : undefined,
});

/* Export configuration for use in tests */
export { TEST_CONFIG };