import { test as base } from '@playwright/test';
import { EnhancedTestHelpers } from '../helpers/enhanced-test-helpers';

// Custom fixtures that extend Playwright's base test
export const test = base.extend<{
  testHelpers: EnhancedTestHelpers;
  authenticatedPage: void;
}>({
  // Enhanced test helpers fixture
  testHelpers: async ({ page }, use, testInfo) => {
    const helpers = new EnhancedTestHelpers(page, testInfo);
    await use(helpers);
  },

  // Pre-authenticated page fixture
  authenticatedPage: [async ({ page, testHelpers }, use) => {
    // Set up authentication before each test
    await testHelpers.authenticateUser();
    
    // Use the authenticated page
    await use();
    
    // Clean up after test if needed
  }, { auto: true }] // This fixture runs automatically
});

export { expect } from '@playwright/test';

// Test data fixtures
export const testData = {
  users: {
    default: {
      email: 'test@example.com',
      password: 'testpass123',
      name: 'Test User'
    },
    student: {
      email: 'student@example.com',
      password: 'student123',
      name: 'Student User'
    },
    researcher: {
      email: 'researcher@example.com',
      password: 'research123',
      name: 'Research User'
    }
  },
  
  documents: {
    simple: {
      title: 'Simple Test Document',
      content: 'This is a simple test document for automated testing.'
    },
    academic: {
      title: 'Quantum Computing Fundamentals',
      content: `
        Quantum computing represents a fundamental shift in computation, leveraging quantum mechanical phenomena.
        
        Key concepts include:
        - Superposition: Qubits can exist in multiple states simultaneously
        - Entanglement: Quantum states can be correlated across qubits
        - Quantum gates: Operations that manipulate qubit states
        
        Applications span cryptography, optimization, and simulation of quantum systems.
      `
    },
    technical: {
      title: 'Machine Learning Architecture',
      content: `
        Modern ML architectures leverage deep neural networks for complex pattern recognition.
        
        Components:
        1. Input layer: Receives raw data
        2. Hidden layers: Extract features
        3. Output layer: Produces predictions
        
        Training involves backpropagation and gradient descent optimization.
      `
    }
  },
  
  flashcards: {
    basic: [
      { front: 'What is AI?', back: 'Artificial Intelligence is the simulation of human intelligence by machines.' },
      { front: 'Define ML', back: 'Machine Learning is a subset of AI that enables systems to learn from data.' },
      { front: 'What is NLP?', back: 'Natural Language Processing enables computers to understand human language.' }
    ]
  },
  
  mindMapData: {
    simple: {
      title: 'Test Mind Map',
      nodes: [
        { id: '1', label: 'Central Idea', x: 400, y: 300 },
        { id: '2', label: 'Branch 1', x: 200, y: 200 },
        { id: '3', label: 'Branch 2', x: 600, y: 200 },
        { id: '4', label: 'Sub-branch 1.1', x: 100, y: 100 },
        { id: '5', label: 'Sub-branch 2.1', x: 700, y: 100 }
      ],
      edges: [
        { source: '1', target: '2' },
        { source: '1', target: '3' },
        { source: '2', target: '4' },
        { source: '3', target: '5' }
      ]
    }
  },
  
  exercises: {
    multipleChoice: {
      question: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 2
    },
    fillInBlank: {
      text: 'The ___ is the largest planet in our solar system.',
      answer: 'Jupiter'
    },
    trueFalse: {
      statement: 'The Earth orbits around the Sun.',
      answer: true
    }
  }
};

// Reusable test scenarios
export const scenarios = {
  // Upload and process a document
  async uploadDocument(helpers: EnhancedTestHelpers, document: typeof testData.documents.simple) {
    await helpers.page.goto('/dashboard/documents/upload');
    
    // Create temporary file
    const fs = require('fs').promises;
    const path = require('path');
    const tempFile = path.join(process.cwd(), 'temp-test-doc.txt');
    await fs.writeFile(tempFile, document.content);
    
    // Upload file
    await helpers.uploadFile(tempFile, 'input[type="file"]');
    
    // Clean up
    await fs.unlink(tempFile);
    
    // Wait for processing
    await helpers.waitForAPI('documents');
    
    return tempFile;
  },
  
  // Create a new note
  async createNote(helpers: EnhancedTestHelpers, title: string, content: string) {
    await helpers.page.goto('/notes/new');
    await helpers.fillTestId('note-title', title);
    await helpers.fillTestId('note-content', content);
    await helpers.clickTestId('save-note');
    await helpers.waitForAPI('notes');
  },
  
  // Generate flashcards from document
  async generateFlashcards(helpers: EnhancedTestHelpers, documentId: string) {
    await helpers.page.goto(`/documents/${documentId}`);
    await helpers.clickTestId('generate-flashcards');
    await helpers.waitForAPI('flashcards/generate');
  }
};