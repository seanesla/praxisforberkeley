import { Page, TestInfo } from '@playwright/test';
import { BENCHMARKS } from '../config/test-config';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

interface NavigationTiming {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
}

export class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private startTime: number = 0;

  constructor(private page: Page, private testInfo: TestInfo) {}

  // Start tracking a specific action
  startAction(actionName: string) {
    this.startTime = Date.now();
    console.log(`[Performance] Started tracking: ${actionName}`);
  }

  // End tracking and record the metric
  async endAction(actionName: string, customThreshold?: number): Promise<PerformanceMetric> {
    const duration = Date.now() - this.startTime;
    const status = this.evaluatePerformance(duration, customThreshold);
    
    const metric: PerformanceMetric = {
      name: actionName,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      status
    };

    this.metrics.push(metric);
    console.log(`[Performance] ${actionName}: ${duration}ms (${status})`);
    
    return metric;
  }

  // Track page navigation performance
  async trackNavigation(pageName: string): Promise<NavigationTiming> {
    await this.page.waitForLoadState('networkidle');

    const timing = await this.page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadComplete: nav.loadEventEnd - nav.loadEventStart,
        firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: 0, // Would need PerformanceObserver API
        timeToInteractive: nav.domInteractive - nav.fetchStart
      };
    });

    // Record metrics
    Object.entries(timing).forEach(([key, value]) => {
      const metric: PerformanceMetric = {
        name: `${pageName}.${key}`,
        value,
        unit: 'ms',
        timestamp: new Date(),
        status: this.evaluateNavigationMetric(key, value)
      };
      this.metrics.push(metric);
    });

    console.log(`[Performance] Navigation timing for ${pageName}:`, timing);
    return timing;
  }

  // Track API response time
  async trackAPICall(endpoint: string, request: () => Promise<any>): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await request();
      const duration = Date.now() - startTime;
      
      const metric: PerformanceMetric = {
        name: `api.${endpoint}`,
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        status: this.evaluateAPIPerformance(duration)
      };
      
      this.metrics.push(metric);
      console.log(`[Performance] API ${endpoint}: ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Performance] API ${endpoint} failed after ${duration}ms`);
      throw error;
    }
  }

  // Track memory usage
  async trackMemoryUsage(label: string) {
    if (!this.page.context().browser()) return;

    const metrics = await this.page.evaluate(() => {
      // @ts-ignore - Chrome specific API
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (metrics) {
      const heapUsagePercent = (metrics.usedJSHeapSize / metrics.jsHeapSizeLimit) * 100;
      
      this.metrics.push({
        name: `${label}.heapUsage`,
        value: heapUsagePercent,
        unit: '%',
        timestamp: new Date(),
        status: heapUsagePercent > 90 ? 'poor' : heapUsagePercent > 70 ? 'needs-improvement' : 'good'
      });

      console.log(`[Performance] Memory usage for ${label}: ${heapUsagePercent.toFixed(2)}%`);
    }
  }

  // Track render performance
  async trackRenderPerformance(actionName: string, action: () => Promise<void>) {
    // Inject performance observer
    await this.page.evaluate(() => {
      window.__renderMetrics = { paints: 0, layouts: 0 };
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            window.__renderMetrics.paints++;
          } else if (entry.entryType === 'layout-shift') {
            window.__renderMetrics.layouts++;
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint', 'layout-shift'] });
    });

    const startTime = Date.now();
    await action();
    const duration = Date.now() - startTime;

    const renderMetrics = await this.page.evaluate(() => window.__renderMetrics);
    
    this.metrics.push({
      name: `${actionName}.renderTime`,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      status: this.evaluatePerformance(duration)
    });

    if (renderMetrics) {
      console.log(`[Performance] Render metrics for ${actionName}:`, renderMetrics);
    }
  }

  // Generate performance report
  async generateReport(): Promise<string> {
    const report = {
      summary: this.generateSummary(),
      metrics: this.metrics,
      timestamp: new Date().toISOString()
    };

    // Attach to test results
    await this.testInfo.attach('performance-report', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json'
    });

    return this.formatReport(report);
  }

  // Private helper methods
  private evaluatePerformance(duration: number, customThreshold?: number): PerformanceMetric['status'] {
    const threshold = customThreshold || BENCHMARKS.tti.needsImprovement;
    
    if (duration < BENCHMARKS.tti.excellent) return 'excellent';
    if (duration < BENCHMARKS.tti.good) return 'good';
    if (duration < threshold) return 'needs-improvement';
    return 'poor';
  }

  private evaluateNavigationMetric(metric: string, value: number): PerformanceMetric['status'] {
    const benchmarks = metric.includes('firstContentfulPaint') ? BENCHMARKS.fcp : BENCHMARKS.tti;
    
    if (value < benchmarks.excellent) return 'excellent';
    if (value < benchmarks.good) return 'good';
    if (value < benchmarks.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  private evaluateAPIPerformance(duration: number): PerformanceMetric['status'] {
    if (duration < BENCHMARKS.api.excellent) return 'excellent';
    if (duration < BENCHMARKS.api.good) return 'good';
    if (duration < BENCHMARKS.api.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  private generateSummary() {
    const statusCounts = this.metrics.reduce((acc, metric) => {
      acc[metric.status] = (acc[metric.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgDuration = this.metrics
      .filter(m => m.unit === 'ms')
      .reduce((sum, m) => sum + m.value, 0) / this.metrics.length;

    return {
      totalMetrics: this.metrics.length,
      averageDuration: Math.round(avgDuration),
      statusBreakdown: statusCounts,
      slowestActions: this.metrics
        .filter(m => m.unit === 'ms')
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map(m => ({ name: m.name, duration: m.value }))
    };
  }

  private formatReport(report: any): string {
    let output = '=== Performance Report ===\n\n';
    
    output += 'Summary:\n';
    output += `  Total Metrics: ${report.summary.totalMetrics}\n`;
    output += `  Average Duration: ${report.summary.averageDuration}ms\n`;
    output += '\nStatus Breakdown:\n';
    
    Object.entries(report.summary.statusBreakdown).forEach(([status, count]) => {
      output += `  ${status}: ${count}\n`;
    });
    
    output += '\nSlowest Actions:\n';
    report.summary.slowestActions.forEach((action: any) => {
      output += `  ${action.name}: ${action.duration}ms\n`;
    });
    
    return output;
  }
}

// Extend window interface
declare global {
  interface Window {
    __renderMetrics: {
      paints: number;
      layouts: number;
    };
  }
}

// Export helper function for use in tests
export function usePerformanceTracker(page: Page, testInfo: TestInfo) {
  return new PerformanceTracker(page, testInfo);
}