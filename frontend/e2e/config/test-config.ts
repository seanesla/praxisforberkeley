// Centralized test configuration
export const TEST_CONFIG = {
  // Timeouts
  timeouts: {
    navigation: 30000,
    element: 5000,
    network: 10000,
    animation: 1000,
    debounce: 500
  },
  
  // Performance thresholds
  performance: {
    pageLoad: 3000,
    apiResponse: 1000,
    interaction: 300,
    search: 1500,
    chartRender: 2000
  },
  
  // Retry configuration
  retries: {
    test: 2,
    element: 3,
    network: 3
  },
  
  // Screenshot settings
  screenshots: {
    fullPage: false,
    animations: 'disabled' as const,
    maxDiffPixels: 100,
    threshold: 0.2
  },
  
  // Test data
  testData: {
    cleanupDelay: 5000,
    userPrefix: 'test_',
    documentPrefix: 'test_doc_'
  },
  
  // Feature flags
  features: {
    visualRegression: true,
    performanceTracking: true,
    accessibilityChecks: true,
    networkMocking: true
  },
  
  // Accessibility standards
  accessibility: {
    wcagLevel: 'AA' as const,
    includeWarnings: false,
    skipRegions: ['advertisement', 'complementary']
  }
};

// Viewport configurations
export const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1920, height: 1080, name: 'Desktop HD' },
  wide: { width: 2560, height: 1440, name: 'Desktop 2K' }
};

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout'
  },
  documents: {
    list: '/api/documents',
    upload: '/api/documents/upload',
    delete: '/api/documents/:id'
  },
  flashcards: {
    generate: '/api/flashcards/generate',
    study: '/api/spaced-repetition/due'
  },
  analytics: {
    overview: '/api/analytics/v2/overview',
    export: '/api/analytics/v2/export'
  }
};

// Test user credentials
export const TEST_CREDENTIALS = {
  primary: {
    email: 'test.primary@example.com',
    password: 'TestPass123!',
    name: 'Primary Test User'
  },
  secondary: {
    email: 'test.secondary@example.com',
    password: 'TestPass456!',
    name: 'Secondary Test User'
  },
  admin: {
    email: 'test.admin@example.com',
    password: 'AdminPass789!',
    name: 'Admin Test User'
  }
};

// Selectors with data-testid
export const SELECTORS = {
  // Authentication
  auth: {
    emailInput: '[data-testid="email-input"], input[type="email"]',
    passwordInput: '[data-testid="password-input"], input[type="password"]',
    submitButton: '[data-testid="submit-button"], button[type="submit"]',
    logoutButton: '[data-testid="logout-button"], button:has-text("Logout")'
  },
  
  // Navigation
  nav: {
    dashboard: '[data-testid="nav-dashboard"], a[href="/dashboard"]',
    documents: '[data-testid="nav-documents"], a[href*="/documents"]',
    flashcards: '[data-testid="nav-flashcards"], a[href*="/flashcards"]',
    study: '[data-testid="nav-study"], a[href*="/study"]',
    analytics: '[data-testid="nav-analytics"], a[href*="/analytics"]'
  },
  
  // Common UI elements
  ui: {
    loader: '[data-testid="loader"], .loading-spinner',
    error: '[data-testid="error-message"], .error-message',
    success: '[data-testid="success-message"], .success-message',
    modal: '[data-testid="modal"], [role="dialog"]',
    dropdown: '[data-testid="dropdown"], [role="combobox"]'
  }
};

// Error messages
export const ERROR_MESSAGES = {
  network: 'Network request failed',
  timeout: 'Operation timed out',
  notFound: 'Element not found',
  validation: 'Validation failed',
  auth: 'Authentication required'
};

// Performance benchmarks
export const BENCHMARKS = {
  // Time to interactive
  tti: {
    excellent: 1000,
    good: 2000,
    needsImprovement: 3000
  },
  
  // First contentful paint
  fcp: {
    excellent: 500,
    good: 1000,
    needsImprovement: 2000
  },
  
  // API response times
  api: {
    excellent: 200,
    good: 500,
    needsImprovement: 1000
  }
};