import { test, expect, testData } from '../../fixtures/base-fixtures';

test.describe('Instant Context Retrieval', () => {
  test.beforeEach(async ({ page, testHelpers }) => {
    // Upload test documents
    await page.goto('/dashboard/documents/upload');
    
    // Mock document upload for testing
    await testHelpers.mockAPIResponse('documents', {
      documents: [
        {
          id: 'doc1',
          title: 'Quantum Computing Fundamentals',
          content: testData.documents.academic.content,
          created_at: new Date().toISOString()
        },
        {
          id: 'doc2', 
          title: 'Machine Learning Architecture',
          content: testData.documents.technical.content,
          created_at: new Date().toISOString()
        }
      ]
    });
  });

  test('should show ghost text after pause in typing', async ({ page, testHelpers }) => {
    // Navigate to smart note creation
    await page.goto('/notes/new?smart=true');
    
    // Select documents
    await testHelpers.clickTestId('select-documents');
    await page.click('[data-testid="document-checkbox-doc1"]');
    await page.click('[data-testid="document-checkbox-doc2"]');
    await testHelpers.clickTestId('confirm-selection');
    
    // Start typing in editor
    const editor = page.locator('[data-testid="smart-note-editor"]');
    await editor.fill('I want to learn about quantum');
    
    // Wait for pause (1.5 seconds)
    await page.waitForTimeout(1600);
    
    // Check for ghost text
    await testHelpers.expectVisible('[data-testid="ghost-text"]');
    
    // Verify ghost text contains relevant content
    const ghostText = await testHelpers.getTextContent('[data-testid="ghost-text"]');
    expect(ghostText.toLowerCase()).toContain('quantum');
    
    // Capture screenshot
    await testHelpers.captureScreenshot('instant-context-ghost-text');
  });

  test('should accept suggestion with Tab key', async ({ page, testHelpers }) => {
    await page.goto('/notes/new?smart=true');
    
    // Mock context suggestions
    await testHelpers.mockAPIResponse('ai/context-suggestions', {
      suggestions: [{
        text: 'computing represents a fundamental shift in computation, leveraging quantum mechanical phenomena.',
        source: 'Quantum Computing Fundamentals, Page 1',
        documentId: 'doc1',
        documentTitle: 'Quantum Computing Fundamentals',
        relevance: 0.85,
        pageNumber: 1
      }]
    });
    
    const editor = page.locator('[data-testid="smart-note-editor"]');
    await editor.fill('Quantum');
    
    // Wait for suggestions
    await page.waitForTimeout(1600);
    await testHelpers.expectVisible('[data-testid="ghost-text"]');
    
    // Press Tab to accept
    await page.keyboard.press('Tab');
    
    // Verify text was inserted
    const editorContent = await editor.inputValue();
    expect(editorContent).toContain('computing represents a fundamental shift');
    
    // Check for source attribution tooltip
    await testHelpers.expectVisible('text=Source Added');
    await testHelpers.expectVisible('text=Quantum Computing Fundamentals');
  });

  test('should show source attribution', async ({ page, testHelpers }) => {
    await page.goto('/notes/new?smart=true');
    
    await testHelpers.mockAPIResponse('ai/context-suggestions', {
      suggestions: [{
        text: 'Superposition allows qubits to exist in multiple states simultaneously',
        source: 'Quantum Computing Fundamentals, Page 3, Paragraph 2',
        documentId: 'doc1',
        documentTitle: 'Quantum Computing Fundamentals',
        relevance: 0.92,
        pageNumber: 3,
        paragraph: '2'
      }]
    });
    
    const editor = page.locator('[data-testid="smart-note-editor"]');
    await editor.fill('Key concepts include');
    await page.waitForTimeout(1600);
    
    // Accept suggestion
    await page.keyboard.press('Tab');
    
    // Verify source tooltip appears
    const sourceTooltip = page.locator('text=Source Added');
    await expect(sourceTooltip).toBeVisible();
    
    // Verify detailed source info
    await testHelpers.expectVisible('text=Quantum Computing Fundamentals, Page 3');
  });

  test('should filter suggestions by relevance threshold', async ({ page, testHelpers }) => {
    await page.goto('/notes/new?smart=true');
    
    // Mock suggestions with varying relevance
    await testHelpers.mockAPIResponse('ai/context-suggestions', {
      suggestions: [
        {
          text: 'High relevance content',
          relevance: 0.85,
          source: 'Document 1',
          documentId: 'doc1',
          documentTitle: 'Document 1'
        },
        {
          text: 'Low relevance content',
          relevance: 0.45, // Below 70% threshold
          source: 'Document 2',
          documentId: 'doc2',
          documentTitle: 'Document 2'
        }
      ]
    });
    
    const editor = page.locator('[data-testid="smart-note-editor"]');
    await editor.fill('Test query');
    await page.waitForTimeout(1600);
    
    // Only high relevance suggestion should appear
    await testHelpers.expectVisible('[data-testid="ghost-text"]');
    const ghostText = await testHelpers.getTextContent('[data-testid="ghost-text"]');
    expect(ghostText).toContain('High relevance content');
    expect(ghostText).not.toContain('Low relevance content');
  });

  test('should dismiss ghost text with Escape key', async ({ page, testHelpers }) => {
    await page.goto('/notes/new?smart=true');
    
    await testHelpers.mockAPIResponse('ai/context-suggestions', {
      suggestions: [{
        text: 'Test suggestion',
        relevance: 0.8,
        source: 'Test Doc',
        documentId: 'doc1',
        documentTitle: 'Test Document'
      }]
    });
    
    const editor = page.locator('[data-testid="smart-note-editor"]');
    await editor.fill('Test');
    await page.waitForTimeout(1600);
    
    // Verify ghost text appears
    await testHelpers.expectVisible('[data-testid="ghost-text"]');
    
    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    
    // Ghost text should disappear
    await expect(page.locator('[data-testid="ghost-text"]')).not.toBeVisible();
  });

  test('should show alternative suggestions panel', async ({ page, testHelpers }) => {
    await page.goto('/notes/new?smart=true');
    
    // Mock multiple suggestions
    await testHelpers.mockAPIResponse('ai/context-suggestions', {
      suggestions: [
        {
          text: 'Primary suggestion from quantum doc',
          relevance: 0.9,
          source: 'Quantum Doc',
          documentId: 'doc1',
          documentTitle: 'Quantum Computing'
        },
        {
          text: 'Alternative from ML doc',
          relevance: 0.85,
          source: 'ML Doc',
          documentId: 'doc2',
          documentTitle: 'Machine Learning'
        },
        {
          text: 'Third option from another source',
          relevance: 0.8,
          source: 'Other Doc',
          documentId: 'doc3',
          documentTitle: 'Other Document'
        }
      ]
    });
    
    const editor = page.locator('[data-testid="smart-note-editor"]');
    await editor.fill('Looking for information about');
    await page.waitForTimeout(1600);
    
    // Should show alternatives panel
    await testHelpers.expectVisible('text=Alternative suggestions from your documents');
    
    // Verify all suggestions are shown
    await testHelpers.expectVisible('text=Primary suggestion from quantum doc');
    await testHelpers.expectVisible('text=Alternative from ML doc');
    await testHelpers.expectVisible('text=Third option from another source');
    
    // Check relevance scores
    await testHelpers.expectVisible('text=90%');
    await testHelpers.expectVisible('text=85%');
    await testHelpers.expectVisible('text=80%');
  });

  test('should show keyboard shortcuts helper', async ({ page, testHelpers }) => {
    await page.goto('/notes/new?smart=true');
    
    await testHelpers.mockAPIResponse('ai/context-suggestions', {
      suggestions: [{
        text: 'Test suggestion',
        relevance: 0.8,
        source: 'Test',
        documentId: 'doc1',
        documentTitle: 'Test Doc'
      }]
    });
    
    const editor = page.locator('[data-testid="smart-note-editor"]');
    await editor.fill('Test');
    await page.waitForTimeout(1600);
    
    // Keyboard shortcuts should be visible
    await testHelpers.expectVisible('kbd:has-text("Tab")');
    await testHelpers.expectVisible('text=Accept');
    await testHelpers.expectVisible('kbd:has-text("Esc")');
    await testHelpers.expectVisible('text=Dismiss');
  });

  test('should track accepted suggestions count', async ({ page, testHelpers }) => {
    await page.goto('/notes/new?smart=true');
    
    await testHelpers.mockAPIResponse('ai/context-suggestions', {
      suggestions: [{
        text: 'First suggestion',
        relevance: 0.8,
        source: 'Doc 1',
        documentId: 'doc1',
        documentTitle: 'Document 1'
      }]
    });
    
    const editor = page.locator('[data-testid="smart-note-editor"]');
    
    // Accept first suggestion
    await editor.fill('First');
    await page.waitForTimeout(1600);
    await page.keyboard.press('Tab');
    
    // Accept second suggestion
    await editor.fill(' Second');
    await page.waitForTimeout(1600);
    await page.keyboard.press('Tab');
    
    // Check counter
    await testHelpers.expectVisible('text=2 suggestions accepted');
  });

  test('performance: suggestions should appear within 2 seconds', async ({ page, testHelpers }) => {
    await page.goto('/notes/new?smart=true');
    
    await testHelpers.mockAPIResponse('ai/context-suggestions', {
      suggestions: [{
        text: 'Quick suggestion',
        relevance: 0.8,
        source: 'Fast Doc',
        documentId: 'doc1',
        documentTitle: 'Fast Document'
      }]
    });
    
    const metrics = await testHelpers.measurePerformance('instant-context-retrieval', async () => {
      const editor = page.locator('[data-testid="smart-note-editor"]');
      await editor.fill('Performance test');
      
      // Start timing after typing stops
      const startTime = Date.now();
      
      // Wait for ghost text to appear
      await testHelpers.waitForElement('[data-testid="ghost-text"]', { timeout: 3000 });
      
      const endTime = Date.now();
      return endTime - startTime;
    });
    
    // Should appear within 2 seconds (1.5s pause + processing)
    expect(metrics.duration).toBeLessThan(2000);
  });

  test('accessibility: ghost text should be screen reader friendly', async ({ page, testHelpers }) => {
    await page.goto('/notes/new?smart=true');
    
    await testHelpers.mockAPIResponse('ai/context-suggestions', {
      suggestions: [{
        text: 'Accessible suggestion',
        relevance: 0.8,
        source: 'Doc',
        documentId: 'doc1',
        documentTitle: 'Document'
      }]
    });
    
    const editor = page.locator('[data-testid="smart-note-editor"]');
    await editor.fill('Test');
    await page.waitForTimeout(1600);
    
    // Check accessibility
    const a11yResults = await testHelpers.checkAccessibility('instant-context-editor');
    expect(a11yResults.violations).toHaveLength(0);
    
    // Verify ARIA labels exist
    const ghostTextElement = page.locator('[data-testid="ghost-text"]');
    const ariaLabel = await ghostTextElement.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});