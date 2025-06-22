import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';
import { 
  TEST_USERS,
  loginUser,
  takeScreenshot,
  waitForAnimation,
  setupConsoleLogging
} from './helpers/test-helpers';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
  });

  test('Measure core web vitals across key pages', async ({ page }) => {
    const pages = [
      { name: 'Landing', url: '/' },
      { name: 'Login', url: '/login' },
      { name: 'Dashboard', url: '/dashboard', requiresAuth: true },
      { name: 'Flashcards', url: '/dashboard/flashcards', requiresAuth: true },
      { name: 'Mind Maps', url: '/dashboard/mindmaps', requiresAuth: true },
      { name: 'STEM Viz', url: '/dashboard/stem-viz', requiresAuth: true }
    ];

    // Login first if needed
    await loginUser(page, TEST_USERS.primary);

    for (const pageInfo of pages) {
      await test.step(`Performance: ${pageInfo.name}`, async () => {
        // Start performance measurement
        await page.goto(pageInfo.url);
        
        // Measure performance metrics
        const metrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const paint = performance.getEntriesByName('first-contentful-paint')[0];
          
          return {
            // Navigation Timing
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            // Core Web Vitals
            FCP: paint ? paint.startTime : 0,
            // Resource counts
            resourceCount: performance.getEntriesByType('resource').length,
            // Memory (if available)
            memory: (performance as any).memory ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize
            } : null
          };
        });

        console.log(`📊 ${pageInfo.name} Performance Metrics:`, metrics);
        
        // Take screenshot with metrics overlay
        await page.evaluate((metricsData) => {
          const overlay = document.createElement('div');
          overlay.id = 'perf-overlay';
          overlay.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.9); color: white; padding: 15px; border-radius: 5px; font-family: monospace; z-index: 10000;">
              <h3 style="margin: 0 0 10px 0;">Performance Metrics</h3>
              <div>DOM Loaded: ${metricsData.domContentLoaded.toFixed(2)}ms</div>
              <div>Page Load: ${metricsData.loadComplete.toFixed(2)}ms</div>
              <div>FCP: ${metricsData.FCP.toFixed(2)}ms</div>
              <div>Resources: ${metricsData.resourceCount}</div>
              ${metricsData.memory ? `<div>Memory: ${(metricsData.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB</div>` : ''}
            </div>
          `;
          document.body.appendChild(overlay);
        }, metrics);
        
        await takeScreenshot(page, `performance-${pageInfo.name.toLowerCase()}-metrics`);
        
        // Remove overlay
        await page.evaluate(() => {
          const overlay = document.getElementById('perf-overlay');
          if (overlay) overlay.remove();
        });

        // Test Largest Contentful Paint (LCP)
        await page.evaluate(() => {
          return new Promise((resolve) => {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              resolve(lastEntry.startTime);
            }).observe({ entryTypes: ['largest-contentful-paint'] });
          });
        });

        // Assert performance thresholds
        expect(metrics.FCP).toBeLessThan(2500); // FCP should be under 2.5s
        expect(metrics.domContentLoaded).toBeLessThan(3000); // DOM should load under 3s
      });
    }
  });

  test('Test performance with large datasets', async ({ page }) => {
    await loginUser(page, TEST_USERS.primary);

    await test.step('Large flashcard deck performance', async () => {
      await page.goto('/dashboard/flashcards');
      
      // Measure rendering time for many cards
      const startTime = Date.now();
      
      // Simulate large deck (if UI supports it)
      const bulkButton = page.locator('button:has-text("Bulk"), button:has-text("Generate Many")').first();
      if (await bulkButton.isVisible()) {
        await bulkButton.click();
        await page.waitForSelector('.flashcard', { timeout: 30000 });
      }
      
      const renderTime = Date.now() - startTime;
      console.log(`Large deck render time: ${renderTime}ms`);
      
      // Check smooth scrolling
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
      
      await takeScreenshot(page, 'performance-large-deck-scroll');
      
      // Measure FPS during animation
      const fps = await page.evaluate(() => {
        return new Promise((resolve) => {
          let frames = 0;
          const startTime = performance.now();
          
          function countFrame() {
            frames++;
            if (performance.now() - startTime < 1000) {
              requestAnimationFrame(countFrame);
            } else {
              resolve(frames);
            }
          }
          
          requestAnimationFrame(countFrame);
        });
      });
      
      console.log(`Animation FPS: ${fps}`);
      expect(fps).toBeGreaterThan(30); // Should maintain at least 30 FPS
    });

    await test.step('Complex mind map performance', async () => {
      await page.goto('/dashboard/mindmaps');
      
      // Create or load complex mind map
      const complexButton = page.locator('button:has-text("Complex"), button:has-text("Large")').first();
      if (await complexButton.isVisible()) {
        const startTime = Date.now();
        await complexButton.click();
        await page.waitForSelector('.mind-map-node', { timeout: 30000 });
        const loadTime = Date.now() - startTime;
        
        console.log(`Complex mind map load time: ${loadTime}ms`);
        
        // Test interaction performance
        const node = page.locator('.mind-map-node').first();
        if (await node.isVisible()) {
          // Measure drag performance
          const dragStartTime = performance.now();
          const box = await node.boundingBox();
          if (box) {
            await page.mouse.move(box.x, box.y);
            await page.mouse.down();
            await page.mouse.move(box.x + 200, box.y + 200, { steps: 10 });
            await page.mouse.up();
          }
          const dragTime = performance.now() - dragStartTime;
          console.log(`Node drag time: ${dragTime}ms`);
        }
        
        await takeScreenshot(page, 'performance-complex-mindmap');
      }
    });

    await test.step('3D rendering performance', async () => {
      await page.goto('/dashboard/stem-viz');
      
      // Load complex 3D scene
      const complex3DButton = page.locator('button:has-text("Complex"), button:has-text("Protein")').first();
      if (await complex3DButton.isVisible()) {
        await complex3DButton.click();
        await page.waitForSelector('canvas', { timeout: 30000 });
        
        // Measure WebGL performance
        const glMetrics = await page.evaluate(() => {
          const canvas = document.querySelector('canvas');
          if (!canvas) return null;
          
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
          if (!gl) return null;
          
          return {
            renderer: gl.getParameter(gl.RENDERER),
            vendor: gl.getParameter(gl.VENDOR),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
          };
        });
        
        console.log('WebGL metrics:', glMetrics);
        
        // Test 3D interaction performance
        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        if (box) {
          // Rotate scene
          const rotateStartTime = performance.now();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          for (let i = 0; i < 10; i++) {
            await page.mouse.move(
              box.x + box.width / 2 + (i * 20), 
              box.y + box.height / 2,
              { steps: 5 }
            );
          }
          await page.mouse.up();
          const rotateTime = performance.now() - rotateStartTime;
          console.log(`3D rotation time: ${rotateTime}ms`);
        }
        
        await takeScreenshot(page, 'performance-3d-complex');
      }
    });
  });

  test('Memory leak detection', async ({ page }) => {
    await loginUser(page, TEST_USERS.primary);

    await test.step('Monitor memory during navigation', async () => {
      const memorySnapshots = [];
      
      // Take initial memory snapshot
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      memorySnapshots.push({ page: 'initial', memory: initialMemory });
      
      // Navigate through different pages
      const routes = [
        '/dashboard',
        '/dashboard/flashcards',
        '/dashboard/mindmaps',
        '/dashboard/stem-viz',
        '/dashboard/documents'
      ];
      
      for (const route of routes) {
        await page.goto(route);
        await waitForAnimation(page);
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
        
        const memory = await page.evaluate(() => {
          return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        });
        
        memorySnapshots.push({ page: route, memory });
        console.log(`Memory at ${route}: ${(memory / 1024 / 1024).toFixed(2)}MB`);
      }
      
      // Check for memory leaks
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1].memory - initialMemory;
      const growthMB = memoryGrowth / 1024 / 1024;
      
      console.log(`Total memory growth: ${growthMB.toFixed(2)}MB`);
      expect(growthMB).toBeLessThan(50); // Should not grow more than 50MB
      
      // Visualize memory usage
      await page.evaluate((snapshots) => {
        const chart = document.createElement('div');
        chart.innerHTML = `
          <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 1px solid black; z-index: 10000;">
            <h3>Memory Usage</h3>
            ${snapshots.map(s => `<div>${s.page}: ${(s.memory / 1024 / 1024).toFixed(2)}MB</div>`).join('')}
          </div>
        `;
        document.body.appendChild(chart);
      }, memorySnapshots);
      
      await takeScreenshot(page, 'performance-memory-usage');
    });
  });

  test('Network performance and bundle sizes', async ({ page }) => {
    const networkMetrics = [];

    await test.step('Measure network performance', async () => {
      // Monitor network requests
      page.on('response', response => {
        const url = response.url();
        const status = response.status();
        const size = response.headers()['content-length'];
        
        if (url.includes('.js') || url.includes('.css')) {
          networkMetrics.push({
            url: url.split('/').pop(),
            status,
            size: size ? parseInt(size) : 0
          });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Calculate total bundle size
      const totalSize = networkMetrics.reduce((sum, metric) => sum + metric.size, 0);
      console.log(`Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Check for large bundles
      const largeBundles = networkMetrics.filter(m => m.size > 500 * 1024); // > 500KB
      if (largeBundles.length > 0) {
        console.warn('Large bundles detected:', largeBundles);
      }
      
      await takeScreenshot(page, 'performance-network-metrics');
    });
  });
});

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await injectAxe(page);
  });

  test('Check accessibility on all major pages', async ({ page }) => {
    const pages = [
      { name: 'Landing', url: '/' },
      { name: 'Login', url: '/login' },
      { name: 'Register', url: '/register' },
      { name: 'Dashboard', url: '/dashboard', requiresAuth: true },
      { name: 'Flashcards', url: '/dashboard/flashcards', requiresAuth: true },
      { name: 'Mind Maps', url: '/dashboard/mindmaps', requiresAuth: true },
      { name: 'STEM Viz', url: '/dashboard/stem-viz', requiresAuth: true }
    ];

    // Login if needed
    await loginUser(page, TEST_USERS.primary);

    for (const pageInfo of pages) {
      await test.step(`Accessibility: ${pageInfo.name}`, async () => {
        await page.goto(pageInfo.url);
        await waitForAnimation(page);
        
        // Run accessibility tests
        await checkA11y(page, null, {
          detailedReport: true,
          detailedReportOptions: {
            html: true,
          },
        });
        
        // Take screenshot with accessibility focus indicators
        await page.evaluate(() => {
          // Add visual indicators for accessibility features
          const style = document.createElement('style');
          style.textContent = `
            *:focus {
              outline: 3px solid #ff0000 !important;
              outline-offset: 2px !important;
            }
            [aria-label], [aria-describedby] {
              position: relative;
            }
            [aria-label]::after {
              content: "♿ " attr(aria-label);
              position: absolute;
              top: -20px;
              left: 0;
              background: yellow;
              color: black;
              padding: 2px 5px;
              font-size: 10px;
              white-space: nowrap;
              z-index: 10000;
            }
          `;
          document.head.appendChild(style);
        });
        
        await takeScreenshot(page, `accessibility-${pageInfo.name.toLowerCase()}`);
      });
    }
  });

  test('Keyboard navigation through entire app', async ({ page }) => {
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard');

    await test.step('Tab through dashboard', async () => {
      // Tab through all interactive elements
      const interactiveElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        return elements.length;
      });
      
      console.log(`Found ${interactiveElements} interactive elements`);
      
      // Tab through first 10 elements
      for (let i = 0; i < Math.min(10, interactiveElements); i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        
        // Get focused element info
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            text: el?.textContent?.trim().substring(0, 50),
            ariaLabel: el?.getAttribute('aria-label'),
            role: el?.getAttribute('role')
          };
        });
        
        console.log(`Tab ${i + 1}: ${focusedElement.tagName} - ${focusedElement.text || focusedElement.ariaLabel}`);
        
        if (i % 3 === 0) { // Take screenshot every 3rd tab
          await takeScreenshot(page, `accessibility-keyboard-tab-${i}`);
        }
      }
    });

    await test.step('Test keyboard shortcuts', async () => {
      // Test common shortcuts
      const shortcuts = [
        { key: 'Escape', description: 'Close modals' },
        { key: 'Enter', description: 'Activate buttons' },
        { key: 'Space', description: 'Toggle elements' },
        { key: 'ArrowUp', description: 'Navigate up' },
        { key: 'ArrowDown', description: 'Navigate down' }
      ];
      
      for (const shortcut of shortcuts) {
        console.log(`Testing shortcut: ${shortcut.key} - ${shortcut.description}`);
        await page.keyboard.press(shortcut.key);
        await page.waitForTimeout(300);
      }
      
      await takeScreenshot(page, 'accessibility-keyboard-shortcuts');
    });
  });

  test('Screen reader compatibility', async ({ page }) => {
    await loginUser(page, TEST_USERS.primary);

    await test.step('Check ARIA labels and roles', async () => {
      await page.goto('/dashboard');
      
      // Check for proper ARIA structure
      const ariaInfo = await page.evaluate(() => {
        const results = {
          landmarks: document.querySelectorAll('[role="navigation"], [role="main"], [role="banner"], nav, main, header').length,
          headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
          buttons: document.querySelectorAll('button:not([aria-label]), button:empty').length,
          images: document.querySelectorAll('img:not([alt])').length,
          forms: document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])').length,
          links: document.querySelectorAll('a:not([aria-label]):empty').length
        };
        
        return results;
      });
      
      console.log('ARIA audit results:', ariaInfo);
      
      // Assert good practices
      expect(ariaInfo.landmarks).toBeGreaterThan(0); // Should have landmarks
      expect(ariaInfo.buttons).toBe(0); // All buttons should have labels
      expect(ariaInfo.images).toBe(0); // All images should have alt text
      
      // Add screen reader hints overlay
      await page.evaluate(() => {
        document.querySelectorAll('[aria-label], [role]').forEach(el => {
          const hint = document.createElement('div');
          hint.style.cssText = 'position: absolute; background: #000; color: #fff; padding: 2px 5px; font-size: 10px; z-index: 10000;';
          hint.textContent = `${el.getAttribute('role') || ''} ${el.getAttribute('aria-label') || ''}`.trim();
          el.appendChild(hint);
        });
      });
      
      await takeScreenshot(page, 'accessibility-screen-reader-hints');
    });

    await test.step('Test form accessibility', async () => {
      await page.goto('/dashboard/flashcards');
      
      // Check form labels
      const formIssues = await page.evaluate(() => {
        const issues = [];
        
        // Check all form inputs
        document.querySelectorAll('input, select, textarea').forEach(input => {
          const hasLabel = input.getAttribute('aria-label') || 
                          input.getAttribute('aria-labelledby') ||
                          document.querySelector(`label[for="${input.id}"]`);
          
          if (!hasLabel) {
            issues.push({
              element: input.tagName,
              type: input.getAttribute('type'),
              name: input.getAttribute('name')
            });
          }
        });
        
        return issues;
      });
      
      if (formIssues.length > 0) {
        console.warn('Form accessibility issues:', formIssues);
      }
      
      expect(formIssues.length).toBe(0);
    });
  });

  test('Color contrast and visual accessibility', async ({ page }) => {
    await loginUser(page, TEST_USERS.primary);

    await test.step('Check color contrast ratios', async () => {
      await page.goto('/dashboard');
      
      // Run axe color contrast check
      const violations = await page.evaluate(async () => {
        const results = await (window as any).axe.run();
        return results.violations.filter(v => v.id.includes('color-contrast'));
      });
      
      if (violations.length > 0) {
        console.warn('Color contrast violations:', violations);
      }
      
      // Test with different color filters
      const filters = [
        { name: 'normal', filter: 'none' },
        { name: 'protanopia', filter: 'url("#protanopia")' },
        { name: 'deuteranopia', filter: 'url("#deuteranopia")' },
        { name: 'tritanopia', filter: 'url("#tritanopia")' },
        { name: 'grayscale', filter: 'grayscale(100%)' }
      ];
      
      // Add SVG filters for color blindness simulation
      await page.evaluate(() => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.innerHTML = `
          <defs>
            <filter id="protanopia">
              <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0"/>
            </filter>
            <filter id="deuteranopia">
              <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0"/>
            </filter>
            <filter id="tritanopia">
              <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0"/>
            </filter>
          </defs>
        `;
        document.body.appendChild(svg);
      });
      
      for (const colorFilter of filters) {
        await page.evaluate((filter) => {
          document.documentElement.style.filter = filter;
        }, colorFilter.filter);
        
        await takeScreenshot(page, `accessibility-color-${colorFilter.name}`);
      }
      
      // Reset filter
      await page.evaluate(() => {
        document.documentElement.style.filter = 'none';
      });
    });

    await test.step('Test high contrast mode', async () => {
      // Simulate high contrast mode
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `
          * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
          button, input, select, textarea {
            background-color: #222 !important;
            border: 2px solid white !important;
          }
          a {
            color: yellow !important;
            text-decoration: underline !important;
          }
        `;
        style.id = 'high-contrast';
        document.head.appendChild(style);
      });
      
      await takeScreenshot(page, 'accessibility-high-contrast');
      
      // Remove high contrast
      await page.evaluate(() => {
        document.getElementById('high-contrast')?.remove();
      });
    });
  });

  test('Responsive design and zoom accessibility', async ({ page }) => {
    await loginUser(page, TEST_USERS.primary);

    await test.step('Test zoom levels', async () => {
      await page.goto('/dashboard');
      
      const zoomLevels = [100, 150, 200, 300];
      
      for (const zoom of zoomLevels) {
        await page.evaluate((zoomLevel) => {
          document.documentElement.style.zoom = `${zoomLevel}%`;
        }, zoom);
        
        await takeScreenshot(page, `accessibility-zoom-${zoom}`);
        
        // Check if content is still accessible
        const isScrollable = await page.evaluate(() => {
          return document.documentElement.scrollHeight > window.innerHeight ||
                 document.documentElement.scrollWidth > window.innerWidth;
        });
        
        console.log(`At ${zoom}% zoom: ${isScrollable ? 'Scrollable' : 'Fits in viewport'}`);
      }
      
      // Reset zoom
      await page.evaluate(() => {
        document.documentElement.style.zoom = '100%';
      });
    });

    await test.step('Test text scaling', async () => {
      // Test with increased font size
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '150%';
      });
      
      await takeScreenshot(page, 'accessibility-large-text');
      
      // Check text overflow
      const overflowElements = await page.evaluate(() => {
        const elements = [];
        document.querySelectorAll('*').forEach(el => {
          if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) {
            elements.push({
              tag: el.tagName,
              class: el.className,
              overflow: {
                horizontal: el.scrollWidth > el.clientWidth,
                vertical: el.scrollHeight > el.clientHeight
              }
            });
          }
        });
        return elements;
      });
      
      if (overflowElements.length > 0) {
        console.warn('Elements with text overflow:', overflowElements);
      }
      
      // Reset font size
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '';
      });
    });
  });
});