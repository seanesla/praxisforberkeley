import { test, expect } from '@playwright/test';
import { 
  TEST_USERS,
  loginUser,
  takeScreenshot,
  clickWithScreenshot,
  fillFormWithScreenshots,
  testHoverState,
  waitForAnimation,
  testKeyboardNavigation,
  verifyVisible,
  testResponsive,
  setupConsoleLogging
} from './helpers/test-helpers';

test.describe('2D Physics & STEM Visualization - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/stem-viz');
    await waitForAnimation(page);
  });

  test('Complete 2D STEM visualization workflow with physics', async ({ page }) => {
    console.log('⚛️ Starting comprehensive 2D physics & STEM visualization test');
    
    // Test 1: STEM Visualization Dashboard
    await test.step('STEM visualization dashboard', async () => {
      await takeScreenshot(page, 'stem2d-01-dashboard');
      await testResponsive(page, 'stem2d-dashboard');
      
      // Check for visualization options
      const vizOptions = page.locator('.stem-viz-options, [data-testid="viz-options"]');
      if (await vizOptions.isVisible()) {
        await takeScreenshot(page, 'stem2d-visualization-options');
      }
    });

    // Test 2: Physics Simulations
    await test.step('2D Physics simulations', async () => {
      // Select 2D mode
      const mode2DButton = page.locator('button:has-text("2D"), input[value="2d"]').first();
      if (await mode2DButton.isVisible()) {
        await clickWithScreenshot(page, mode2DButton, 'stem2d-select-2d-mode');
      }
      
      // Test different physics presets
      const physicsPresets = [
        { name: 'Pendulum', description: 'Simple pendulum motion' },
        { name: 'Double Pendulum', description: 'Chaotic motion demonstration' },
        { name: 'Spring System', description: 'Hooke\'s law visualization' },
        { name: 'Projectile Motion', description: 'Trajectory with gravity' },
        { name: 'Collision', description: 'Elastic collision demonstration' }
      ];
      
      for (const preset of physicsPresets) {
        const presetButton = page.locator(`button:has-text("${preset.name}"), [data-preset="${preset.name.toLowerCase().replace(' ', '-')}"]`).first();
        if (await presetButton.isVisible()) {
          await clickWithScreenshot(page, presetButton, `stem2d-physics-${preset.name.toLowerCase().replace(' ', '-')}`);
          await waitForAnimation(page);
          await page.waitForTimeout(2000); // Let simulation run
          await takeScreenshot(page, `stem2d-physics-${preset.name.toLowerCase().replace(' ', '-')}-running`);
          
          // Test controls for this preset
          const playPause = page.locator('button[aria-label*="pause"], button[aria-label*="play"]').first();
          if (await playPause.isVisible()) {
            await clickWithScreenshot(page, playPause, `stem2d-physics-${preset.name.toLowerCase().replace(' ', '-')}-pause`);
          }
        }
      }
    });

    // Test 3: Chemistry Visualizations
    await test.step('2D Chemistry visualizations', async () => {
      // Navigate to chemistry section
      const chemButton = page.locator('button:has-text("Chemistry"), [data-domain="chemistry"]').first();
      if (await chemButton.isVisible()) {
        await clickWithScreenshot(page, chemButton, 'stem2d-chemistry-section');
      }
      
      // Test molecule visualizations
      const molecules = [
        { name: 'Water (H2O)', formula: 'H₂O' },
        { name: 'Methane (CH4)', formula: 'CH₄' },
        { name: 'Benzene (C6H6)', formula: 'C₆H₆' },
        { name: 'Glucose (C6H12O6)', formula: 'C₆H₁₂O₆' }
      ];
      
      for (const molecule of molecules) {
        const moleculeButton = page.locator(`button:has-text("${molecule.name}"), [data-molecule="${molecule.name.toLowerCase()}"]`).first();
        if (await moleculeButton.isVisible()) {
          await clickWithScreenshot(page, moleculeButton, `stem2d-molecule-${molecule.name.toLowerCase().replace(/[() ]/g, '-')}`);
          await waitForAnimation(page);
          
          // Check for annotations
          const annotation = page.locator(`.annotation:has-text("${molecule.formula}"), [data-formula="${molecule.formula}"]`).first();
          if (await annotation.isVisible()) {
            await takeScreenshot(page, `stem2d-molecule-${molecule.name.toLowerCase().replace(/[() ]/g, '-')}-annotated`);
          }
        }
      }
      
      // Test bond visualization
      const bondToggle = page.locator('button:has-text("Show Bonds"), input[name="show-bonds"]').first();
      if (await bondToggle.isVisible()) {
        await clickWithScreenshot(page, bondToggle, 'stem2d-chemistry-bonds-toggle');
      }
    });

    // Test 4: Mathematics Visualizations
    await test.step('2D Mathematics visualizations', async () => {
      // Navigate to mathematics section
      const mathButton = page.locator('button:has-text("Mathematics"), [data-domain="mathematics"]').first();
      if (await mathButton.isVisible()) {
        await clickWithScreenshot(page, mathButton, 'stem2d-mathematics-section');
      }
      
      // Test function plotting
      const mathFunctions = [
        { name: 'Sine Wave', equation: 'sin(x)' },
        { name: 'Parabola', equation: 'x²' },
        { name: 'Exponential', equation: 'e^x' },
        { name: 'Logarithm', equation: 'ln(x)' }
      ];
      
      for (const func of mathFunctions) {
        const funcButton = page.locator(`button:has-text("${func.name}")`).first();
        if (await funcButton.isVisible()) {
          await clickWithScreenshot(page, funcButton, `stem2d-math-${func.name.toLowerCase().replace(' ', '-')}`);
          await waitForAnimation(page);
          
          // Check for equation display
          const equationDisplay = page.locator(`.equation:has-text("${func.equation}"), .katex`).first();
          if (await equationDisplay.isVisible()) {
            await takeScreenshot(page, `stem2d-math-${func.name.toLowerCase().replace(' ', '-')}-equation`);
          }
        }
      }
      
      // Test parametric equations
      const parametricButton = page.locator('button:has-text("Parametric")').first();
      if (await parametricButton.isVisible()) {
        await clickWithScreenshot(page, parametricButton, 'stem2d-math-parametric');
        
        // Input custom parametric equation
        const xInput = page.locator('input[placeholder*="x(t)"], input[name="x-equation"]').first();
        const yInput = page.locator('input[placeholder*="y(t)"], input[name="y-equation"]').first();
        
        if (await xInput.isVisible() && await yInput.isVisible()) {
          await xInput.fill('cos(t) + cos(3*t)/2');
          await yInput.fill('sin(t) + sin(3*t)/2');
          await takeScreenshot(page, 'stem2d-math-parametric-input');
          
          const plotButton = page.locator('button:has-text("Plot"), button[type="submit"]').first();
          await clickWithScreenshot(page, plotButton, 'stem2d-math-parametric-plot');
          await waitForAnimation(page);
        }
      }
    });

    // Test 5: Biology Visualizations
    await test.step('2D Biology visualizations', async () => {
      // Navigate to biology section
      const bioButton = page.locator('button:has-text("Biology"), [data-domain="biology"]').first();
      if (await bioButton.isVisible()) {
        await clickWithScreenshot(page, bioButton, 'stem2d-biology-section');
      }
      
      // Test cell visualizations
      const cells = [
        { name: 'Plant Cell', features: ['Cell Wall', 'Chloroplast', 'Vacuole'] },
        { name: 'Animal Cell', features: ['Nucleus', 'Mitochondria', 'Ribosomes'] },
        { name: 'Bacteria Cell', features: ['Cell Membrane', 'DNA', 'Flagella'] }
      ];
      
      for (const cell of cells) {
        const cellButton = page.locator(`button:has-text("${cell.name}")`).first();
        if (await cellButton.isVisible()) {
          await clickWithScreenshot(page, cellButton, `stem2d-bio-${cell.name.toLowerCase().replace(' ', '-')}`);
          await waitForAnimation(page);
          
          // Test feature highlighting
          for (const feature of cell.features) {
            const featureElement = page.locator(`.cell-feature:has-text("${feature}"), [data-feature="${feature}"]`).first();
            if (await featureElement.isVisible()) {
              await testHoverState(page, featureElement, `stem2d-bio-${cell.name.toLowerCase().replace(' ', '-')}-${feature.toLowerCase()}`);
            }
          }
        }
      }
    });

    // Test 6: Dynamic Annotations
    await test.step('Dynamic annotation system', async () => {
      // Test annotation controls
      const annotationToggle = page.locator('button:has-text("Annotations"), input[name="show-annotations"]').first();
      if (await annotationToggle.isVisible()) {
        await clickWithScreenshot(page, annotationToggle, 'stem2d-annotations-toggle');
      }
      
      // Test annotation levels
      const annotationLevels = ['Basic', 'Intermediate', 'Advanced'];
      for (const level of annotationLevels) {
        const levelButton = page.locator(`button:has-text("${level}"), input[value="${level.toLowerCase()}"]`).first();
        if (await levelButton.isVisible()) {
          await clickWithScreenshot(page, levelButton, `stem2d-annotation-level-${level.toLowerCase()}`);
          await waitForAnimation(page);
          await takeScreenshot(page, `stem2d-annotations-${level.toLowerCase()}`);
        }
      }
      
      // Test LaTeX formula rendering
      const formulaAnnotation = page.locator('.katex, .MathJax').first();
      if (await formulaAnnotation.isVisible()) {
        await takeScreenshot(page, 'stem2d-latex-formula-rendering');
      }
    });

    // Test 7: Interactive Controls
    await test.step('Interactive controls and parameters', async () => {
      // Test sliders
      const sliders = await page.locator('input[type="range"]').all();
      for (let i = 0; i < Math.min(3, sliders.length); i++) {
        const slider = sliders[i];
        const label = await slider.getAttribute('aria-label') || `slider-${i}`;
        
        // Move slider to different positions
        const box = await slider.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2);
          await takeScreenshot(page, `stem2d-${label}-25`);
          
          await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
          await takeScreenshot(page, `stem2d-${label}-75`);
        }
      }
      
      // Test input fields
      const inputs = await page.locator('input[type="number"]').all();
      for (let i = 0; i < Math.min(2, inputs.length); i++) {
        const input = inputs[i];
        const placeholder = await input.getAttribute('placeholder') || `input-${i}`;
        await input.fill('42');
        await takeScreenshot(page, `stem2d-input-${placeholder.replace(/[^a-z0-9]/gi, '-')}`);
      }
    });

    // Test 8: Time Controls
    await test.step('Time controls and animation', async () => {
      const timeControls = page.locator('.time-controls, [data-testid="time-controls"]').first();
      if (await timeControls.isVisible()) {
        // Play/Pause
        const playPauseButton = page.locator('button[aria-label*="play"], button[aria-label*="pause"]').first();
        await clickWithScreenshot(page, playPauseButton, 'stem2d-time-play');
        await page.waitForTimeout(2000); // Let animation run
        await clickWithScreenshot(page, playPauseButton, 'stem2d-time-pause');
        
        // Speed controls
        const speedButtons = ['0.5x', '1x', '2x', '4x'];
        for (const speed of speedButtons) {
          const speedButton = page.locator(`button:has-text("${speed}")`).first();
          if (await speedButton.isVisible()) {
            await clickWithScreenshot(page, speedButton, `stem2d-speed-${speed}`);
          }
        }
        
        // Reset
        const resetButton = page.locator('button:has-text("Reset"), button[aria-label*="reset"]').first();
        if (await resetButton.isVisible()) {
          await clickWithScreenshot(page, resetButton, 'stem2d-time-reset');
        }
      }
    });

    // Test 9: Measurement Tools
    await test.step('Measurement tools', async () => {
      const measureButton = page.locator('button:has-text("Measure"), button[aria-label*="measure"]').first();
      if (await measureButton.isVisible()) {
        await clickWithScreenshot(page, measureButton, 'stem2d-measure-tool');
        
        // Measure distance
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        if (box) {
          await page.mouse.click(box.x + 100, box.y + 100);
          await page.mouse.click(box.x + 300, box.y + 200);
          await takeScreenshot(page, 'stem2d-measure-distance');
        }
        
        // Measure angle
        const angleButton = page.locator('button:has-text("Angle")').first();
        if (await angleButton.isVisible()) {
          await angleButton.click();
          await page.mouse.click(box.x + 200, box.y + 200);
          await page.mouse.click(box.x + 100, box.y + 200);
          await page.mouse.click(box.x + 200, box.y + 100);
          await takeScreenshot(page, 'stem2d-measure-angle');
        }
      }
    });

    // Test 10: Export and Sharing
    await test.step('Export and sharing options', async () => {
      const exportButton = page.locator('button:has-text("Export")').first();
      if (await exportButton.isVisible()) {
        await clickWithScreenshot(page, exportButton, 'stem2d-export-menu');
        
        // Test export formats
        const formats = ['PNG', 'SVG', 'Data (CSV)', 'LaTeX'];
        for (const format of formats) {
          const formatButton = page.locator(`button:has-text("${format}")`).first();
          if (await formatButton.isVisible()) {
            await testHoverState(page, formatButton, `stem2d-export-${format.toLowerCase().replace(/[() ]/g, '-')}`);
          }
        }
      }
      
      // Share button
      const shareButton = page.locator('button:has-text("Share")').first();
      if (await shareButton.isVisible()) {
        await clickWithScreenshot(page, shareButton, 'stem2d-share-dialog');
      }
    });

    // Test 11: Responsive Design
    await test.step('Responsive 2D visualization', async () => {
      await testResponsive(page, 'stem2d-responsive');
    });

    console.log('✅ 2D Physics & STEM visualization tests completed');
  });

  test('Test 2D physics engine performance', async ({ page }) => {
    await test.step('Many body simulation', async () => {
      // Navigate to physics sandbox
      const sandboxButton = page.locator('button:has-text("Sandbox"), button:has-text("Custom")').first();
      if (await sandboxButton.isVisible()) {
        await sandboxButton.click();
        await waitForAnimation(page);
        
        // Add many bodies
        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        
        if (box) {
          // Add 50 bodies in a grid
          for (let i = 0; i < 50; i++) {
            const x = box.x + (i % 10) * 50 + 50;
            const y = box.y + Math.floor(i / 10) * 50 + 50;
            await page.mouse.click(x, y);
            await page.waitForTimeout(50);
          }
          
          await takeScreenshot(page, 'stem2d-performance-many-bodies');
          
          // Enable physics
          const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
          if (await startButton.isVisible()) {
            await startButton.click();
            await page.waitForTimeout(3000); // Let simulation run
            await takeScreenshot(page, 'stem2d-performance-running');
          }
        }
      }
    });
  });

  test('Test 2D equation input and visualization', async ({ page }) => {
    await test.step('Custom equation input', async () => {
      // Navigate to custom equation section
      const customButton = page.locator('button:has-text("Custom Equation")').first();
      if (await customButton.isVisible()) {
        await customButton.click();
        await waitForAnimation(page);
        
        // Test different equation types
        const equations = [
          { type: 'Parametric', x: '5*cos(t) - cos(5*t)', y: '5*sin(t) - sin(5*t)' },
          { type: 'Polar', r: '2 + 3*cos(4*theta)' },
          { type: 'Implicit', equation: 'x^2 + y^2 - 25' },
          { type: 'Differential', equation: 'dy/dx = -x/y' }
        ];
        
        for (const eq of equations) {
          const typeButton = page.locator(`button:has-text("${eq.type}")`).first();
          if (await typeButton.isVisible()) {
            await typeButton.click();
            await waitForAnimation(page);
            
            if (eq.x && eq.y) {
              await page.fill('input[name="x-equation"]', eq.x);
              await page.fill('input[name="y-equation"]', eq.y);
            } else if (eq.r) {
              await page.fill('input[name="r-equation"]', eq.r);
            } else if (eq.equation) {
              await page.fill('input[name="equation"]', eq.equation);
            }
            
            await takeScreenshot(page, `stem2d-equation-${eq.type.toLowerCase()}`);
            
            const plotButton = page.locator('button:has-text("Plot")').first();
            await plotButton.click();
            await waitForAnimation(page);
            await takeScreenshot(page, `stem2d-equation-${eq.type.toLowerCase()}-result`);
          }
        }
      }
    });
  });
});