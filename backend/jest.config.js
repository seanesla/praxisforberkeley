/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/test/**',
    '!src/server.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^pdf-parse$': '<rootDir>/test/__mocks__/pdf-parse',
    '^mammoth$': '<rootDir>/test/__mocks__/mammoth',
    '^file-type$': '<rootDir>/test/__mocks__/file-type',
    '^@supabase/supabase-js$': '<rootDir>/test/__mocks__/supabase',
    '^chromadb$': '<rootDir>/test/__mocks__/chromadb',
    '^@anthropic-ai/sdk$': '<rootDir>/test/__mocks__/anthropic'
  },
  testTimeout: 30000,
  maxWorkers: '50%',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        esModuleInterop: true
      }
    }]
  }
};