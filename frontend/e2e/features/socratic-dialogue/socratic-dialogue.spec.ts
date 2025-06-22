import { test, expect, testData } from '../../fixtures/base-fixtures';

test.describe('Socratic Dialogue Method', () => {
  test.beforeEach(async ({ page, testHelpers }) => {
    // Mock documents for testing
    await testHelpers.mockAPIResponse('documents', {
      documents: [
        {
          id: 'doc1',
          title: 'Introduction to Machine Learning',
          content: testData.documents.technical.content,
          created_at: new Date().toISOString()
        },
        {
          id: 'doc2',
          title: 'Quantum Computing Basics',
          content: testData.documents.academic.content,
          created_at: new Date().toISOString()
        }
      ]
    });
  });

  test('should navigate to Socratic dialogue from command palette', async ({ page, testHelpers }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await testHelpers.waitForElement('[data-testid="command-palette"]');
    
    // Search for Socratic dialogue
    await page.fill('[placeholder*="Search"]', 'socratic');
    
    // Click on Socratic option
    await page.click('text=Start Socratic Dialogue');
    
    // Should navigate to Socratic page
    await expect(page).toHaveURL('/socratic');
    
    // Verify page elements
    await expect(page.locator('h1:has-text("Socratic Dialogue Method")')).toBeVisible();
    await expect(page.locator('text=Learn Through Guided Questions')).toBeVisible();
  });

  test('should select document and topic', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    // Select a document
    await testHelpers.clickTestId('document-doc1');
    
    // Verify document is selected
    await expect(page.locator('[data-testid="document-doc1"]')).toHaveClass(/ring-2 ring-blue-500/);
    
    // Topics should appear
    await testHelpers.expectVisible('text=Choose Your Learning Goal');
    
    // Select a topic
    await testHelpers.clickTestId('topic-understand');
    
    // Verify topic is selected
    await expect(page.locator('[data-testid="topic-understand"]')).toHaveClass(/ring-2 ring-blue-500/);
    
    // Start button should appear
    await testHelpers.expectVisible('[data-testid="start-dialogue"]');
  });

  test('should start Socratic dialogue session', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    // Mock session start response
    await testHelpers.mockAPIResponse('socratic/start', {
      sessionId: 'session-123',
      firstQuestion: {
        id: 'q1',
        text: 'What do you think machine learning is fundamentally about?',
        type: 'open',
        hint: 'Think about how machines can learn patterns from data',
        difficulty: 'easy',
        concept: 'ML fundamentals'
      }
    });
    
    // Select document and topic
    await testHelpers.clickTestId('document-doc1');
    await testHelpers.clickTestId('topic-understand');
    
    // Start dialogue
    await testHelpers.clickTestId('start-dialogue');
    
    // Should show dialogue interface
    await testHelpers.expectVisible('[data-testid="socratic-dialogue"]');
    
    // Should show first question
    await expect(page.locator('text=What do you think machine learning is fundamentally about?')).toBeVisible();
    
    // Should show question metadata
    await expect(page.locator('text=Open Question')).toBeVisible();
    await expect(page.locator('text=easy')).toBeVisible();
  });

  test('should handle open-ended questions', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    // Setup mocks
    await testHelpers.mockAPIResponse('socratic/start', {
      sessionId: 'session-123',
      firstQuestion: {
        id: 'q1',
        text: 'How would you explain machine learning to someone new?',
        type: 'open',
        difficulty: 'easy',
        concept: 'ML basics'
      }
    });
    
    await testHelpers.mockAPIResponse('socratic/evaluate', {
      correct: true,
      explanation: 'Good understanding! You captured the essence of ML as learning from data.',
      suggestedDepth: 2
    });
    
    // Start dialogue
    await testHelpers.clickTestId('document-doc1');
    await testHelpers.clickTestId('topic-understand');
    await testHelpers.clickTestId('start-dialogue');
    
    // Type answer
    const answerInput = page.locator('[data-testid="answer-input"]');
    await answerInput.fill('Machine learning is about creating algorithms that can learn patterns from data without being explicitly programmed.');
    
    // Submit answer
    await testHelpers.clickTestId('submit-answer');
    
    // Should show evaluation
    await testHelpers.expectVisible('[data-testid="explanation"]');
    await expect(page.locator('text=Good understanding!')).toBeVisible();
    await expect(page.locator('text=Excellent!')).toBeVisible();
  });

  test('should handle multiple choice questions', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    await testHelpers.mockAPIResponse('socratic/start', {
      sessionId: 'session-123',
      firstQuestion: {
        id: 'q2',
        text: 'Which of these best describes supervised learning?',
        type: 'multiple-choice',
        options: [
          'Learning from labeled data',
          'Learning without any data',
          'Learning from rewards',
          'Learning from unlabeled data'
        ],
        difficulty: 'medium',
        concept: 'Supervised learning'
      }
    });
    
    // Start dialogue
    await testHelpers.clickTestId('document-doc1');
    await testHelpers.clickTestId('topic-understand');
    await testHelpers.clickTestId('start-dialogue');
    
    // Should show options
    await testHelpers.expectVisible('text=Learning from labeled data');
    await testHelpers.expectVisible('text=Learning without any data');
    
    // Select an option
    await page.click('text=Learning from labeled data');
    
    // Should highlight selected option
    const selectedOption = page.locator('text=Learning from labeled data').locator('..');
    await expect(selectedOption).toHaveClass(/bg-blue-600\/20 border-2 border-blue-500/);
    
    // Submit answer
    await testHelpers.clickTestId('submit-answer');
  });

  test('should show hints when requested', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    await testHelpers.mockAPIResponse('socratic/start', {
      sessionId: 'session-123',
      firstQuestion: {
        id: 'q3',
        text: 'What is the relationship between bias and variance in ML models?',
        type: 'open',
        hint: 'Consider how model complexity affects prediction errors',
        difficulty: 'hard',
        concept: 'Bias-variance tradeoff'
      }
    });
    
    // Start dialogue
    await testHelpers.clickTestId('document-doc1');
    await testHelpers.clickTestId('topic-analyze');
    await testHelpers.clickTestId('start-dialogue');
    
    // Hint button should be visible
    await testHelpers.expectVisible('[data-testid="hint-button"]');
    
    // Click hint button
    await testHelpers.clickTestId('hint-button');
    
    // Hint should appear
    await testHelpers.expectVisible('[data-testid="hint"]');
    await expect(page.locator('text=Consider how model complexity affects prediction errors')).toBeVisible();
  });

  test('should progress through multiple questions', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    // Mock first question
    await testHelpers.mockAPIResponse('socratic/start', {
      sessionId: 'session-123',
      firstQuestion: {
        id: 'q1',
        text: 'First question',
        type: 'open',
        difficulty: 'easy',
        concept: 'Concept 1'
      }
    });
    
    // Start dialogue
    await testHelpers.clickTestId('document-doc1');
    await testHelpers.clickTestId('topic-understand');
    await testHelpers.clickTestId('start-dialogue');
    
    // Answer first question
    await page.fill('[data-testid="answer-input"]', 'First answer');
    
    await testHelpers.mockAPIResponse('socratic/evaluate', {
      correct: true,
      explanation: 'Good!',
      suggestedDepth: 2
    });
    
    await testHelpers.clickTestId('submit-answer');
    
    // Mock next question
    await testHelpers.mockAPIResponse('socratic/next-question', {
      question: {
        id: 'q2',
        text: 'Second question - building on your understanding',
        type: 'open',
        difficulty: 'medium',
        concept: 'Concept 2'
      }
    });
    
    // Click next question
    await testHelpers.clickTestId('next-question');
    
    // Should show second question
    await expect(page.locator('text=Second question - building on your understanding')).toBeVisible();
    
    // Progress should update
    await expect(page.locator('text=Question 2')).toBeVisible();
  });

  test('should show session summary', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    // Start session
    await testHelpers.mockAPIResponse('socratic/start', {
      sessionId: 'session-123',
      firstQuestion: {
        id: 'q1',
        text: 'Question',
        type: 'open',
        difficulty: 'easy',
        concept: 'Test concept'
      }
    });
    
    await testHelpers.clickTestId('document-doc1');
    await testHelpers.clickTestId('topic-understand');
    await testHelpers.clickTestId('start-dialogue');
    
    // Answer question
    await page.fill('[data-testid="answer-input"]', 'Answer');
    await testHelpers.mockAPIResponse('socratic/evaluate', {
      correct: true,
      explanation: 'Good!'
    });
    await testHelpers.clickTestId('submit-answer');
    
    // Mock no more questions (session complete)
    await testHelpers.mockAPIResponse('socratic/next-question', {
      question: null,
      complete: true
    });
    
    await testHelpers.mockAPIResponse('socratic/summary', {
      summary: 'Great job! You demonstrated understanding of key concepts.',
      statistics: {
        totalQuestions: 5,
        correctAnswers: 4,
        accuracy: 80,
        conceptsCovered: 3
      }
    });
    
    // Click next to trigger summary
    await testHelpers.clickTestId('next-question');
    
    // Should show summary
    await testHelpers.expectVisible('[data-testid="session-summary"]');
    await expect(page.locator('text=Great Learning Session!')).toBeVisible();
    await expect(page.locator('text=80%')).toBeVisible();
    await expect(page.locator('text=Accuracy')).toBeVisible();
  });

  test('should track progress indicators', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    // Setup and start
    await testHelpers.mockAPIResponse('socratic/start', {
      sessionId: 'session-123',
      firstQuestion: {
        id: 'q1',
        text: 'Question 1',
        type: 'open',
        difficulty: 'easy',
        concept: 'Concept 1'
      }
    });
    
    await testHelpers.clickTestId('document-doc1');
    await testHelpers.clickTestId('topic-understand');
    await testHelpers.clickTestId('start-dialogue');
    
    // Check initial progress
    await expect(page.locator('text=Question 1')).toBeVisible();
    await expect(page.locator('text=Depth Level: 1')).toBeVisible();
    await expect(page.locator('text=0 concepts explored')).toBeVisible();
    
    // Answer question correctly
    await page.fill('[data-testid="answer-input"]', 'Correct answer');
    await testHelpers.mockAPIResponse('socratic/evaluate', {
      correct: true,
      explanation: 'Correct!',
      suggestedDepth: 2
    });
    await testHelpers.clickTestId('submit-answer');
    
    // Progress indicators should update
    const progressBars = page.locator('.h-2.bg-green-500');
    await expect(progressBars).toHaveCount(1); // One correct answer
  });

  test('accessibility: dialogue should be keyboard navigable', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    // Check accessibility
    const a11yResults = await testHelpers.checkAccessibility('socratic-dialogue');
    expect(a11yResults.violations).toHaveLength(0);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Focus first document
    await page.keyboard.press('Enter'); // Select document
    
    await page.keyboard.press('Tab'); // Navigate to topics
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Select topic
    
    await page.keyboard.press('Tab'); // Navigate to start button
    await page.keyboard.press('Enter'); // Start dialogue
    
    // Should start session
    await testHelpers.expectVisible('[data-testid="socratic-dialogue"]');
  });

  test('performance: questions should load quickly', async ({ page, testHelpers }) => {
    await page.goto('/socratic');
    
    const metrics = await testHelpers.measurePerformance('socratic-load', async () => {
      await testHelpers.clickTestId('document-doc1');
      await testHelpers.clickTestId('topic-understand');
      await testHelpers.clickTestId('start-dialogue');
      
      await testHelpers.waitForElement('[data-testid="socratic-dialogue"]');
    });
    
    expect(metrics.duration).toBeLessThan(2000); // Should load in under 2 seconds
  });
});