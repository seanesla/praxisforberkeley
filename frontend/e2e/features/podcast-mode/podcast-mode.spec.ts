import { test, expect, testData, scenarios } from '../../fixtures/base-fixtures';

test.describe('Interactive Podcast Mode', () => {
  test.beforeEach(async ({ page, testHelpers }) => {
    // Upload a test document for podcast discussion
    await scenarios.uploadDocument(testHelpers, testData.documents.academic);
  });

  test('should open podcast mode from command palette', async ({ page, testHelpers }) => {
    await testHelpers.measurePerformance('open-podcast-mode', async () => {
      // Open command palette
      await page.keyboard.press('Meta+k');
      await testHelpers.waitForElement('[data-testid="command-palette"]');
      
      // Search for podcast mode
      await page.fill('[data-testid="command-input"]', 'podcast');
      await page.keyboard.press('Enter');
      
      // Verify podcast interface opens
      await testHelpers.expectVisible('[data-testid="podcast-interface"]');
    });
    
    // Capture screenshot
    await testHelpers.captureScreenshot('podcast-mode-interface');
  });

  test('should start voice conversation about document', async ({ page, testHelpers }) => {
    // Navigate to podcast mode
    await page.goto('/podcast');
    
    // Select document for discussion
    await testHelpers.clickTestId('select-document');
    await page.click('[data-testid="document-option"]:first-child');
    
    // Start conversation
    await testHelpers.clickTestId('start-podcast');
    
    // Verify audio waveform appears
    await testHelpers.expectVisible('[data-testid="audio-waveform"]');
    
    // Verify transcript area
    await testHelpers.expectVisible('[data-testid="transcript-area"]');
    
    // Test voice input simulation
    await testHelpers.clickTestId('voice-input-toggle');
    await testHelpers.expectVisible('[data-testid="recording-indicator"]');
    
    // Capture screenshot of active podcast
    await testHelpers.captureScreenshot('podcast-active-conversation');
  });

  test('should display real-time transcription', async ({ page, testHelpers }) => {
    await page.goto('/podcast');
    
    // Mock transcription data
    await testHelpers.mockAPIResponse('podcast/transcribe', {
      text: 'Tell me about quantum computing',
      timestamp: Date.now()
    });
    
    // Start recording
    await testHelpers.clickTestId('start-podcast');
    await testHelpers.clickTestId('voice-input-toggle');
    
    // Wait for transcription
    await testHelpers.waitForAPI('podcast/transcribe');
    
    // Verify transcription appears
    const transcript = await testHelpers.getTextContent('[data-testid="user-transcript"]');
    expect(transcript).toContain('Tell me about quantum computing');
  });

  test('should generate AI responses with voice', async ({ page, testHelpers }) => {
    await page.goto('/podcast');
    
    // Select document and start
    await testHelpers.clickTestId('select-document');
    await page.click('[data-testid="document-option"]:first-child');
    await testHelpers.clickTestId('start-podcast');
    
    // Send a question
    await page.fill('[data-testid="text-input"]', 'What are the key concepts?');
    await page.keyboard.press('Enter');
    
    // Wait for AI response
    await testHelpers.waitForAPI('ai/chat');
    
    // Verify response appears with audio
    await testHelpers.expectVisible('[data-testid="ai-response"]');
    await testHelpers.expectVisible('[data-testid="response-audio-player"]');
    
    // Verify play button
    await testHelpers.clickTestId('play-response');
    await testHelpers.expectVisible('[data-testid="audio-playing-indicator"]');
  });

  test('should support conversation controls', async ({ page, testHelpers }) => {
    await page.goto('/podcast');
    await testHelpers.clickTestId('start-podcast');
    
    // Test pause/resume
    await testHelpers.clickTestId('pause-podcast');
    await testHelpers.expectVisible('[data-testid="podcast-paused"]');
    
    await testHelpers.clickTestId('resume-podcast');
    await expect(page.locator('[data-testid="podcast-paused"]')).not.toBeVisible();
    
    // Test end conversation
    await testHelpers.clickTestId('end-podcast');
    await testHelpers.expectVisible('[data-testid="podcast-summary"]');
    
    // Verify summary includes key points
    const summary = await testHelpers.getTextContent('[data-testid="conversation-summary"]');
    expect(summary).toBeTruthy();
  });

  test('should handle voice commands', async ({ page, testHelpers }) => {
    await page.goto('/podcast');
    await testHelpers.clickTestId('start-podcast');
    
    // Mock voice command recognition
    await testHelpers.mockAPIResponse('podcast/voice-command', {
      command: 'change_topic',
      parameters: { topic: 'applications' }
    });
    
    // Simulate voice command
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('voice-command', {
        detail: { text: 'Let\'s talk about applications' }
      }));
    });
    
    // Verify topic change
    await testHelpers.waitForAPI('podcast/voice-command');
    const currentTopic = await testHelpers.getTextContent('[data-testid="current-topic"]');
    expect(currentTopic).toContain('applications');
  });

  test('should save podcast transcript', async ({ page, testHelpers }) => {
    await page.goto('/podcast');
    
    // Complete a conversation
    await testHelpers.clickTestId('start-podcast');
    await page.fill('[data-testid="text-input"]', 'Test question');
    await page.keyboard.press('Enter');
    await testHelpers.waitForAPI('ai/chat');
    
    // End and save
    await testHelpers.clickTestId('end-podcast');
    await testHelpers.clickTestId('save-transcript');
    
    // Verify save confirmation
    await testHelpers.expectVisible('[data-testid="transcript-saved"]');
    
    // Navigate to saved podcasts
    await page.goto('/podcasts');
    await testHelpers.expectVisible('[data-testid="podcast-list"]');
    
    const savedPodcast = await testHelpers.getTextContent('[data-testid="podcast-item"]:first-child');
    expect(savedPodcast).toContain('Test question');
  });

  test('should support multiple languages', async ({ page, testHelpers }) => {
    await page.goto('/podcast');
    
    // Change language
    await testHelpers.clickTestId('language-selector');
    await page.click('[data-testid="language-spanish"]');
    
    // Verify UI updates
    const startButton = await testHelpers.getTextContent('[data-testid="start-podcast"]');
    expect(startButton).toContain('Iniciar');
    
    // Test Spanish voice input
    await testHelpers.mockAPIResponse('podcast/transcribe', {
      text: 'Háblame sobre computación cuántica',
      language: 'es'
    });
    
    await testHelpers.clickTestId('start-podcast');
    await testHelpers.clickTestId('voice-input-toggle');
    await testHelpers.waitForAPI('podcast/transcribe');
    
    const transcript = await testHelpers.getTextContent('[data-testid="user-transcript"]');
    expect(transcript).toContain('computación cuántica');
  });

  test('should track podcast analytics', async ({ page, testHelpers }) => {
    await page.goto('/podcast');
    
    // Complete a podcast session
    await testHelpers.clickTestId('start-podcast');
    await page.waitForTimeout(5000); // Simulate conversation time
    await testHelpers.clickTestId('end-podcast');
    
    // Check analytics
    await page.goto('/dashboard');
    await testHelpers.expectVisible('[data-testid="podcast-stats"]');
    
    const duration = await testHelpers.getTextContent('[data-testid="podcast-duration"]');
    expect(parseInt(duration)).toBeGreaterThan(0);
  });

  test('accessibility: podcast mode should be keyboard navigable', async ({ page, testHelpers }) => {
    await page.goto('/podcast');
    
    // Check accessibility
    const a11yResults = await testHelpers.checkAccessibility('podcast-mode');
    expect(a11yResults.violations).toHaveLength(0);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Focus start button
    await page.keyboard.press('Enter'); // Start podcast
    
    await testHelpers.expectVisible('[data-testid="podcast-interface"]');
    
    // Navigate controls with keyboard
    await page.keyboard.press('Tab'); // Focus pause
    await page.keyboard.press('Space'); // Pause
    await testHelpers.expectVisible('[data-testid="podcast-paused"]');
  });

  test('performance: podcast mode should load quickly', async ({ page, testHelpers }) => {
    const metrics = await testHelpers.measurePerformance('podcast-load', async () => {
      await page.goto('/podcast');
      await testHelpers.waitForElement('[data-testid="podcast-interface"]');
    });
    
    expect(metrics.duration).toBeLessThan(2000); // Should load in under 2 seconds
    expect(metrics.firstContentfulPaint).toBeLessThan(1000); // FCP under 1 second
  });
});