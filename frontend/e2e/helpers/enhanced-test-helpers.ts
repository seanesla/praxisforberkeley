import { Page, expect, TestInfo } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

export class EnhancedTestHelpers {
  constructor(private page: Page, private testInfo: TestInfo) {}

  // Authentication helper with retry logic
  async authenticateUser(email: string = 'test@example.com', password: string = 'testpass123') {
    console.log(`[Auth] Attempting to authenticate as ${email}`);
    
    // Check if already authenticated
    const dashboardUrl = await this.page.evaluate(() => window.location.href);
    if (dashboardUrl.includes('/dashboard')) {
      console.log('[Auth] Already authenticated');
      return;
    }

    // Navigate to login
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');

    // Fill login form
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    
    // Submit and wait for navigation
    await Promise.all([
      this.page.waitForURL('**/dashboard', { timeout: 10000 }),
      this.page.click('button[type="submit"]')
    ]);

    console.log('[Auth] Authentication successful');
  }

  // Visual regression testing
  async captureScreenshot(name: string, options?: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
    mask?: string[];
  }) {
    const screenshotPath = path.join('screenshots', `${this.testInfo.project.name}-${name}.png`);
    console.log(`[Screenshot] Capturing: ${screenshotPath}`);
    
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: options?.fullPage ?? false,
      clip: options?.clip,
      mask: options?.mask ? await Promise.all(
        options.mask.map(selector => this.page.locator(selector))
      ) : undefined,
      animations: 'disabled'
    });

    // Attach to test report
    await this.testInfo.attach(name, {
      body: await fs.readFile(screenshotPath),
      contentType: 'image/png'
    });
  }

  // Performance benchmarking
  async measurePerformance(name: string, action: () => Promise<void>) {
    console.log(`[Performance] Starting measurement: ${name}`);
    
    // Start performance measurement
    await this.page.evaluate(() => {
      window.performance.mark('test-start');
    });

    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Get performance metrics
    const metrics = await this.page.evaluate(() => {
      window.performance.mark('test-end');
      window.performance.measure('test-duration', 'test-start', 'test-end');
      
      const measure = window.performance.getEntriesByName('test-duration')[0];
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        duration: measure.duration,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: window.performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: window.performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    console.log(`[Performance] ${name} completed in ${duration}ms`, metrics);
    
    // Store performance data
    await this.testInfo.attach(`performance-${name}`, {
      body: JSON.stringify({ duration, ...metrics }, null, 2),
      contentType: 'application/json'
    });

    return { duration, ...metrics };
  }

  // Accessibility testing
  async checkAccessibility(name: string, options?: {
    includeWarnings?: boolean;
    wcagLevel?: 'A' | 'AA' | 'AAA';
  }) {
    console.log(`[Accessibility] Checking: ${name}`);
    
    // Use axe-core for accessibility testing
    await this.page.evaluate(() => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js';
      document.head.appendChild(script);
    });

    // Wait for axe to load
    await this.page.waitForFunction(() => window.axe !== undefined, { timeout: 5000 });

    // Run accessibility check
    const results = await this.page.evaluate((wcagLevel) => {
      return window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: [`wcag2${wcagLevel?.toLowerCase() || 'aa'}`]
        }
      });
    }, options?.wcagLevel);

    // Process results
    const violations = results.violations;
    const warnings = options?.includeWarnings ? results.incomplete : [];

    if (violations.length > 0) {
      console.error(`[Accessibility] Found ${violations.length} violations:`, violations);
      
      // Attach detailed report
      await this.testInfo.attach(`accessibility-violations-${name}`, {
        body: JSON.stringify(violations, null, 2),
        contentType: 'application/json'
      });
    }

    return { violations, warnings, passes: results.passes.length };
  }

  // Wait for animations to complete
  async waitForAnimations(selector?: string) {
    const element = selector ? this.page.locator(selector) : this.page.locator('body');
    
    await element.evaluate((el) => {
      return Promise.all(
        el.getAnimations({ subtree: true })
          .map(animation => animation.finished)
      );
    });
  }

  // Network request mocking
  async mockAPIResponse(endpoint: string, response: any, status: number = 200) {
    await this.page.route(`**/api/${endpoint}`, async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  // Wait for specific network requests
  async waitForAPI(endpoint: string, timeout: number = 5000) {
    return this.page.waitForResponse(
      response => response.url().includes(`/api/${endpoint}`) && response.status() === 200,
      { timeout }
    );
  }

  // Feature flag management
  async setFeatureFlag(flag: string, enabled: boolean) {
    await this.page.evaluate(({ flag, enabled }) => {
      window.localStorage.setItem(`feature_${flag}`, enabled.toString());
    }, { flag, enabled });
  }

  // Data test ID helpers
  async clickTestId(testId: string) {
    await this.page.click(`[data-testid="${testId}"]`);
  }

  async fillTestId(testId: string, value: string) {
    await this.page.fill(`[data-testid="${testId}"]`, value);
  }

  async expectTestId(testId: string) {
    return expect(this.page.locator(`[data-testid="${testId}"]`));
  }

  // Console error monitoring
  async expectNoConsoleErrors() {
    const errors: string[] = [];
    
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to appear
    await this.page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  }

  // Upload file helper
  async uploadFile(filePath: string, selector: string = 'input[type="file"]') {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.click(selector);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  // Drag and drop helper
  async dragAndDrop(sourceSelector: string, targetSelector: string) {
    const source = this.page.locator(sourceSelector);
    const target = this.page.locator(targetSelector);
    
    await source.hover();
    await this.page.mouse.down();
    await target.hover();
    await this.page.mouse.up();
  }

  // Wait for element with retry
  async waitForElement(selector: string, options?: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached' }) {
    return this.page.locator(selector).waitFor(options);
  }

  // Check element visibility with better error messages
  async expectVisible(selector: string, description?: string) {
    const element = this.page.locator(selector);
    await expect(element, description).toBeVisible();
  }

  // Get element text with trimming
  async getTextContent(selector: string): Promise<string> {
    const element = this.page.locator(selector);
    const text = await element.textContent();
    return text?.trim() || '';
  }
}

// Global window extensions for tests
declare global {
  interface Window {
    axe: any;
    performance: Performance;
  }
}