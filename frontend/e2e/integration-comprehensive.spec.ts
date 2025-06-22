import { test, expect } from '@playwright/test';
import { 
  TEST_USERS,
  loginUser,
  takeScreenshot,
  clickWithScreenshot,
  fillFormWithScreenshots,
  waitForAnimation,
  uploadFile,
  verifyVisible,
  setupConsoleLogging
} from './helpers/test-helpers';

test.describe('Integration Tests - Cross-Feature Workflows', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await waitForAnimation(page);
  });

  test('Document upload → Flashcard generation → Study workflow', async ({ page }) => {
    console.log('📄➡️🎴 Testing document to flashcard workflow');
    
    // Test 1: Upload document
    await test.step('Upload document', async () => {
      await page.goto('/dashboard');
      await takeScreenshot(page, 'integration-01-dashboard');
      
      // Navigate to documents
      const documentsButton = page.locator('a[href*="documents"], button:has-text("Documents")').first();
      await clickWithScreenshot(page, documentsButton, 'integration-go-to-documents');
      
      // Upload test document
      const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add Document")').first();
      await clickWithScreenshot(page, uploadButton, 'integration-upload-button');
      
      // Select file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./e2e/fixtures/test-document.txt');
      await waitForAnimation(page);
      
      await takeScreenshot(page, 'integration-02-document-uploaded');
      
      // Wait for processing
      await page.waitForSelector('text=/processed|complete|ready/i', { timeout: 30000 });
      await takeScreenshot(page, 'integration-document-processed');
    });

    // Test 2: Generate flashcards from document
    await test.step('Generate flashcards from document', async () => {
      // Find the uploaded document
      const documentCard = page.locator('text=test-document.txt').first();
      if (await documentCard.isVisible()) {
        await clickWithScreenshot(page, documentCard, 'integration-select-document');
        
        // Look for generate flashcards option
        const generateButton = page.locator('button:has-text("Generate Flashcards"), button:has-text("Create Flashcards")').first();
        if (await generateButton.isVisible()) {
          await clickWithScreenshot(page, generateButton, 'integration-generate-flashcards');
          
          // Configure generation
          const topicsInput = page.locator('textarea[placeholder*="topics"], input[name="topics"]').first();
          if (await topicsInput.isVisible()) {
            await topicsInput.fill('Newton\'s Laws, Force, Motion');
            await takeScreenshot(page, 'integration-flashcard-topics');
          }
          
          const countInput = page.locator('input[type="number"][name="count"]').first();
          if (await countInput.isVisible()) {
            await countInput.fill('10');
          }
          
          // Generate
          const confirmButton = page.locator('button:has-text("Generate"), button[type="submit"]').first();
          await clickWithScreenshot(page, confirmButton, 'integration-generate-confirm');
          
          // Wait for generation
          await page.waitForSelector('text=/generated|created|success/i', { timeout: 30000 });
          await takeScreenshot(page, 'integration-03-flashcards-generated');
        }
      }
    });

    // Test 3: Navigate to flashcards and study
    await test.step('Study generated flashcards', async () => {
      // Go to flashcards
      await page.goto('/dashboard/flashcards');
      await waitForAnimation(page);
      await takeScreenshot(page, 'integration-flashcards-page');
      
      // Find the generated deck
      const physicsCards = page.locator('text=/Newton|Physics/i').first();
      if (await physicsCards.isVisible()) {
        await clickWithScreenshot(page, physicsCards, 'integration-physics-deck');
        
        // Start study session
        const studyButton = page.locator('button:has-text("Study")').first();
        await clickWithScreenshot(page, studyButton, 'integration-start-study');
        
        // Study first few cards
        for (let i = 0; i < 3; i++) {
          await waitForAnimation(page);
          await takeScreenshot(page, `integration-study-card-${i}-front`);
          
          // Flip card
          const card = page.locator('.flashcard, [data-testid="flashcard"]').first();
          await card.click();
          await waitForAnimation(page);
          await takeScreenshot(page, `integration-study-card-${i}-back`);
          
          // Mark difficulty
          const mediumButton = page.locator('button:has-text("Medium")').first();
          if (await mediumButton.isVisible()) {
            await mediumButton.click();
          } else {
            // Use arrow key to go to next card
            await page.keyboard.press('ArrowRight');
          }
        }
        
        await takeScreenshot(page, 'integration-04-study-complete');
      }
    });
  });

  test('Document → Mind Map generation → Physics visualization workflow', async ({ page }) => {
    console.log('📄➡️🧠 Testing document to mind map workflow');
    
    // Test 1: Upload and process document
    await test.step('Upload document for mind map', async () => {
      await page.goto('/dashboard/documents');
      await waitForAnimation(page);
      
      // Check if document already exists
      const existingDoc = page.locator('text=test-document.txt').first();
      if (!(await existingDoc.isVisible())) {
        // Upload document
        const uploadButton = page.locator('button:has-text("Upload")').first();
        await uploadButton.click();
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('./e2e/fixtures/test-document.txt');
        await page.waitForSelector('text=/processed|complete/i', { timeout: 30000 });
      }
      
      await takeScreenshot(page, 'integration-mindmap-01-document');
    });

    // Test 2: Generate mind map from document
    await test.step('Generate mind map', async () => {
      const documentCard = page.locator('text=test-document.txt').first();
      await clickWithScreenshot(page, documentCard, 'integration-mindmap-select-doc');
      
      // Generate mind map
      const mindMapButton = page.locator('button:has-text("Generate Mind Map"), button:has-text("Create Mind Map")').first();
      if (await mindMapButton.isVisible()) {
        await clickWithScreenshot(page, mindMapButton, 'integration-mindmap-generate');
        
        // Configure if needed
        const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first();
        if (await titleInput.isVisible()) {
          await titleInput.fill('Physics Concepts Mind Map');
          await takeScreenshot(page, 'integration-mindmap-config');
        }
        
        // Generate
        const generateButton = page.locator('button[type="submit"], button:has-text("Generate")').first();
        await clickWithScreenshot(page, generateButton, 'integration-mindmap-confirm');
        
        // Wait for generation
        await page.waitForSelector('.mind-map-canvas, canvas, svg', { timeout: 30000 });
        await takeScreenshot(page, 'integration-mindmap-02-generated');
      }
    });

    // Test 3: Enable physics on mind map
    await test.step('Enable physics visualization', async () => {
      // Look for physics controls
      const physicsPanel = page.locator('.physics-control-panel, [data-testid="physics-controls"]').first();
      if (await physicsPanel.isVisible()) {
        // Enable physics
        const enableButton = page.locator('button:has-text("Enable Physics"), input[name="physics-enabled"]').first();
        if (await enableButton.isVisible()) {
          await clickWithScreenshot(page, enableButton, 'integration-mindmap-enable-physics');
        }
        
        // Select force-directed layout
        const forceButton = page.locator('button:has-text("Force Directed")').first();
        if (await forceButton.isVisible()) {
          await clickWithScreenshot(page, forceButton, 'integration-mindmap-force-directed');
          await page.waitForTimeout(2000); // Let physics settle
          await takeScreenshot(page, 'integration-mindmap-03-physics-active');
        }
        
        // Show forces
        const showForcesButton = page.locator('button:has-text("Show Forces"), input[name="show-forces"]').first();
        if (await showForcesButton.isVisible()) {
          await clickWithScreenshot(page, showForcesButton, 'integration-mindmap-show-forces');
          await takeScreenshot(page, 'integration-mindmap-forces-visible');
        }
      }
      
      // Test node interaction with physics
      const node = page.locator('.mind-map-node').first();
      if (await node.isVisible()) {
        // Drag node
        const box = await node.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + 200, box.y);
          await page.mouse.up();
          await page.waitForTimeout(1000); // Let physics react
          await takeScreenshot(page, 'integration-mindmap-04-physics-drag');
        }
      }
    });
  });

  test('Mind Map → STEM Visualization → Export workflow', async ({ page }) => {
    console.log('🧠➡️🔬 Testing mind map to STEM visualization workflow');
    
    // Test 1: Create or load mind map
    await test.step('Create mind map', async () => {
      await page.goto('/dashboard/mindmaps');
      await waitForAnimation(page);
      
      // Create new mind map
      const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
      await clickWithScreenshot(page, createButton, 'integration-stem-create-mindmap');
      
      await fillFormWithScreenshots(page, {
        'input[name="title"]': 'Quantum Physics Concepts',
        'textarea[name="description"]': 'Exploring quantum mechanics fundamentals'
      }, 'integration-stem-mindmap-form');
      
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      await waitForAnimation(page);
      await takeScreenshot(page, 'integration-stem-01-mindmap-created');
    });

    // Test 2: Convert to 3D STEM visualization
    await test.step('Convert to 3D visualization', async () => {
      // Look for visualization option
      const visualizeButton = page.locator('button:has-text("3D Visualization"), button:has-text("Convert to 3D")').first();
      if (await visualizeButton.isVisible()) {
        await clickWithScreenshot(page, visualizeButton, 'integration-stem-visualize-button');
        
        // Select physics domain
        const physicsOption = page.locator('button:has-text("Physics"), input[value="physics"]').first();
        await clickWithScreenshot(page, physicsOption, 'integration-stem-select-physics');
        
        // Choose quantum visualization
        const quantumButton = page.locator('button:has-text("Quantum"), button:has-text("Wave Function")').first();
        if (await quantumButton.isVisible()) {
          await clickWithScreenshot(page, quantumButton, 'integration-stem-quantum-viz');
          
          // Wait for 3D scene to load
          await page.waitForSelector('canvas[data-engine="three"]', { timeout: 10000 });
          await page.waitForTimeout(2000);
          await takeScreenshot(page, 'integration-stem-02-3d-loaded');
        }
      }
    });

    // Test 3: Interact with 3D visualization
    await test.step('Interact with 3D scene', async () => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();
      
      if (box) {
        // Rotate view
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2);
        await page.mouse.up();
        await takeScreenshot(page, 'integration-stem-3d-rotated');
        
        // Zoom in
        await page.mouse.wheel(0, -300);
        await takeScreenshot(page, 'integration-stem-3d-zoomed');
      }
      
      // Enable annotations
      const annotationsToggle = page.locator('button:has-text("Annotations"), input[name="annotations"]').first();
      if (await annotationsToggle.isVisible()) {
        await clickWithScreenshot(page, annotationsToggle, 'integration-stem-annotations');
        await takeScreenshot(page, 'integration-stem-03-annotated');
      }
    });

    // Test 4: Export visualization
    await test.step('Export 3D visualization', async () => {
      const exportButton = page.locator('button:has-text("Export")').first();
      await clickWithScreenshot(page, exportButton, 'integration-stem-export-menu');
      
      // Test different export options
      const exportOptions = [
        { format: 'Screenshot', extension: 'png' },
        { format: 'GLTF Model', extension: 'gltf' },
        { format: 'Interactive HTML', extension: 'html' }
      ];
      
      for (const option of exportOptions) {
        const optionButton = page.locator(`button:has-text("${option.format}")`).first();
        if (await optionButton.isVisible()) {
          await takeScreenshot(page, `integration-stem-export-${option.extension}`);
        }
      }
      
      // Actually export as screenshot
      const screenshotButton = page.locator('button:has-text("Screenshot")').first();
      if (await screenshotButton.isVisible()) {
        await screenshotButton.click();
        await waitForAnimation(page);
        await takeScreenshot(page, 'integration-stem-04-exported');
      }
    });
  });

  test('AI-powered cross-feature workflow', async ({ page }) => {
    console.log('🤖 Testing AI-powered integration workflow');
    
    // Test 1: AI command palette
    await test.step('Use AI command palette', async () => {
      await page.goto('/dashboard');
      await waitForAnimation(page);
      
      // Open command palette (usually Cmd+K or Ctrl+K)
      await page.keyboard.press('Control+k');
      await waitForAnimation(page);
      
      const commandPalette = page.locator('.command-palette, [data-testid="command-palette"]').first();
      if (await commandPalette.isVisible()) {
        await takeScreenshot(page, 'integration-ai-01-command-palette');
        
        // Type AI command
        await page.keyboard.type('Create flashcards about thermodynamics');
        await takeScreenshot(page, 'integration-ai-command-typed');
        
        await page.keyboard.press('Enter');
        await waitForAnimation(page);
        
        // Wait for AI to process
        await page.waitForSelector('text=/generated|created|complete/i', { timeout: 30000 });
        await takeScreenshot(page, 'integration-ai-02-flashcards-created');
      }
    });

    // Test 2: AI-generated mind map from flashcards
    await test.step('Generate mind map from flashcards', async () => {
      // Navigate to flashcards
      await page.goto('/dashboard/flashcards');
      await waitForAnimation(page);
      
      // Select thermodynamics deck
      const thermoDeck = page.locator('text=/thermodynamics/i').first();
      if (await thermoDeck.isVisible()) {
        await clickWithScreenshot(page, thermoDeck, 'integration-ai-thermo-deck');
        
        // Generate mind map from deck
        const mindMapButton = page.locator('button:has-text("Create Mind Map"), button:has-text("Visualize as Mind Map")').first();
        if (await mindMapButton.isVisible()) {
          await clickWithScreenshot(page, mindMapButton, 'integration-ai-deck-to-mindmap');
          
          await page.waitForSelector('.mind-map-canvas, svg', { timeout: 30000 });
          await takeScreenshot(page, 'integration-ai-03-mindmap-from-cards');
        }
      }
    });

    // Test 3: AI suggestions in STEM visualization
    await test.step('AI suggestions in STEM viz', async () => {
      await page.goto('/dashboard/stem-viz');
      await waitForAnimation(page);
      
      // Ask AI for visualization
      const aiInput = page.locator('input[placeholder*="Ask AI"], textarea[placeholder*="Describe"]').first();
      if (await aiInput.isVisible()) {
        await aiInput.fill('Show me how heat transfer works in a metal rod');
        await takeScreenshot(page, 'integration-ai-stem-query');
        
        const generateButton = page.locator('button:has-text("Generate"), button:has-text("Visualize")').first();
        await clickWithScreenshot(page, generateButton, 'integration-ai-stem-generate');
        
        // Wait for visualization
        await page.waitForSelector('canvas, svg', { timeout: 30000 });
        await takeScreenshot(page, 'integration-ai-04-heat-transfer-viz');
      }
    });
  });

  test('Full learning workflow: Upload → Learn → Test', async ({ page }) => {
    console.log('🎓 Testing complete learning workflow');
    
    // Test 1: Upload learning material
    await test.step('Upload course material', async () => {
      await page.goto('/dashboard/documents');
      const uploadButton = page.locator('button:has-text("Upload")').first();
      await uploadButton.click();
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./e2e/fixtures/test-document.txt');
      
      await page.waitForSelector('text=/processed|ready/i', { timeout: 30000 });
      await takeScreenshot(page, 'integration-learn-01-uploaded');
    });

    // Test 2: Generate study materials
    await test.step('Generate comprehensive study materials', async () => {
      const document = page.locator('text=test-document.txt').first();
      await document.click();
      
      // Generate all study materials
      const generateAllButton = page.locator('button:has-text("Generate All"), button:has-text("Create Study Materials")').first();
      if (await generateAllButton.isVisible()) {
        await clickWithScreenshot(page, generateAllButton, 'integration-learn-generate-all');
        
        // Wait for generation
        await page.waitForSelector('text=/complete|generated/i', { timeout: 60000 });
        await takeScreenshot(page, 'integration-learn-02-materials-ready');
      }
    });

    // Test 3: Study with flashcards
    await test.step('Study with flashcards', async () => {
      await page.goto('/dashboard/flashcards');
      const studyButton = page.locator('button:has-text("Study")').first();
      await studyButton.click();
      
      // Study 5 cards
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(500);
        await takeScreenshot(page, `integration-learn-study-${i}`);
        await page.keyboard.press('Space'); // Flip
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowRight'); // Next
      }
      
      await takeScreenshot(page, 'integration-learn-03-studied');
    });

    // Test 4: Review with mind map
    await test.step('Review with mind map', async () => {
      await page.goto('/dashboard/mindmaps');
      const mindMap = page.locator('text=/Newton|Physics/i').first();
      if (await mindMap.isVisible()) {
        await mindMap.click();
        await waitForAnimation(page);
        
        // Expand all nodes
        const expandAllButton = page.locator('button:has-text("Expand All")').first();
        if (await expandAllButton.isVisible()) {
          await expandAllButton.click();
          await waitForAnimation(page);
        }
        
        await takeScreenshot(page, 'integration-learn-04-mindmap-review');
      }
    });

    // Test 5: Visualize in 3D
    await test.step('3D visualization for deeper understanding', async () => {
      await page.goto('/dashboard/stem-viz');
      
      // Select physics visualization
      const physicsButton = page.locator('button:has-text("Physics")').first();
      await physicsButton.click();
      
      const newtonButton = page.locator('button:has-text("Newton"), button:has-text("Mechanics")').first();
      if (await newtonButton.isVisible()) {
        await newtonButton.click();
        await page.waitForSelector('canvas', { timeout: 10000 });
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'integration-learn-05-3d-understanding');
      }
    });

    // Test 6: Test knowledge
    await test.step('Test knowledge with quiz mode', async () => {
      await page.goto('/dashboard/flashcards');
      
      const testButton = page.locator('button:has-text("Test Mode"), button:has-text("Quiz")').first();
      if (await testButton.isVisible()) {
        await clickWithScreenshot(page, testButton, 'integration-learn-test-mode');
        
        // Take a quiz
        for (let i = 0; i < 3; i++) {
          const answerInput = page.locator('input[name="answer"], textarea[name="answer"]').first();
          if (await answerInput.isVisible()) {
            await answerInput.fill('Test answer ' + i);
            await takeScreenshot(page, `integration-learn-quiz-${i}`);
            
            const submitButton = page.locator('button:has-text("Submit"), button:has-text("Check")').first();
            await submitButton.click();
            await waitForAnimation(page);
          }
        }
        
        // View results
        await takeScreenshot(page, 'integration-learn-06-test-results');
      }
    });

    console.log('✅ Complete learning workflow tested');
  });

  test('Performance monitoring across features', async ({ page }) => {
    console.log('📊 Testing performance across all features');
    
    await test.step('Monitor dashboard performance', async () => {
      // Start performance measurement
      await page.goto('/dashboard');
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`Dashboard load time: ${loadTime}ms`);
      await takeScreenshot(page, 'integration-perf-01-dashboard');
    });

    await test.step('Test heavy operations', async () => {
      // Create many flashcards
      await page.goto('/dashboard/flashcards');
      const createButton = page.locator('button:has-text("Bulk Create"), button:has-text("Import")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await takeScreenshot(page, 'integration-perf-bulk-create');
      }
      
      // Large mind map
      await page.goto('/dashboard/mindmaps');
      const largeMapButton = page.locator('button:has-text("Large"), button:has-text("Complex")').first();
      if (await largeMapButton.isVisible()) {
        await largeMapButton.click();
        const mapStartTime = Date.now();
        await page.waitForSelector('.mind-map-node', { timeout: 30000 });
        const mapLoadTime = Date.now() - mapStartTime;
        console.log(`Large mind map load time: ${mapLoadTime}ms`);
        await takeScreenshot(page, 'integration-perf-02-large-map');
      }
      
      // Complex 3D scene
      await page.goto('/dashboard/stem-viz');
      const complex3DButton = page.locator('button:has-text("Complex Scene"), button:has-text("Protein")').first();
      if (await complex3DButton.isVisible()) {
        await complex3DButton.click();
        const sceneStartTime = Date.now();
        await page.waitForSelector('canvas', { timeout: 30000 });
        await page.waitForTimeout(3000); // Let scene fully render
        const sceneLoadTime = Date.now() - sceneStartTime;
        console.log(`Complex 3D scene load time: ${sceneLoadTime}ms`);
        await takeScreenshot(page, 'integration-perf-03-complex-3d');
      }
    });
  });
});