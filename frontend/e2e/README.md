# E2E Testing Suite

Comprehensive end-to-end testing suite built with Playwright, featuring performance tracking, visual regression, and cross-browser testing.

## 🚀 Quick Start

```bash
# Install dependencies
npm install
npm run test:e2e:install

# Run all tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run specific test suite
npm run test:e2e:smoke
npm run test:e2e:critical
npm run test:e2e:improved
```

## 📁 Project Structure

```
e2e/
├── config/
│   └── test-config.ts          # Centralized configuration
├── fixtures/
│   └── base-fixtures.ts        # Custom test fixtures
├── helpers/
│   ├── test-helpers.ts         # Basic test utilities
│   └── enhanced-test-helpers.ts # Advanced utilities
├── reporters/
│   └── performance-reporter.ts  # Custom performance reporting
├── utils/
│   ├── test-data-cleanup.ts    # Test data management
│   └── performance-tracker.ts  # Performance monitoring
├── global-setup.ts             # Pre-test setup
├── global-teardown.ts          # Post-test cleanup
└── *.spec.ts                   # Test files
```

## 🧪 Test Suites

### Core Features (Phase 4)
1. **spaced-repetition.spec.ts** - SM-2 algorithm, study sessions, heatmaps
2. **exercises.spec.ts** - All 8 exercise types with scoring
3. **knowledge-gaps.spec.ts** - Gap detection and learning paths
4. **citation-network.spec.ts** - Network visualization and metrics
5. **search-v2.spec.ts** - Advanced search with faceted filtering
6. **workspace.spec.ts** - Collaboration and version control
7. **reports.spec.ts** - Report generation and exports
8. **workflow.spec.ts** - Workflow builder and automation
9. **analytics.spec.ts** - Dashboard and data visualization
10. **integration.spec.ts** - Complete user journey

### Improved Versions
- **spaced-repetition-improved.spec.ts** - Enhanced with performance tracking
- **integration-improved.spec.ts** - Full cleanup and monitoring

## 🛠️ Configuration

### Test Configuration (`config/test-config.ts`)
```typescript
export const TEST_CONFIG = {
  timeouts: {
    navigation: 30000,
    element: 5000,
    network: 10000,
    animation: 1000,
    debounce: 500
  },
  performance: {
    pageLoad: 3000,
    apiResponse: 1000,
    interaction: 300
  },
  retries: {
    test: 2,
    element: 3
  }
};
```

### Playwright Configuration
- **playwright.config.ts** - Standard configuration
- **playwright-improved.config.ts** - Enhanced with performance features

## 🎯 Test Patterns

### Using Enhanced Fixtures
```typescript
import { test, expect } from './fixtures/base-fixtures';

test('example with all fixtures', async ({ 
  authenticatedPage,
  testHelpers,
  performanceTracker,
  testCleanup 
}) => {
  // Test implementation
});
```

### Performance Tracking
```typescript
await performanceTracker.trackNavigation('page-name');
await performanceTracker.trackAPICall('endpoint', async () => {
  // API call
});
await performanceTracker.generateReport();
```

### Test Data Cleanup
```typescript
testCleanup.registerUser(userId);
testCleanup.registerDocument(docId);
// Cleanup happens automatically after test
```

### Accessibility Testing
```typescript
const violations = await testHelpers.checkAccessibility('page-name');
expect(violations.violations).toHaveLength(0);
```

## 📊 Performance Monitoring

### Metrics Tracked
- Page load times
- API response times
- Interaction delays
- Memory usage
- Render performance

### Performance Reports
Reports are generated in `test-results/`:
- `performance-report.json` - Detailed metrics
- `performance-violations.json` - Threshold violations
- `performance-comparison.json` - Baseline comparison

## 🔄 CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/e2e-tests.yml
- PR tests: Smoke + critical tests
- Main branch: Full test suite
- Nightly: All browsers + mobile
- Manual: Specific test suites
```

### Test Sharding
```bash
# Run tests in parallel across multiple machines
SHARD=1/4 npm run test:e2e:shard
SHARD=2/4 npm run test:e2e:shard
```

## 📸 Screenshots & Videos

### Screenshot Strategy
- Automatic on failure
- Manual with `takeScreenshot(page, 'name')`
- Visual regression with baseline comparison

### Naming Convention
`[feature]-[number]-[description].png`
Example: `spaced-repetition-01-dashboard.png`

## 🧹 Test Data Management

### Automatic Cleanup
- Test users are tracked and deleted
- Created documents are removed
- Workspaces and reports cleaned up

### Manual Cleanup
```bash
npm run test:e2e:clean
```

## 🚦 Best Practices

### 1. Use Data Test IDs
```html
<button data-testid="submit-button">Submit</button>
```

### 2. Wait Strategies
```typescript
// Good
await waitForNetworkIdle(page);
await waitForElement(page, selector);

// Avoid
await page.waitForTimeout(1000);
```

### 3. Error Handling
```typescript
await safeClick(page, selector, {
  retries: 3,
  screenshotName: 'action-name'
});
```

### 4. Performance Assertions
```typescript
const metric = await performanceTracker.endAction('action');
expect(metric.value).toBeLessThan(BENCHMARKS.tti.good);
```

## 🐛 Debugging

### Run Single Test
```bash
npm run test:e2e -- test-name.spec.ts
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Headed Mode
```bash
npm run test:e2e:headed
```

### View Report
```bash
npm run test:e2e:report
```

## 📈 Metrics & Reporting

### Test Results
- HTML report: `playwright-report/index.html`
- JSON results: `test-results/results.json`
- JUnit XML: `test-results/junit.xml`

### Performance Baseline
Track performance over time:
```bash
# Update baseline
npm run test:e2e:performance -- --update-baseline

# Compare against baseline
npm run test:e2e:performance
```

## 🔧 Troubleshooting

### Common Issues

1. **Auth State Not Found**
   ```bash
   rm -rf .auth
   npm run test:e2e
   ```

2. **Port Already in Use**
   ```bash
   lsof -ti:3000 | xargs kill
   lsof -ti:3001 | xargs kill
   ```

3. **Flaky Tests**
   - Increase timeouts in test-config.ts
   - Use `safeClick` instead of `page.click`
   - Add proper wait conditions

4. **Performance Violations**
   - Check performance-violations.json
   - Adjust thresholds in test-config.ts
   - Investigate slow operations

## 🤝 Contributing

1. Create feature branch
2. Write tests following patterns
3. Ensure all tests pass
4. Update screenshots if needed
5. Submit PR with test results

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://testingjavascript.com)
- [Performance Testing Guide](https://web.dev/vitals)