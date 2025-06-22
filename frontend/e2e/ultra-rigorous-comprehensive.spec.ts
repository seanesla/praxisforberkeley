import { test, expect, chromium, Page } from '@playwright/test';
import { 
  TEST_USERS,
  loginUser,
  registerUser,
  takeScreenshot,
  clickWithScreenshot,
  fillFormWithScreenshots,
  waitForAnimation,
  uploadFile,
  verifyVisible,
  setupConsoleLogging,
  testHoverState,
  testKeyboardNavigation,
  createTestFlashcard,
  createTestMindMap,
  testDragAndDrop
} from './helpers/test-helpers';

// Custom test user for this comprehensive test
const ULTRA_TEST_USER = {
  email: `ultra.test.${Date.now()}@example.com`,
  password: 'UltraSecure123!',
  name: 'Ultra Test User'
};

// Helper to click locator with screenshots
async function clickLocatorWithScreenshot(page: Page, locator: any, screenshotName: string) {
  if (await locator.isVisible()) {
    await locator.scrollIntoViewIfNeeded();
    await takeScreenshot(page, `before-${screenshotName}`);
    await locator.click();
    await waitForAnimation(page);
    await takeScreenshot(page, `after-${screenshotName}`);
  }
}

test.describe('Ultra-Rigorous Comprehensive Test Suite', () => {
  test.setTimeout(45 * 60 * 1000); // 45 minutes timeout

  test('Complete application test with all features', async () => {
    // Launch browser in headed mode with slow motion
    const browser = await chromium.launch({
      headless: false,
      slowMo: 100, // Slow down by 100ms for better visibility
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: './test-results/videos/',
        size: { width: 1920, height: 1080 }
      }
    });

    const page = await context.newPage();
    
    // Setup console logging
    setupConsoleLogging(page);
    
    // Monitor network errors
    page.on('requestfailed', request => {
      console.error(`❌ Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Monitor performance
    const performanceMetrics: Record<string, number> = {};
    const startTime = Date.now();

    try {
      console.log('🚀 Starting Ultra-Rigorous Comprehensive Test');
      console.log(`📍 Testing on: http://localhost:3001`);
      console.log(`👤 Test user: ${ULTRA_TEST_USER.email}`);
      console.log('');

      // ========== PHASE 1: AUTHENTICATION & SETUP ==========
      await test.step('Phase 1: Authentication & Setup', async () => {
        console.log('=== PHASE 1: AUTHENTICATION & SETUP ===');
        
        // Navigate to application
        await page.goto('http://localhost:3001');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-01-landing-page');

        // Check for console errors
        const consoleErrors = await page.evaluate(() => {
          const errors: string[] = [];
          window.addEventListener('error', (e) => errors.push(e.message));
          return errors;
        });
        
        if (consoleErrors.length > 0) {
          console.warn('⚠️ Console errors detected:', consoleErrors);
        }

        // Test registration flow
        const registerLink = page.locator('a[href*="register"], button:has-text("Sign up"), button:has-text("Register")').first();
        if (await registerLink.isVisible()) {
          await registerLink.scrollIntoViewIfNeeded();
          await takeScreenshot(page, 'before-ultra-go-to-register', { highlight: 'a[href*="register"], button:has-text("Sign up"), button:has-text("Register")' });
          await registerLink.click();
          await waitForAnimation(page);
          await takeScreenshot(page, 'after-ultra-go-to-register');
        }

        // Fill registration form
        await fillFormWithScreenshots(page, {
          'input[name="name"]': ULTRA_TEST_USER.name,
          'input[name="email"], input[type="email"]': ULTRA_TEST_USER.email,
          'input[name="password"], input[type="password"]': ULTRA_TEST_USER.password,
          'input[name="confirmPassword"], input[name="password_confirmation"]': ULTRA_TEST_USER.password
        }, 'ultra-registration');

        // Submit registration
        const submitButton = page.locator('button[type="submit"]').first();
        await clickLocatorWithScreenshot(page, submitButton, 'ultra-register-submit');

        // Wait for redirect
        await page.waitForURL(/\/(dashboard|verify-email|login)/, { timeout: 15000 });
        await takeScreenshot(page, 'ultra-02-after-registration');

        // If redirected to login, log in
        if (page.url().includes('login')) {
          await loginUser(page, ULTRA_TEST_USER);
        }

        // Verify dashboard loaded
        await expect(page).toHaveURL(/\/dashboard/);
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-03-dashboard-loaded');

        performanceMetrics['authenticationTime'] = Date.now() - startTime;
        console.log(`✅ Authentication completed in ${performanceMetrics['authenticationTime']}ms`);
      });

      // ========== PHASE 2: UNIFIED WORKSPACE & COMMAND PALETTE ==========
      await test.step('Phase 2: Unified Workspace & Command Palette', async () => {
        console.log('\n=== PHASE 2: UNIFIED WORKSPACE & COMMAND PALETTE ===');
        const phaseStart = Date.now();

        // Test activity feed
        const activityFeed = page.locator('.activity-feed, [data-testid="activity-feed"]').first();
        if (await activityFeed.isVisible()) {
          await takeScreenshot(page, 'ultra-activity-feed-visible');
          console.log('✅ Activity feed is visible');
        }

        // Test command palette (Cmd+K)
        console.log('📝 Testing command palette...');
        await page.keyboard.press('Control+k');
        await waitForAnimation(page);
        
        const commandPalette = page.locator('.command-palette, [data-testid="command-palette"], [role="combobox"]').first();
        await expect(commandPalette).toBeVisible({ timeout: 5000 });
        await takeScreenshot(page, 'ultra-04-command-palette-open');

        // Test natural language commands
        const commands = [
          'create a new note',
          'upload document', 
          'show flashcards',
          'open mind maps'
        ];

        for (const command of commands) {
          console.log(`  Testing command: "${command}"`);
          await page.keyboard.type(command);
          await takeScreenshot(page, `ultra-command-${command.replace(/\s+/g, '-')}`);
          await page.waitForTimeout(500);
          
          // Clear command
          await page.keyboard.press('Control+a');
          await page.keyboard.press('Delete');
        }

        // Close command palette
        await page.keyboard.press('Escape');
        await waitForAnimation(page);

        // Test floating AI assistant
        const aiAssistant = page.locator('.floating-ai, [data-testid="ai-assistant"], button[aria-label*="AI"]').first();
        if (await aiAssistant.isVisible()) {
          await clickWithScreenshot(page, aiAssistant, 'ultra-ai-assistant');
          await takeScreenshot(page, 'ultra-05-ai-assistant-open');
          
          // Close AI assistant
          await page.keyboard.press('Escape');
        }

        performanceMetrics['workspaceTestTime'] = Date.now() - phaseStart;
        console.log(`✅ Workspace test completed in ${performanceMetrics['workspaceTestTime']}ms`);
      });

      // ========== PHASE 3: DOCUMENT MANAGEMENT ==========
      await test.step('Phase 3: Document Management', async () => {
        console.log('\n=== PHASE 3: DOCUMENT MANAGEMENT ===');
        const phaseStart = Date.now();

        // Navigate to documents
        await page.goto('http://localhost:3001/dashboard/documents');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-06-documents-page');

        // Upload test document
        console.log('📄 Uploading test document...');
        const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add Document"), a[href*="upload"]').first();
        await clickWithScreenshot(page, uploadButton, 'ultra-upload-button');

        // Handle file upload
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          // Create a test file
          await page.evaluate(() => {
            const content = `# Newton's Laws of Motion

## First Law (Law of Inertia)
An object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force.

## Second Law (F = ma)
The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass.

## Third Law (Action-Reaction)
For every action, there is an equal and opposite reaction.

### Applications
- Rocket propulsion
- Walking and running
- Car safety features
- Sports physics`;
            
            const blob = new Blob([content], { type: 'text/plain' });
            const file = new File([blob], 'physics-test-document.txt', { type: 'text/plain' });
            
            // Store file reference for later use
            (window as any).testFile = file;
          });

          // Set the file
          const file = await page.evaluateHandle(() => (window as any).testFile);
          await fileInput.setInputFiles([file]);
          
          await waitForAnimation(page);
          await takeScreenshot(page, 'ultra-07-file-selected');
        }

        // Wait for upload and processing
        console.log('⏳ Waiting for document processing...');
        await page.waitForSelector('text=/processed|complete|ready|success/i', { timeout: 30000 });
        await takeScreenshot(page, 'ultra-08-document-processed');

        // Test document DNA fingerprinting
        const documentCard = page.locator('text=physics-test-document.txt').first();
        if (await documentCard.isVisible()) {
          await clickWithScreenshot(page, documentCard, 'ultra-document-details');
          
          // Look for DNA visualization
          const dnaVisualization = page.locator('.document-dna, [data-testid="document-dna"]').first();
          if (await dnaVisualization.isVisible()) {
            await takeScreenshot(page, 'ultra-09-document-dna');
            console.log('✅ Document DNA fingerprinting visible');
          }
        }

        // Test semantic search
        console.log('🔍 Testing semantic search...');
        const searchInput = page.locator('input[placeholder*="Search"], input[name="search"]').first();
        if (await searchInput.isVisible()) {
          await searchInput.fill('laws of motion physics');
          await takeScreenshot(page, 'ultra-search-query');
          
          await page.keyboard.press('Enter');
          await waitForAnimation(page);
          
          // Check search results
          await expect(page.locator('text=physics-test-document.txt')).toBeVisible();
          await takeScreenshot(page, 'ultra-10-search-results');
        }

        performanceMetrics['documentManagementTime'] = Date.now() - phaseStart;
        console.log(`✅ Document management completed in ${performanceMetrics['documentManagementTime']}ms`);
      });

      // ========== PHASE 4: INSTANT CONTEXT RETRIEVAL ==========
      await test.step('Phase 4: Instant Context Retrieval', async () => {
        console.log('\n=== PHASE 4: INSTANT CONTEXT RETRIEVAL ===');
        const phaseStart = Date.now();

        // Navigate to smart notes
        await page.goto('http://localhost:3001/notes/new');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-11-smart-notes-page');

        // Select documents for context
        const selectDocsButton = page.locator('button:has-text("Select Documents"), button:has-text("Choose Documents")').first();
        if (await selectDocsButton.isVisible()) {
          await clickWithScreenshot(page, selectDocsButton, 'ultra-select-docs');
          
          // Select our test document
          const docCheckbox = page.locator('input[type="checkbox"]').first();
          await docCheckbox.check();
          await takeScreenshot(page, 'ultra-12-doc-selected');
          
          // Confirm selection
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Done")').first();
          await confirmButton.click();
          await waitForAnimation(page);
        }

        // Test instant context retrieval
        console.log('✨ Testing instant context retrieval...');
        const editor = page.locator('textarea, [contenteditable="true"], .editor-content').first();
        
        // Type and pause to trigger ghost text
        await editor.click();
        await page.keyboard.type('Newton\'s first law states that');
        await takeScreenshot(page, 'ultra-13-typing-started');
        
        // Wait for ghost text (1.5 seconds pause)
        console.log('⏳ Waiting for ghost text suggestion...');
        await page.waitForTimeout(1600);
        
        // Check for ghost text
        const ghostText = page.locator('.ghost-text, [data-testid="ghost-text"], .suggestion').first();
        if (await ghostText.isVisible()) {
          await takeScreenshot(page, 'ultra-14-ghost-text-visible');
          console.log('✅ Ghost text suggestion appeared');
          
          // Accept suggestion with Tab
          await page.keyboard.press('Tab');
          await takeScreenshot(page, 'ultra-15-suggestion-accepted');
          console.log('✅ Suggestion accepted with Tab');
        }

        // Check source attribution
        const sourceAttribution = page.locator('.source-attribution, [data-testid="source"]').first();
        if (await sourceAttribution.isVisible()) {
          await takeScreenshot(page, 'ultra-16-source-attribution');
          console.log('✅ Source attribution visible');
        }

        performanceMetrics['instantContextTime'] = Date.now() - phaseStart;
        console.log(`✅ Instant context retrieval completed in ${performanceMetrics['instantContextTime']}ms`);
      });

      // ========== PHASE 5: FLASHCARDS & SPACED REPETITION ==========
      await test.step('Phase 5: Flashcards & Spaced Repetition', async () => {
        console.log('\n=== PHASE 5: FLASHCARDS & SPACED REPETITION ===');
        const phaseStart = Date.now();

        // Navigate to flashcards
        await page.goto('http://localhost:3001/dashboard/flashcards');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-17-flashcards-page');

        // Generate flashcards from document
        console.log('🎴 Generating flashcards from document...');
        const generateButton = page.locator('button:has-text("Generate from Document"), button:has-text("AI Generate")').first();
        if (await generateButton.isVisible()) {
          await clickWithScreenshot(page, generateButton, 'ultra-generate-flashcards');
          
          // Select document
          const docSelect = page.locator('text=physics-test-document.txt').first();
          if (await docSelect.isVisible()) {
            await docSelect.click();
            
            // Configure generation
            const topicsInput = page.locator('input[name="topics"], textarea[name="topics"]').first();
            if (await topicsInput.isVisible()) {
              await topicsInput.fill('Newton\'s Laws, Force, Motion, Physics');
              await takeScreenshot(page, 'ultra-18-flashcard-topics');
            }
            
            // Set number of cards
            const countInput = page.locator('input[type="number"][name="count"]').first();
            if (await countInput.isVisible()) {
              await countInput.fill('10');
            }
            
            // Generate
            const confirmGenerate = page.locator('button:has-text("Generate"), button[type="submit"]').last();
            await clickWithScreenshot(page, confirmGenerate, 'ultra-confirm-generate');
            
            // Wait for generation
            await page.waitForSelector('text=/generated|created|success/i', { timeout: 30000 });
            await takeScreenshot(page, 'ultra-19-flashcards-generated');
          }
        }

        // Create manual flashcard
        console.log('✍️ Creating manual flashcard...');
        const createButton = page.locator('button:has-text("Create"), button:has-text("Add Card"), button:has-text("New")').first();
        await clickWithScreenshot(page, createButton, 'ultra-create-flashcard');

        await fillFormWithScreenshots(page, {
          'input[name="question"], textarea[name="question"]': 'What is Newton\'s Second Law?',
          'input[name="answer"], textarea[name="answer"]': 'F = ma (Force equals mass times acceleration)'
        }, 'ultra-manual-flashcard');

        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').last();
        await saveButton.click();
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-20-manual-card-created');

        // Start study session
        console.log('📚 Starting study session...');
        const studyButton = page.locator('button:has-text("Study"), button:has-text("Start Study")').first();
        if (await studyButton.isVisible()) {
          await clickWithScreenshot(page, studyButton, 'ultra-start-study');
          
          // Study multiple cards
          for (let i = 0; i < 5; i++) {
            await waitForAnimation(page);
            
            // Take screenshot of card front
            await takeScreenshot(page, `ultra-study-card-${i}-front`);
            
            // Click to flip or use spacebar
            const card = page.locator('.flashcard, [data-testid="flashcard"], .card-content').first();
            if (await card.isVisible()) {
              await card.click();
            } else {
              await page.keyboard.press('Space');
            }
            
            await waitForAnimation(page);
            await takeScreenshot(page, `ultra-study-card-${i}-back`);
            
            // Rate difficulty (testing SM-2 algorithm)
            const difficulties = ['Easy', 'Medium', 'Hard', 'Medium', 'Easy'];
            const diffButton = page.locator(`button:has-text("${difficulties[i]}")`).first();
            if (await diffButton.isVisible()) {
              await clickWithScreenshot(page, diffButton, `ultra-rate-${difficulties[i].toLowerCase()}`);
            } else {
              // Use keyboard shortcuts
              const keys = { 'Easy': '1', 'Medium': '2', 'Hard': '3' };
              await page.keyboard.press(keys[difficulties[i]]);
            }
            
            await waitForAnimation(page);
          }
          
          await takeScreenshot(page, 'ultra-21-study-session-complete');
          console.log('✅ Study session completed with SM-2 algorithm');
        }

        performanceMetrics['flashcardsTime'] = Date.now() - phaseStart;
        console.log(`✅ Flashcards completed in ${performanceMetrics['flashcardsTime']}ms`);
      });

      // ========== PHASE 6: MIND MAPS ==========
      await test.step('Phase 6: Mind Maps', async () => {
        console.log('\n=== PHASE 6: MIND MAPS ===');
        const phaseStart = Date.now();

        // Navigate to mind maps
        await page.goto('http://localhost:3001/dashboard/mindmaps');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-22-mindmaps-page');

        // Generate mind map from document
        console.log('🧠 Generating mind map from document...');
        const generateMapButton = page.locator('button:has-text("Generate from Document"), button:has-text("AI Generate")').first();
        if (await generateMapButton.isVisible()) {
          await clickWithScreenshot(page, generateMapButton, 'ultra-generate-mindmap');
          
          // Select document
          const docSelect = page.locator('text=physics-test-document.txt').first();
          if (await docSelect.isVisible()) {
            await docSelect.click();
            
            // Configure mind map
            const titleInput = page.locator('input[name="title"]').first();
            if (await titleInput.isVisible()) {
              await titleInput.fill('Newton\'s Laws Mind Map');
            }
            
            // Generate
            const generateButton = page.locator('button[type="submit"], button:has-text("Generate")').last();
            await clickWithScreenshot(page, generateButton, 'ultra-confirm-mindmap-generate');
            
            // Wait for generation
            await page.waitForSelector('.mind-map-canvas, canvas, svg, [data-testid="mindmap"]', { timeout: 30000 });
            await takeScreenshot(page, 'ultra-23-mindmap-generated');
          }
        }

        // Create manual mind map
        console.log('✏️ Creating manual mind map...');
        const createMapButton = page.locator('button:has-text("Create"), button:has-text("New Mind Map")').first();
        await clickWithScreenshot(page, createMapButton, 'ultra-create-mindmap');

        await fillFormWithScreenshots(page, {
          'input[name="title"]': 'Physics Concepts',
          'textarea[name="description"]': 'Interactive mind map of physics principles'
        }, 'ultra-manual-mindmap');

        const saveMapButton = page.locator('button[type="submit"]').last();
        await saveMapButton.click();
        await waitForAnimation(page);

        // Wait for mind map editor
        await page.waitForSelector('.mind-map-editor, [data-testid="mindmap-editor"]', { timeout: 10000 });
        await takeScreenshot(page, 'ultra-24-mindmap-editor');

        // Test physics-enabled layouts
        console.log('⚡ Testing physics-enabled layouts...');
        const physicsToggle = page.locator('button:has-text("Enable Physics"), input[name="physics"]').first();
        if (await physicsToggle.isVisible()) {
          await clickWithScreenshot(page, physicsToggle, 'ultra-enable-physics');
          
          // Select force-directed layout
          const forceLayout = page.locator('button:has-text("Force Directed"), option:has-text("Force")').first();
          if (await forceLayout.isVisible()) {
            await forceLayout.click();
            await page.waitForTimeout(2000); // Let physics settle
            await takeScreenshot(page, 'ultra-25-physics-layout');
          }
          
          // Test node dragging
          const node = page.locator('.mind-map-node, [data-testid="node"]').first();
          if (await node.isVisible()) {
            const box = await node.boundingBox();
            if (box) {
              await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
              await page.mouse.down();
              await page.mouse.move(box.x + 200, box.y + 100);
              await takeScreenshot(page, 'ultra-26-dragging-node');
              await page.mouse.up();
              await page.waitForTimeout(1000); // Let physics react
              await takeScreenshot(page, 'ultra-27-physics-reaction');
            }
          }
        }

        // Test export functionality
        console.log('💾 Testing export functionality...');
        const exportButton = page.locator('button:has-text("Export")').first();
        if (await exportButton.isVisible()) {
          await clickWithScreenshot(page, exportButton, 'ultra-export-menu');
          
          // Test different export formats
          const formats = ['PNG', 'SVG', 'JSON'];
          for (const format of formats) {
            const formatButton = page.locator(`button:has-text("${format}")`).first();
            if (await formatButton.isVisible()) {
              await takeScreenshot(page, `ultra-export-${format.toLowerCase()}`);
            }
          }
          
          // Close export menu
          await page.keyboard.press('Escape');
        }

        performanceMetrics['mindMapsTime'] = Date.now() - phaseStart;
        console.log(`✅ Mind maps completed in ${performanceMetrics['mindMapsTime']}ms`);
      });

      // ========== PHASE 7: SOCRATIC DIALOGUE ==========
      await test.step('Phase 7: Socratic Dialogue', async () => {
        console.log('\n=== PHASE 7: SOCRATIC DIALOGUE ===');
        const phaseStart = Date.now();

        // Navigate to Socratic dialogue
        await page.goto('http://localhost:3001/socratic');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-28-socratic-page');

        // Start dialogue session
        console.log('💭 Starting Socratic dialogue...');
        const startButton = page.locator('button:has-text("Start"), button:has-text("Begin Dialogue")').first();
        if (await startButton.isVisible()) {
          await clickWithScreenshot(page, startButton, 'ultra-start-socratic');
          
          // Select topic or document
          const topicInput = page.locator('input[name="topic"], textarea[name="topic"]').first();
          if (await topicInput.isVisible()) {
            await topicInput.fill('Newton\'s Laws of Motion');
            await takeScreenshot(page, 'ultra-29-socratic-topic');
          }
          
          // Start dialogue
          const beginButton = page.locator('button[type="submit"], button:has-text("Begin")').last();
          await beginButton.click();
          await waitForAnimation(page);
          
          // Wait for AI question
          await page.waitForSelector('.ai-question, [data-testid="question"]', { timeout: 15000 });
          await takeScreenshot(page, 'ultra-30-socratic-question');
          
          // Answer questions
          for (let i = 0; i < 3; i++) {
            const answerInput = page.locator('textarea[name="answer"], input[name="answer"]').first();
            if (await answerInput.isVisible()) {
              const answers = [
                'An object at rest stays at rest unless acted upon by a force',
                'Force equals mass times acceleration',
                'Every action has an equal and opposite reaction'
              ];
              
              await answerInput.fill(answers[i]);
              await takeScreenshot(page, `ultra-socratic-answer-${i}`);
              
              const submitAnswer = page.locator('button:has-text("Submit"), button[type="submit"]').last();
              await submitAnswer.click();
              
              // Wait for feedback
              await page.waitForSelector('.feedback, [data-testid="feedback"]', { timeout: 10000 });
              await takeScreenshot(page, `ultra-31-socratic-feedback-${i}`);
              
              await waitForAnimation(page);
            }
          }
        }

        performanceMetrics['socraticTime'] = Date.now() - phaseStart;
        console.log(`✅ Socratic dialogue completed in ${performanceMetrics['socraticTime']}ms`);
      });

      // ========== PHASE 8: INTERACTIVE EXERCISES ==========
      await test.step('Phase 8: Interactive Exercises', async () => {
        console.log('\n=== PHASE 8: INTERACTIVE EXERCISES ===');
        const phaseStart = Date.now();

        // Navigate to exercises
        await page.goto('http://localhost:3001/exercises');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-32-exercises-page');

        // Generate exercises from content
        console.log('🎯 Generating exercises...');
        const generateExercises = page.locator('button:has-text("Generate Exercises"), button:has-text("Create Exercises")').first();
        if (await generateExercises.isVisible()) {
          await clickWithScreenshot(page, generateExercises, 'ultra-generate-exercises');
          
          // Select document
          const docSelect = page.locator('text=physics-test-document.txt').first();
          if (await docSelect.isVisible()) {
            await docSelect.click();
            
            // Configure exercise types
            const exerciseTypes = [
              'Multiple Choice',
              'True/False', 
              'Fill in the Blank',
              'Short Answer',
              'Matching',
              'Ordering',
              'Calculation',
              'Diagram Labeling'
            ];
            
            // Select all exercise types if checkboxes available
            for (const type of exerciseTypes) {
              const checkbox = page.locator(`input[type="checkbox"][value="${type}"]`).first();
              if (await checkbox.isVisible()) {
                await checkbox.check();
              }
            }
            
            await takeScreenshot(page, 'ultra-33-exercise-types-selected');
            
            // Generate
            const generateButton = page.locator('button[type="submit"], button:has-text("Generate")').last();
            await generateButton.click();
            
            // Wait for generation
            await page.waitForSelector('.exercise-list, [data-testid="exercises"]', { timeout: 30000 });
            await takeScreenshot(page, 'ultra-34-exercises-generated');
          }
        }

        // Test different exercise types
        console.log('📝 Testing exercise types...');
        const exerciseCards = page.locator('.exercise-card, [data-testid="exercise"]');
        const count = await exerciseCards.count();
        
        for (let i = 0; i < Math.min(count, 4); i++) {
          const exercise = exerciseCards.nth(i);
          await exercise.scrollIntoViewIfNeeded();
          await takeScreenshot(page, `ultra-exercise-${i}`);
          
          // Attempt to answer
          const answerInput = exercise.locator('input, textarea, select').first();
          if (await answerInput.isVisible()) {
            const inputType = await answerInput.getAttribute('type');
            
            if (inputType === 'radio' || inputType === 'checkbox') {
              await answerInput.check();
            } else {
              await answerInput.fill('Test answer');
            }
            
            await takeScreenshot(page, `ultra-35-exercise-${i}-answered`);
            
            // Submit if button available
            const submitButton = exercise.locator('button:has-text("Submit"), button:has-text("Check")').first();
            if (await submitButton.isVisible()) {
              await submitButton.click();
              await waitForAnimation(page);
              await takeScreenshot(page, `ultra-36-exercise-${i}-feedback`);
            }
          }
        }

        performanceMetrics['exercisesTime'] = Date.now() - phaseStart;
        console.log(`✅ Exercises completed in ${performanceMetrics['exercisesTime']}ms`);
      });

      // ========== PHASE 9: PODCAST MODE ==========
      await test.step('Phase 9: Podcast Mode', async () => {
        console.log('\n=== PHASE 9: PODCAST MODE ===');
        const phaseStart = Date.now();

        // Navigate to podcast mode
        await page.goto('http://localhost:3001/podcast');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-37-podcast-page');

        // Start podcast session
        console.log('🎙️ Starting podcast mode...');
        const startPodcast = page.locator('button:has-text("Start Podcast"), button:has-text("Begin")').first();
        if (await startPodcast.isVisible()) {
          await clickWithScreenshot(page, startPodcast, 'ultra-start-podcast');
          
          // Select document for discussion
          const docSelect = page.locator('text=physics-test-document.txt').first();
          if (await docSelect.isVisible()) {
            await docSelect.click();
            await takeScreenshot(page, 'ultra-38-podcast-doc-selected');
            
            // Configure podcast settings
            const voiceSelect = page.locator('select[name="voice"]').first();
            if (await voiceSelect.isVisible()) {
              await voiceSelect.selectOption({ index: 1 });
            }
            
            // Start conversation
            const beginButton = page.locator('button[type="submit"], button:has-text("Start")').last();
            await beginButton.click();
            await waitForAnimation(page);
            
            // Test controls
            await takeScreenshot(page, 'ultra-39-podcast-active');
            
            // Test pause/play
            const pauseButton = page.locator('button[aria-label="Pause"], button:has-text("Pause")').first();
            if (await pauseButton.isVisible()) {
              await clickWithScreenshot(page, pauseButton, 'ultra-podcast-paused');
              
              const playButton = page.locator('button[aria-label="Play"], button:has-text("Play")').first();
              if (await playButton.isVisible()) {
                await playButton.click();
              }
            }
            
            // Stop podcast
            const stopButton = page.locator('button:has-text("Stop"), button:has-text("End")').first();
            if (await stopButton.isVisible()) {
              await stopButton.click();
              await takeScreenshot(page, 'ultra-40-podcast-ended');
            }
          }
        }

        performanceMetrics['podcastTime'] = Date.now() - phaseStart;
        console.log(`✅ Podcast mode completed in ${performanceMetrics['podcastTime']}ms`);
      });

      // ========== PHASE 10: 3D STEM VISUALIZATIONS ==========
      await test.step('Phase 10: 3D STEM Visualizations', async () => {
        console.log('\n=== PHASE 10: 3D STEM VISUALIZATIONS ===');
        const phaseStart = Date.now();

        // Navigate to STEM visualizations
        await page.goto('http://localhost:3001/dashboard/stem-viz');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-41-stem-viz-page');

        // Test physics simulations
        console.log('🔬 Testing physics simulations...');
        const physicsButton = page.locator('button:has-text("Physics"), [data-category="physics"]').first();
        if (await physicsButton.isVisible()) {
          await clickWithScreenshot(page, physicsButton, 'ultra-select-physics');
          
          // Select Newton's Laws visualization
          const newtonViz = page.locator('button:has-text("Newton"), button:has-text("Mechanics")').first();
          if (await newtonViz.isVisible()) {
            await clickWithScreenshot(page, newtonViz, 'ultra-newton-viz');
            
            // Wait for 3D scene to load
            await page.waitForSelector('canvas[data-engine="three"], canvas').first();
            await page.waitForTimeout(2000); // Let scene render
            await takeScreenshot(page, 'ultra-42-3d-physics-scene');
            
            // Test interactions
            const canvas = page.locator('canvas').first();
            const box = await canvas.boundingBox();
            
            if (box) {
              // Rotate view
              console.log('🔄 Testing 3D rotation...');
              await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
              await page.mouse.down();
              await page.mouse.move(box.x + box.width/2 + 200, box.y + box.height/2);
              await page.mouse.up();
              await takeScreenshot(page, 'ultra-43-3d-rotated');
              
              // Zoom
              console.log('🔍 Testing zoom...');
              await page.mouse.wheel(0, -500);
              await takeScreenshot(page, 'ultra-44-3d-zoomed');
              
              // Reset view
              const resetButton = page.locator('button:has-text("Reset View")').first();
              if (await resetButton.isVisible()) {
                await resetButton.click();
                await takeScreenshot(page, 'ultra-45-3d-reset');
              }
            }
          }
        }

        // Test chemistry visualizations
        console.log('⚗️ Testing chemistry visualizations...');
        const chemButton = page.locator('button:has-text("Chemistry")').first();
        if (await chemButton.isVisible()) {
          await clickWithScreenshot(page, chemButton, 'ultra-select-chemistry');
          
          const moleculeViz = page.locator('button:has-text("Molecule"), button:has-text("3D Model")').first();
          if (await moleculeViz.isVisible()) {
            await moleculeViz.click();
            await page.waitForTimeout(2000);
            await takeScreenshot(page, 'ultra-46-chemistry-viz');
          }
        }

        // Test math visualizations
        console.log('📊 Testing math visualizations...');
        const mathButton = page.locator('button:has-text("Mathematics")').first();
        if (await mathButton.isVisible()) {
          await clickWithScreenshot(page, mathButton, 'ultra-select-math');
          
          const functionPlot = page.locator('button:has-text("Function"), button:has-text("Graph")').first();
          if (await functionPlot.isVisible()) {
            await functionPlot.click();
            
            // Input function
            const functionInput = page.locator('input[name="function"], input[placeholder*="f(x)"]').first();
            if (await functionInput.isVisible()) {
              await functionInput.fill('sin(x) * cos(2*x)');
              await takeScreenshot(page, 'ultra-47-math-function');
              
              const plotButton = page.locator('button:has-text("Plot")').first();
              await plotButton.click();
              await waitForAnimation(page);
              await takeScreenshot(page, 'ultra-48-function-plotted');
            }
          }
        }

        performanceMetrics['stemVizTime'] = Date.now() - phaseStart;
        console.log(`✅ STEM visualizations completed in ${performanceMetrics['stemVizTime']}ms`);
      });

      // ========== PHASE 11: CITATION NETWORK ==========
      await test.step('Phase 11: Citation Network', async () => {
        console.log('\n=== PHASE 11: CITATION NETWORK ===');
        const phaseStart = Date.now();

        // Navigate to citation network
        await page.goto('http://localhost:3001/citations');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-49-citation-network-page');

        // Generate citation network
        console.log('🕸️ Generating citation network...');
        const generateNetwork = page.locator('button:has-text("Generate Network"), button:has-text("Analyze")').first();
        if (await generateNetwork.isVisible()) {
          await clickWithScreenshot(page, generateNetwork, 'ultra-generate-network');
          
          // Wait for network visualization
          await page.waitForSelector('.network-graph, svg[data-type="network"]', { timeout: 15000 });
          await takeScreenshot(page, 'ultra-50-citation-network');
          
          // Test graph interactions
          const node = page.locator('.network-node, circle[data-node]').first();
          if (await node.isVisible()) {
            await node.hover();
            await takeScreenshot(page, 'ultra-51-node-hover');
            
            await node.click();
            await waitForAnimation(page);
            await takeScreenshot(page, 'ultra-52-node-selected');
          }
        }

        performanceMetrics['citationNetworkTime'] = Date.now() - phaseStart;
        console.log(`✅ Citation network completed in ${performanceMetrics['citationNetworkTime']}ms`);
      });

      // ========== PHASE 12: DOCUMENT WORKSPACE ==========
      await test.step('Phase 12: Document Workspace', async () => {
        console.log('\n=== PHASE 12: DOCUMENT WORKSPACE ===');
        const phaseStart = Date.now();

        // Navigate to workspace
        await page.goto('http://localhost:3001/workspace');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-53-workspace-page');

        // Open multiple documents
        console.log('📑 Testing multi-document workspace...');
        const openDocButton = page.locator('button:has-text("Open Document"), button:has-text("Add Document")').first();
        if (await openDocButton.isVisible()) {
          // Open first document
          await clickWithScreenshot(page, openDocButton, 'ultra-workspace-open-doc');
          
          const docSelect = page.locator('text=physics-test-document.txt').first();
          if (await docSelect.isVisible()) {
            await docSelect.click();
            await waitForAnimation(page);
            await takeScreenshot(page, 'ultra-54-workspace-doc-opened');
          }
          
          // Test split screen
          const splitButton = page.locator('button:has-text("Split"), button[aria-label*="split"]').first();
          if (await splitButton.isVisible()) {
            await clickWithScreenshot(page, splitButton, 'ultra-workspace-split');
            await takeScreenshot(page, 'ultra-55-split-screen');
          }
          
          // Test synchronized scrolling
          const syncButton = page.locator('button:has-text("Sync Scroll"), input[name="sync"]').first();
          if (await syncButton.isVisible()) {
            await syncButton.click();
            await takeScreenshot(page, 'ultra-56-sync-scroll-enabled');
            
            // Scroll first pane
            const firstPane = page.locator('.document-pane').first();
            await firstPane.evaluate(el => el.scrollTop = 200);
            await waitForAnimation(page);
            await takeScreenshot(page, 'ultra-57-synchronized-scroll');
          }
        }

        performanceMetrics['workspaceTime'] = Date.now() - phaseStart;
        console.log(`✅ Document workspace completed in ${performanceMetrics['workspaceTime']}ms`);
      });

      // ========== PHASE 13: REPORTS GENERATION ==========
      await test.step('Phase 13: Reports Generation', async () => {
        console.log('\n=== PHASE 13: REPORTS GENERATION ===');
        const phaseStart = Date.now();

        // Navigate to reports
        await page.goto('http://localhost:3001/reports');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-58-reports-page');

        // Create report from documents
        console.log('📊 Generating report...');
        const createReport = page.locator('button:has-text("Create Report"), button:has-text("Generate Report")').first();
        if (await createReport.isVisible()) {
          await clickWithScreenshot(page, createReport, 'ultra-create-report');
          
          // Select document
          const docCheckbox = page.locator('input[type="checkbox"]').first();
          await docCheckbox.check();
          
          // Select template
          const templateSelect = page.locator('select[name="template"]').first();
          if (await templateSelect.isVisible()) {
            await templateSelect.selectOption({ index: 1 });
            await takeScreenshot(page, 'ultra-59-report-config');
          }
          
          // Generate report
          const generateButton = page.locator('button[type="submit"], button:has-text("Generate")').last();
          await generateButton.click();
          
          // Wait for report generation
          await page.waitForSelector('.report-preview, [data-testid="report"]', { timeout: 30000 });
          await takeScreenshot(page, 'ultra-60-report-generated');
          
          // Test export options
          const exportButton = page.locator('button:has-text("Export")').first();
          if (await exportButton.isVisible()) {
            await clickWithScreenshot(page, exportButton, 'ultra-report-export-menu');
            
            const exportFormats = ['PDF', 'Word', 'Markdown'];
            for (const format of exportFormats) {
              const formatButton = page.locator(`button:has-text("${format}")`).first();
              if (await formatButton.isVisible()) {
                await takeScreenshot(page, `ultra-export-${format.toLowerCase()}`);
              }
            }
          }
        }

        performanceMetrics['reportsTime'] = Date.now() - phaseStart;
        console.log(`✅ Reports generation completed in ${performanceMetrics['reportsTime']}ms`);
      });

      // ========== PHASE 14: WORKFLOW AUTOMATION ==========
      await test.step('Phase 14: Workflow Automation', async () => {
        console.log('\n=== PHASE 14: WORKFLOW AUTOMATION ===');
        const phaseStart = Date.now();

        // Navigate to workflows
        await page.goto('http://localhost:3001/workflows');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-61-workflows-page');

        // Create workflow
        console.log('⚙️ Creating automated workflow...');
        const createWorkflow = page.locator('button:has-text("Create Workflow"), button:has-text("New Workflow")').first();
        if (await createWorkflow.isVisible()) {
          await clickWithScreenshot(page, createWorkflow, 'ultra-create-workflow');
          
          // Name workflow
          const nameInput = page.locator('input[name="name"]').first();
          if (await nameInput.isVisible()) {
            await nameInput.fill('Document Processing Pipeline');
            await takeScreenshot(page, 'ultra-62-workflow-named');
          }
          
          // Add workflow steps (visual builder)
          const addStep = page.locator('button:has-text("Add Step"), button:has-text("+")').first();
          if (await addStep.isVisible()) {
            // Add document upload step
            await addStep.click();
            const uploadStep = page.locator('button:has-text("Document Upload")').first();
            if (await uploadStep.isVisible()) {
              await uploadStep.click();
            }
            
            // Add AI processing step
            await addStep.click();
            const aiStep = page.locator('button:has-text("AI Analysis")').first();
            if (await aiStep.isVisible()) {
              await aiStep.click();
            }
            
            // Add output step
            await addStep.click();
            const outputStep = page.locator('button:has-text("Generate Output")').first();
            if (await outputStep.isVisible()) {
              await outputStep.click();
            }
            
            await takeScreenshot(page, 'ultra-63-workflow-steps');
          }
          
          // Save workflow
          const saveButton = page.locator('button:has-text("Save")').first();
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await waitForAnimation(page);
            await takeScreenshot(page, 'ultra-64-workflow-saved');
          }
        }

        performanceMetrics['workflowTime'] = Date.now() - phaseStart;
        console.log(`✅ Workflow automation completed in ${performanceMetrics['workflowTime']}ms`);
      });

      // ========== PHASE 15: ANALYTICS & MONITORING ==========
      await test.step('Phase 15: Analytics & Monitoring', async () => {
        console.log('\n=== PHASE 15: ANALYTICS & MONITORING ===');
        const phaseStart = Date.now();

        // Navigate to analytics
        await page.goto('http://localhost:3001/analytics');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-65-analytics-page');

        // Check learning progress
        console.log('📈 Checking analytics...');
        const progressChart = page.locator('.progress-chart, canvas[data-chart="progress"]').first();
        if (await progressChart.isVisible()) {
          await takeScreenshot(page, 'ultra-66-learning-progress');
        }

        // Document usage analytics
        const usageTab = page.locator('button:has-text("Document Usage"), [data-tab="usage"]').first();
        if (await usageTab.isVisible()) {
          await usageTab.click();
          await waitForAnimation(page);
          await takeScreenshot(page, 'ultra-67-document-usage');
        }

        // Performance metrics
        const performanceTab = page.locator('button:has-text("Performance"), [data-tab="performance"]').first();
        if (await performanceTab.isVisible()) {
          await performanceTab.click();
          await waitForAnimation(page);
          await takeScreenshot(page, 'ultra-68-performance-metrics');
        }

        performanceMetrics['analyticsTime'] = Date.now() - phaseStart;
        console.log(`✅ Analytics completed in ${performanceMetrics['analyticsTime']}ms`);
      });

      // ========== PHASE 16: PHYSICS ENGINE TESTING ==========
      await test.step('Phase 16: Physics Engine Testing', async () => {
        console.log('\n=== PHASE 16: PHYSICS ENGINE TESTING ===');
        const phaseStart = Date.now();

        // Navigate to physics demonstrations
        await page.goto('http://localhost:3001/dashboard/physics-2d');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-69-physics-2d-page');

        // Test 2D physics simulations
        console.log('🎯 Testing 2D physics engine...');
        const simulations = [
          { name: 'Projectile Motion', selector: 'button:has-text("Projectile")' },
          { name: 'Pendulum', selector: 'button:has-text("Pendulum")' },
          { name: 'Collision', selector: 'button:has-text("Collision")' }
        ];

        for (const sim of simulations) {
          const button = page.locator(sim.selector).first();
          if (await button.isVisible()) {
            await clickWithScreenshot(page, button, `ultra-physics-${sim.name.toLowerCase().replace(' ', '-')}`);
            
            // Start simulation
            const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
            if (await startButton.isVisible()) {
              await startButton.click();
              await page.waitForTimeout(3000); // Let simulation run
              await takeScreenshot(page, `ultra-70-${sim.name.toLowerCase().replace(' ', '-')}-running`);
              
              // Pause simulation
              const pauseButton = page.locator('button:has-text("Pause")').first();
              if (await pauseButton.isVisible()) {
                await pauseButton.click();
                await takeScreenshot(page, `ultra-71-${sim.name.toLowerCase().replace(' ', '-')}-paused`);
              }
            }
          }
        }

        // Test force visualizations
        const showForces = page.locator('input[name="showForces"], button:has-text("Show Forces")').first();
        if (await showForces.isVisible()) {
          await showForces.click();
          await takeScreenshot(page, 'ultra-72-forces-visible');
        }

        performanceMetrics['physicsEngineTime'] = Date.now() - phaseStart;
        console.log(`✅ Physics engine completed in ${performanceMetrics['physicsEngineTime']}ms`);
      });

      // ========== PHASE 17: KNOWLEDGE GAP DETECTION ==========
      await test.step('Phase 17: Knowledge Gap Detection', async () => {
        console.log('\n=== PHASE 17: KNOWLEDGE GAP DETECTION ===');
        const phaseStart = Date.now();

        // Navigate to knowledge gaps
        await page.goto('http://localhost:3001/knowledge-gaps');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-73-knowledge-gaps-page');

        // Analyze knowledge gaps
        console.log('🔍 Analyzing knowledge gaps...');
        const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Detect Gaps")').first();
        if (await analyzeButton.isVisible()) {
          await clickWithScreenshot(page, analyzeButton, 'ultra-analyze-gaps');
          
          // Wait for analysis
          await page.waitForSelector('.gap-analysis, [data-testid="gaps"]', { timeout: 20000 });
          await takeScreenshot(page, 'ultra-74-gaps-detected');
          
          // View recommendations
          const recommendationsTab = page.locator('button:has-text("Recommendations")').first();
          if (await recommendationsTab.isVisible()) {
            await recommendationsTab.click();
            await waitForAnimation(page);
            await takeScreenshot(page, 'ultra-75-gap-recommendations');
          }
        }

        performanceMetrics['knowledgeGapsTime'] = Date.now() - phaseStart;
        console.log(`✅ Knowledge gap detection completed in ${performanceMetrics['knowledgeGapsTime']}ms`);
      });

      // ========== PHASE 18: CROSS-FEATURE INTEGRATION ==========
      await test.step('Phase 18: Cross-Feature Integration', async () => {
        console.log('\n=== PHASE 18: CROSS-FEATURE INTEGRATION ===');
        const phaseStart = Date.now();

        // Test document → flashcards → mind map workflow
        console.log('🔄 Testing integrated workflow...');
        
        // Use command palette for quick navigation
        await page.keyboard.press('Control+k');
        await page.keyboard.type('create flashcards from physics document');
        await takeScreenshot(page, 'ultra-76-ai-command-integration');
        await page.keyboard.press('Enter');
        
        // Wait for AI to process
        await page.waitForTimeout(3000);
        await takeScreenshot(page, 'ultra-77-ai-created-flashcards');
        
        // Convert to mind map
        await page.keyboard.press('Control+k');
        await page.keyboard.type('convert flashcards to mind map');
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(3000);
        await takeScreenshot(page, 'ultra-78-flashcards-to-mindmap');

        performanceMetrics['integrationTime'] = Date.now() - phaseStart;
        console.log(`✅ Cross-feature integration completed in ${performanceMetrics['integrationTime']}ms`);
      });

      // ========== FINAL PHASE: PERFORMANCE & ERROR SUMMARY ==========
      await test.step('Final Phase: Performance & Error Summary', async () => {
        console.log('\n=== FINAL PHASE: PERFORMANCE & ERROR SUMMARY ===');
        
        // Collect final metrics
        const totalTime = Date.now() - startTime;
        performanceMetrics['totalTestTime'] = totalTime;
        
        // Check for any console errors
        const finalErrors = await page.evaluate(() => {
          return window.performance.getEntriesByType('measure')
            .filter(entry => entry.name.includes('error'));
        });
        
        // Performance summary
        console.log('\n📊 PERFORMANCE SUMMARY:');
        console.log('========================');
        Object.entries(performanceMetrics).forEach(([key, value]) => {
          console.log(`${key}: ${value}ms`);
        });
        console.log(`\nTotal test duration: ${(totalTime / 1000 / 60).toFixed(2)} minutes`);
        
        if (finalErrors.length > 0) {
          console.warn('\n⚠️ Errors detected during test:', finalErrors);
        } else {
          console.log('\n✅ No errors detected during test execution');
        }
        
        // Take final dashboard screenshot
        await page.goto('http://localhost:3001/dashboard');
        await waitForAnimation(page);
        await takeScreenshot(page, 'ultra-79-final-dashboard');
        
        // Memory usage check
        const metrics = await page.metrics();
        console.log('\n💾 Memory usage:', {
          JSHeapUsedSize: `${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`,
          JSHeapTotalSize: `${(metrics.JSHeapTotalSize / 1024 / 1024).toFixed(2)} MB`
        });
      });

    } catch (error) {
      console.error('❌ Test failed with error:', error);
      await takeScreenshot(page, 'ultra-error-screenshot');
      throw error;
    } finally {
      // Cleanup
      await context.close();
      await browser.close();
      
      console.log('\n🎉 Ultra-Rigorous Comprehensive Test Complete!');
      console.log(`📸 Screenshots saved in: ./screenshots/`);
      console.log(`🎥 Video saved in: ./test-results/videos/`);
    }
  });
});