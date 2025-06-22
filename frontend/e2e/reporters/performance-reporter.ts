import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs/promises';
import path from 'path';

interface PerformanceMetric {
  test: string;
  duration: number;
  status: string;
  metrics?: {
    [key: string]: number;
  };
}

/**
 * Custom reporter for collecting and reporting performance metrics
 */
class PerformanceReporter implements Reporter {
  private metrics: PerformanceMetric[] = [];
  private startTime: number = 0;

  onBegin() {
    this.startTime = Date.now();
    console.log('📊 Performance monitoring started');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const metric: PerformanceMetric = {
      test: test.title,
      duration: result.duration,
      status: result.status,
    };

    // Extract custom performance metrics from test annotations
    const performanceAnnotation = test.annotations.find(a => a.type === 'performance');
    if (performanceAnnotation && typeof performanceAnnotation.description === 'string') {
      try {
        metric.metrics = JSON.parse(performanceAnnotation.description);
      } catch {
        // Invalid JSON in annotation
      }
    }

    // Extract metrics from test attachments
    const perfAttachment = result.attachments.find(a => a.name === 'performance-report');
    if (perfAttachment && perfAttachment.body) {
      try {
        const data = JSON.parse(perfAttachment.body.toString());
        metric.metrics = { ...metric.metrics, ...data };
      } catch {
        // Invalid JSON in attachment
      }
    }

    this.metrics.push(metric);

    // Log slow tests
    if (result.duration > 10000) {
      console.log(`⚠️  Slow test detected: ${test.title} (${(result.duration / 1000).toFixed(2)}s)`);
    }
  }

  async onEnd(result: FullResult) {
    const totalDuration = Date.now() - this.startTime;
    
    // Calculate statistics
    const stats = {
      totalTests: this.metrics.length,
      totalDuration,
      averageDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      slowestTests: this.metrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map(m => ({ test: m.test, duration: m.duration })),
      failedTests: this.metrics.filter(m => m.status === 'failed'),
      performanceMetrics: this.aggregateMetrics(),
    };

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.CI ? 'ci' : 'local',
      status: result.status,
      stats,
      metrics: this.metrics,
    };

    // Save report
    const reportPath = path.join(process.cwd(), 'test-results/performance-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Console output
    console.log('\n📊 Performance Report Summary:');
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Average Test Duration: ${(stats.averageDuration / 1000).toFixed(2)}s`);
    console.log(`   Slowest Test: ${stats.slowestTests[0]?.test} (${(stats.slowestTests[0]?.duration / 1000).toFixed(2)}s)`);
    
    if (stats.performanceMetrics.pageLoad) {
      console.log(`   Average Page Load: ${stats.performanceMetrics.pageLoad.toFixed(0)}ms`);
    }
    if (stats.performanceMetrics.apiResponse) {
      console.log(`   Average API Response: ${stats.performanceMetrics.apiResponse.toFixed(0)}ms`);
    }

    // Check against thresholds
    await this.checkThresholds(stats);
  }

  private aggregateMetrics() {
    const aggregated: { [key: string]: number } = {};
    const counts: { [key: string]: number } = {};

    for (const metric of this.metrics) {
      if (metric.metrics) {
        for (const [key, value] of Object.entries(metric.metrics)) {
          if (typeof value === 'number') {
            aggregated[key] = (aggregated[key] || 0) + value;
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      }
    }

    // Calculate averages
    for (const key of Object.keys(aggregated)) {
      aggregated[key] = aggregated[key] / counts[key];
    }

    return aggregated;
  }

  private async checkThresholds(stats: any) {
    // Load performance thresholds
    const thresholds = {
      averageTestDuration: 5000,
      pageLoad: 3000,
      apiResponse: 1000,
      totalDuration: 300000, // 5 minutes
    };

    const violations = [];

    if (stats.averageDuration > thresholds.averageTestDuration) {
      violations.push(`Average test duration (${(stats.averageDuration / 1000).toFixed(2)}s) exceeds threshold (${thresholds.averageTestDuration / 1000}s)`);
    }

    if (stats.totalDuration > thresholds.totalDuration) {
      violations.push(`Total suite duration (${(stats.totalDuration / 1000).toFixed(2)}s) exceeds threshold (${thresholds.totalDuration / 1000}s)`);
    }

    if (stats.performanceMetrics.pageLoad > thresholds.pageLoad) {
      violations.push(`Average page load (${stats.performanceMetrics.pageLoad.toFixed(0)}ms) exceeds threshold (${thresholds.pageLoad}ms)`);
    }

    if (violations.length > 0) {
      console.log('\n⚠️  Performance Threshold Violations:');
      violations.forEach(v => console.log(`   - ${v}`));
      
      // Save violations
      await fs.writeFile(
        path.join(process.cwd(), 'test-results/performance-violations.json'),
        JSON.stringify({ timestamp: new Date().toISOString(), violations }, null, 2)
      );
    } else {
      console.log('\n✅ All performance thresholds passed');
    }
  }
}

export default PerformanceReporter;