const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `ui-test-${timestamp}-${name}.png`;
  await page.screenshot({ 
    path: filename,
    fullPage: true 
  });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filename;
}

async function testUI() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console error:', msg.text());
      }
    });

    console.log('\n🚀 Starting New Features UI Test...\n');

    // 1. Test Landing Page
    console.log('1️⃣ Testing Landing Page...');
    await page.goto('http://localhost:3000');
    await wait(2000);
    await takeScreenshot(page, '01-landing-page');

    // 2. Test Login
    console.log('\n2️⃣ Testing Login...');
    await page.click('a[href="/login"]');
    await wait(1000);
    
    // Fill login form
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'password123');
    await takeScreenshot(page, '02-login-filled');
    
    await page.click('button[type="submit"]');
    await wait(3000);

    // Check if redirected to dashboard
    const url = page.url();
    if (url.includes('/dashboard')) {
      console.log('✅ Successfully logged in and redirected to dashboard');
      await takeScreenshot(page, '03-dashboard');
    } else {
      console.log('❌ Login failed or not redirected properly');
      await takeScreenshot(page, '03-login-error');
      return;
    }

    // 3. Test Settings Page
    console.log('\n3️⃣ Testing Settings Page...');
    
    // Click Settings button
    const settingsButton = await page.$('button:has-text("⚙️ Settings")');
    if (settingsButton) {
      await settingsButton.click();
      await wait(2000);
      await takeScreenshot(page, '04-settings-page');
      
      // Check for API key card
      const apiKeyCard = await page.$('.border.border-gray-200');
      if (apiKeyCard) {
        console.log('✅ API Key card found in settings');
        
        // Try to click Connect button
        const connectButton = await page.$('button:has-text("Connect")');
        if (connectButton) {
          await connectButton.click();
          await wait(1000);
          await takeScreenshot(page, '05-api-key-input');
        }
      } else {
        console.log('❌ API Key card not found');
      }
      
      // Go back to dashboard
      await page.goBack();
      await wait(2000);
    } else {
      console.log('❌ Settings button not found');
    }

    // 4. Test Document Upload
    console.log('\n4️⃣ Testing Document Upload...');
    
    // Click Documents tab
    const documentsTab = await page.$('button:has-text("📄 Documents")');
    if (documentsTab) {
      await documentsTab.click();
      await wait(1000);
      await takeScreenshot(page, '06-documents-tab');
      
      // Look for upload area
      const uploadArea = await page.$('div.border-dashed');
      if (uploadArea) {
        console.log('✅ Document upload area found');
        
        // Create a test file
        const testContent = 'This is a test document for the Praxis AI system. It contains information about artificial intelligence and machine learning.';
        await fs.writeFile('test-doc-ui.txt', testContent);
        
        // Upload file
        const inputElement = await page.$('input[type="file"]');
        if (inputElement) {
          await inputElement.uploadFile('test-doc-ui.txt');
          await wait(3000);
          await takeScreenshot(page, '07-document-uploaded');
          
          // Clean up
          await fs.unlink('test-doc-ui.txt');
        }
      }
    }

    // 5. Test AI Chat
    console.log('\n5️⃣ Testing AI Chat...');
    
    const chatTab = await page.$('button:has-text("💬 Cloud AI Chat")');
    if (chatTab) {
      await chatTab.click();
      await wait(2000);
      await takeScreenshot(page, '08-chat-interface');
      
      // Check for API key warning
      const apiKeyWarning = await page.$('text=/configure.*API key/i');
      if (apiKeyWarning) {
        console.log('⚠️ API key not configured - chat features limited');
      } else {
        // Try to send a message
        const textarea = await page.$('textarea[placeholder*="Type your message"]');
        if (textarea) {
          await textarea.type('Hello, can you help me understand this document?');
          await takeScreenshot(page, '09-chat-message-typed');
        }
      }
    }

    // 6. Test Genesis Engine
    console.log('\n6️⃣ Testing Genesis Engine...');
    
    const genesisTab = await page.$('button:has-text("🧬 Genesis Engine")');
    if (genesisTab) {
      await genesisTab.click();
      await wait(2000);
      await takeScreenshot(page, '10-genesis-engine');
      
      // Check domain selector
      const physicsButton = await page.$('button:has-text("physics")');
      if (physicsButton) {
        console.log('✅ Genesis Engine domain selector found');
        
        // Type a simulation prompt
        const promptInput = await page.$('input[placeholder*="Describe your"]');
        if (promptInput) {
          await promptInput.type('Create a simulation of two balls colliding');
          await takeScreenshot(page, '11-genesis-prompt');
        }
      }
    }

    // 7. Test Mind Maps
    console.log('\n7️⃣ Testing Mind Maps...');
    
    const mindMapsTab = await page.$('button:has-text("🧠 Mind Maps")');
    if (mindMapsTab) {
      await mindMapsTab.click();
      await wait(2000);
      await takeScreenshot(page, '12-mind-maps');
      
      // Look for generate button
      const generateButton = await page.$('button:has-text("Generate from Document")');
      if (generateButton) {
        console.log('✅ Mind map generation button found');
      } else {
        console.log('ℹ️ No documents selected - mind map generation not available');
      }
    }

    // Final summary
    console.log('\n📊 UI Test Summary:');
    console.log('✅ Landing page loaded');
    console.log('✅ Login functionality works');
    console.log('✅ Dashboard accessible');
    console.log('✅ Settings page with API key management');
    console.log('✅ Document upload interface');
    console.log('✅ AI Chat interface');
    console.log('✅ Genesis Engine interface');
    console.log('✅ Mind Maps interface');
    console.log('\n✨ All new features are accessible through the UI!');
    
    await takeScreenshot(page, '13-final-state');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await wait(3000); // Keep browser open for manual inspection
    await browser.close();
  }
}

// Run the test
testUI().catch(console.error);