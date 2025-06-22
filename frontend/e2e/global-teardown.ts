import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Global teardown runs once after all tests
 * Cleans up test data and generates reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown');
  
  try {
    // Generate test summary report
    const resultsPath = path.join(process.cwd(), 'test-results/results.json');
    let testResults;
    
    try {
      const resultsData = await fs.readFile(resultsPath, 'utf-8');
      testResults = JSON.parse(resultsData);
    } catch (error) {
      console.log('📊 No test results found to summarize');
    }
    
    if (testResults) {
      const summary = {
        timestamp: new Date().toISOString(),
        environment: process.env.CI ? 'ci' : 'local',
        totalTests: testResults.tests?.length || 0,
        passed: testResults.tests?.filter((t: any) => t.status === 'passed').length || 0,
        failed: testResults.tests?.filter((t: any) => t.status === 'failed').length || 0,
        skipped: testResults.tests?.filter((t: any) => t.status === 'skipped').length || 0,
        duration: testResults.duration || 0,
        failedTests: testResults.tests?.filter((t: any) => t.status === 'failed').map((t: any) => ({
          title: t.title,
          error: t.error
        })) || []
      };
      
      await fs.writeFile(
        'test-results/summary.json',
        JSON.stringify(summary, null, 2)
      );
      
      console.log('📊 Test Summary:');
      console.log(`   Total: ${summary.totalTests}`);
      console.log(`   ✅ Passed: ${summary.passed}`);
      console.log(`   ❌ Failed: ${summary.failed}`);
      console.log(`   ⏭️  Skipped: ${summary.skipped}`);
      console.log(`   ⏱️  Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    }
    
    // Clean up test data if not in CI
    if (!process.env.CI && !process.env.KEEP_TEST_DATA) {
      console.log('🗑️ Cleaning up test data');
      
      // Clean up test users via API
      const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
      const testUserEmails = [
        'test.primary@example.com',
        'test.secondary@example.com'
      ];
      
      for (const email of testUserEmails) {
        try {
          const response = await fetch(`${baseURL.replace('3000', '3001')}/api/test/users/${email}`, {
            method: 'DELETE',
            headers: {
              'X-Test-Cleanup': 'true'
            }
          });
          
          if (response.ok) {
            console.log(`   ✅ Cleaned up test user: ${email}`);
          }
        } catch (error) {
          console.log(`   ⚠️  Could not clean up test user: ${email}`);
        }
      }
    }
    
    // Archive screenshots if tests failed
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    const failedScreenshots = [];
    
    try {
      const files = await fs.readdir(screenshotsDir);
      for (const file of files) {
        if (file.endsWith('.png')) {
          failedScreenshots.push(file);
        }
      }
      
      if (failedScreenshots.length > 0) {
        console.log(`📸 Found ${failedScreenshots.length} screenshots from failed tests`);
        
        // Create archive directory with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveDir = path.join(process.cwd(), `test-results/screenshots-${timestamp}`);
        await fs.mkdir(archiveDir, { recursive: true });
        
        // Move screenshots to archive
        for (const screenshot of failedScreenshots) {
          await fs.rename(
            path.join(screenshotsDir, screenshot),
            path.join(archiveDir, screenshot)
          );
        }
      }
    } catch (error) {
      console.log('📸 No screenshots to archive');
    }
    
    // Generate performance comparison report
    try {
      const baselinePath = 'test-results/performance-baseline.json';
      const performancePath = 'test-results/performance-report.json';
      
      const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf-8'));
      const performance = JSON.parse(await fs.readFile(performancePath, 'utf-8'));
      
      const comparison = {
        timestamp: new Date().toISOString(),
        baseline: baseline.baselines,
        actual: performance.metrics,
        violations: [] as string[]
      };
      
      // Check for performance violations
      for (const [metric, baselineValue] of Object.entries(baseline.baselines)) {
        const actualValue = performance.metrics[metric];
        if (actualValue && actualValue > baselineValue) {
          comparison.violations.push(
            `${metric}: ${actualValue}ms (baseline: ${baselineValue}ms)`
          );
        }
      }
      
      await fs.writeFile(
        'test-results/performance-comparison.json',
        JSON.stringify(comparison, null, 2)
      );
      
      if (comparison.violations.length > 0) {
        console.log('⚠️  Performance violations detected:');
        comparison.violations.forEach(v => console.log(`   - ${v}`));
      }
    } catch (error) {
      console.log('📊 No performance data to compare');
    }
    
    // Clean up auth state
    try {
      await fs.rm('.auth', { recursive: true, force: true });
      console.log('🔐 Cleaned up authentication state');
    } catch (error) {
      // Auth directory might not exist
    }
    
    console.log('✅ Global teardown completed');
    
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
    // Don't throw - we don't want to fail the test run during cleanup
  }
}

export default globalTeardown;