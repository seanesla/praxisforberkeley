import { test, expect } from '@playwright/test';

test.describe('Flashcards Feature', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    // Register a new user
    const uniqueId = Date.now();
    const email = `flashtest${uniqueId}@test.com`;
    const password = 'FlashTest123!';

    const registerResponse = await request.post('http://localhost:5001/api/auth/register', {
      data: { email, password }
    });

    expect(registerResponse.ok()).toBeTruthy();
    const registerData = await registerResponse.json();
    
    // Login
    const loginResponse = await request.post('http://localhost:5001/api/auth/login', {
      data: { email, password }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    token = loginData.token;
  });

  test('Complete flashcards workflow', async ({ page }) => {
    // 1. First go to login page and set token
    await page.goto('http://localhost:3000/login');
    
    // Set auth token in localStorage
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token);

    // 2. Now navigate to dashboard
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for dashboard to load
    await page.waitForSelector('text=Welcome back', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/flashcards-01-dashboard.png', fullPage: true });

    // 2. Upload a test document first
    console.log('Creating test document via API...');
    const response = await fetch('http://localhost:5001/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Machine Learning Fundamentals',
        content: `
          Machine Learning Fundamentals

          What is Machine Learning?
          Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves.

          Types of Machine Learning:
          
          1. Supervised Learning
          Supervised learning is where you have input variables (x) and an output variable (Y) and you use an algorithm to learn the mapping function from the input to the output. The goal is to approximate the mapping function so well that when you have new input data (x), you can predict the output variables (Y) for that data.

          2. Unsupervised Learning
          Unsupervised learning is where you only have input data (X) and no corresponding output variables. The goal for unsupervised learning is to model the underlying structure or distribution in the data in order to learn more about the data.

          3. Reinforcement Learning
          Reinforcement learning is about taking suitable action to maximize reward in a particular situation. It is employed by various software and machines to find the best possible behavior or path it should take in a specific situation.

          Key Concepts:
          - Training Data: The sample data used to train the model
          - Test Data: The sample data used to provide an unbiased evaluation
          - Features: Individual measurable properties or characteristics
          - Labels: The output or target variable in supervised learning
          - Model: The mathematical representation of patterns in data
          - Overfitting: When a model learns the training data too well
          - Underfitting: When a model is too simple to capture patterns

          Popular Algorithms:
          - Linear Regression: For predicting continuous values
          - Logistic Regression: For binary classification
          - Decision Trees: For both classification and regression
          - Random Forests: Ensemble method using multiple decision trees
          - Neural Networks: For complex pattern recognition
          - Support Vector Machines: For classification and regression
          - K-Means Clustering: For unsupervised grouping
        `
      })
    });
    
    const docData = await response.json();
    console.log('Document created:', docData);

    // 3. Navigate to flashcards
    await page.click('button:has-text("Study Flashcards")');
    await page.waitForURL('**/dashboard/flashcards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-02-main-page.png', fullPage: true });

    // 4. Click Generate Cards
    await page.click('text=Generate Cards');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-03-generate-page.png', fullPage: true });

    // 5. Select document and generate
    await page.selectOption('select', docData.document.id);
    await page.screenshot({ path: 'screenshots/flashcards-04-document-selected.png', fullPage: true });
    
    // Adjust number of cards
    await page.locator('input[type="range"]').fill('15');
    
    // Click generate
    await page.click('text=Generate Flashcards');
    
    // Wait for generation to complete
    await page.waitForSelector('text=Successfully generated', { timeout: 30000 });
    await page.screenshot({ path: 'screenshots/flashcards-05-generated.png', fullPage: true });

    // 6. Save and start studying
    await page.click('text=Save & Start Studying');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-06-study-mode.png', fullPage: true });

    // 7. Study a few cards
    // First card - click to flip
    await page.click('.glass.rounded-xl');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/flashcards-07-card-flipped.png', fullPage: true });

    // Rate as medium
    await page.click('text=Medium');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/flashcards-08-next-card.png', fullPage: true });

    // Second card - rate as easy
    await page.click('.glass.rounded-xl');
    await page.waitForTimeout(500);
    await page.click('text=Easy');
    await page.waitForTimeout(500);

    // Third card - rate as hard
    await page.click('.glass.rounded-xl');
    await page.waitForTimeout(500);
    await page.click('text=Hard');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/flashcards-09-progress.png', fullPage: true });

    // 8. Exit study mode
    await page.click('text=Exit Study');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-10-back-to-list.png', fullPage: true });

    // 9. View statistics
    await page.click('button:has-text("Statistics")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-11-statistics.png', fullPage: true });

    // 10. Go back and check due cards
    await page.click('button[aria-label*="back" i], button:has([class*="ArrowLeft"])').first();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/flashcards-12-due-cards.png', fullPage: true });

    console.log('Flashcards test completed successfully!');
  });
});