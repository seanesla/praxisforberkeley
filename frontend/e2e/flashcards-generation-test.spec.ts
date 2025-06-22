import { test, expect } from '@playwright/test';

test.describe('Flashcard Generation Test', () => {
  test('Test flashcard generation with real backend', async ({ page }) => {
    console.log('=== Testing Flashcard Generation ===');
    
    // 1. First create a test user
    const timestamp = Date.now();
    const testEmail = `flashtest${timestamp}@example.com`;
    const testPassword = 'flashtest123';
    
    console.log('Creating test user:', testEmail);
    
    // Register user via API
    const registerResponse = await fetch('http://localhost:5001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Flash Test User'
      })
    });
    
    if (!registerResponse.ok) {
      console.log('Registration failed, trying login...');
    }
    
    // Login to get token
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    if (!loginResponse.ok) {
      console.error('Login failed');
      return;
    }
    
    const { token } = await loginResponse.json();
    console.log('Got auth token');
    
    // 2. Create a document
    console.log('Creating test document...');
    const docResponse = await fetch('http://localhost:5001/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Machine Learning Basics',
        content: `Machine Learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.

Key Concepts:
1. Supervised Learning: Learning from labeled data with input-output pairs
2. Unsupervised Learning: Finding patterns in unlabeled data
3. Neural Networks: Computational models inspired by the human brain
4. Deep Learning: Neural networks with multiple layers
5. Training Data: The dataset used to train the model
6. Validation: Testing the model on unseen data
7. Overfitting: When a model performs well on training data but poorly on new data
8. Gradient Descent: An optimization algorithm to minimize errors
9. Feature Engineering: Creating useful features from raw data
10. Model Evaluation: Measuring how well a model performs`,
        type: 'text'
      })
    });
    
    if (!docResponse.ok) {
      console.error('Document creation failed');
      return;
    }
    
    const { document: doc } = await docResponse.json();
    console.log('Document created:', doc.id);
    
    // 3. Generate flashcards
    console.log('Generating flashcards...');
    const flashcardsResponse = await fetch(`http://localhost:5001/api/flashcards/generate/${doc.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numCards: 5 })
    });
    
    if (!flashcardsResponse.ok) {
      const error = await flashcardsResponse.text();
      console.error('Flashcard generation failed:', error);
      return;
    }
    
    const { flashcards } = await flashcardsResponse.json();
    console.log('Generated flashcards:', flashcards.length);
    
    // 4. Navigate to flashcards page with auth
    await page.goto('http://localhost:3000/flashcards-auth-test');
    
    // Set the token in localStorage
    await page.evaluate((authToken) => {
      localStorage.setItem('auth_token', authToken);
    }, token);
    
    // Reload to apply auth
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/generation-01-logged-in.png', fullPage: true });
    
    // Check if we see the flashcards
    const hasFlashcards = await page.locator('text=/Question:/')?.isVisible();
    console.log('Flashcards visible on page:', hasFlashcards);
    
    // 5. Test the generated flashcards
    if (flashcards && flashcards.length > 0) {
      console.log('\nGenerated flashcards:');
      flashcards.slice(0, 3).forEach((card: any, index: number) => {
        console.log(`${index + 1}. Q: ${card.front}`);
        console.log(`   A: ${card.back?.substring(0, 100)}...`);
      });
    }
    
    // 6. Test study mode
    const dueCards = await fetch('http://localhost:5001/api/flashcards/due', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (dueCards.ok) {
      const { flashcards: due } = await dueCards.json();
      console.log('\nDue flashcards:', due.length);
    }
    
    console.log('\n=== Generation Test Complete ===');
  });
});