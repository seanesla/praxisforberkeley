import { test, expect } from '@playwright/test';
import { 
  TEST_USERS,
  loginUser,
  takeScreenshot,
  clickWithScreenshot,
  fillFormWithScreenshots,
  testHoverState,
  waitForAnimation,
  verifyVisible,
  testResponsive,
  setupConsoleLogging
} from './helpers/test-helpers';

test.describe('3D STEM Visualization - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);
    await loginUser(page, TEST_USERS.primary);
    await page.goto('/dashboard/stem-viz');
    await waitForAnimation(page);
  });

  test('Complete 3D STEM visualization workflow with Genesis physics', async ({ page }) => {
    console.log('🌐 Starting comprehensive 3D STEM visualization test');
    
    // Test 1: Select 3D Mode
    await test.step('Select 3D visualization mode', async () => {
      const mode3DButton = page.locator('button:has-text("3D"), input[value="3d"]').first();
      await clickWithScreenshot(page, mode3DButton, 'stem3d-01-select-mode');
      await waitForAnimation(page);
      
      // Wait for WebGL canvas to load
      await page.waitForSelector('canvas[data-engine="three"], .three-canvas', { timeout: 10000 });
      await takeScreenshot(page, 'stem3d-02-canvas-loaded');
    });

    // Test 2: Physics - 3D Simulations
    await test.step('3D Physics simulations', async () => {
      const physicsButton = page.locator('button:has-text("Physics"), [data-domain="physics"]').first();
      await clickWithScreenshot(page, physicsButton, 'stem3d-physics-section');
      
      // Test 3D physics presets
      const physics3DPresets = [
        { name: 'Double Pendulum 3D', description: 'Chaotic motion in 3D space' },
        { name: 'Solar System', description: 'Orbital mechanics simulation' },
        { name: 'N-Body Gravity', description: 'Gravitational interaction' },
        { name: 'Electromagnetic Field', description: 'Charged particle motion' },
        { name: 'Fluid Dynamics', description: 'Particle-based fluid simulation' }
      ];
      
      for (const preset of physics3DPresets) {
        const presetButton = page.locator(`button:has-text("${preset.name}")`).first();
        if (await presetButton.isVisible()) {
          await clickWithScreenshot(page, presetButton, `stem3d-physics-${preset.name.toLowerCase().replace(/ /g, '-')}`);
          await waitForAnimation(page);
          await page.waitForTimeout(2000); // Let Genesis physics initialize
          
          // Test 3D controls
          await test3DControls(page, `stem3d-physics-${preset.name.toLowerCase().replace(/ /g, '-')}`);
          
          // Check for Genesis connection status
          const genesisStatus = page.locator('.genesis-status, [data-testid="genesis-status"]').first();
          if (await genesisStatus.isVisible()) {
            await takeScreenshot(page, `stem3d-genesis-status-${preset.name.toLowerCase().replace(/ /g, '-')}`);
          }
        }
      }
    });

    // Test 3: Chemistry - 3D Molecules
    await test.step('3D Chemistry molecules', async () => {
      const chemButton = page.locator('button:has-text("Chemistry"), [data-domain="chemistry"]').first();
      await clickWithScreenshot(page, chemButton, 'stem3d-chemistry-section');
      
      // Test 3D molecule visualizations
      const molecules3D = [
        { name: 'Water Molecule', atoms: 3 },
        { name: 'Methane', atoms: 5 },
        { name: 'Benzene Ring', atoms: 12 },
        { name: 'DNA Double Helix', atoms: 'many' },
        { name: 'Protein Structure', atoms: 'many' },
        { name: 'Carbon Nanotube', atoms: 'many' }
      ];
      
      for (const molecule of molecules3D) {
        const moleculeButton = page.locator(`button:has-text("${molecule.name}")`).first();
        if (await moleculeButton.isVisible()) {
          await clickWithScreenshot(page, moleculeButton, `stem3d-molecule-${molecule.name.toLowerCase().replace(/ /g, '-')}`);
          await waitForAnimation(page);
          await page.waitForTimeout(1500); // Let 3D model load
          
          // Test molecule rotation
          await testMoleculeInteraction(page, molecule.name);
          
          // Test bond visualization options
          const bondOptions = ['Ball and Stick', 'Space Filling', 'Wireframe', 'Ribbon'];
          for (const option of bondOptions) {
            const optionButton = page.locator(`button:has-text("${option}")`).first();
            if (await optionButton.isVisible()) {
              await clickWithScreenshot(page, optionButton, `stem3d-molecule-${molecule.name.toLowerCase().replace(/ /g, '-')}-${option.toLowerCase().replace(/ /g, '-')}`);
            }
          }
        }
      }
    });

    // Test 4: Biology - 3D Cell Structures
    await test.step('3D Biology cell structures', async () => {
      const bioButton = page.locator('button:has-text("Biology"), [data-domain="biology"]').first();
      await clickWithScreenshot(page, bioButton, 'stem3d-biology-section');
      
      // Test 3D cell visualizations
      const cells3D = [
        { 
          name: 'Animal Cell 3D', 
          organelles: ['Nucleus', 'Mitochondria', 'Endoplasmic Reticulum', 'Golgi Apparatus']
        },
        { 
          name: 'Plant Cell 3D', 
          organelles: ['Cell Wall', 'Chloroplast', 'Large Vacuole', 'Nucleus']
        },
        { 
          name: 'Neuron 3D', 
          parts: ['Cell Body', 'Dendrites', 'Axon', 'Synaptic Terminals']
        },
        {
          name: 'Virus Structure',
          parts: ['Capsid', 'Genetic Material', 'Envelope', 'Spike Proteins']
        }
      ];
      
      for (const cell of cells3D) {
        const cellButton = page.locator(`button:has-text("${cell.name}")`).first();
        if (await cellButton.isVisible()) {
          await clickWithScreenshot(page, cellButton, `stem3d-bio-${cell.name.toLowerCase().replace(/ /g, '-')}`);
          await waitForAnimation(page);
          await page.waitForTimeout(2000); // Let 3D model load
          
          // Test cross-section view
          const crossSectionButton = page.locator('button:has-text("Cross Section"), button[aria-label*="slice"]').first();
          if (await crossSectionButton.isVisible()) {
            await clickWithScreenshot(page, crossSectionButton, `stem3d-bio-${cell.name.toLowerCase().replace(/ /g, '-')}-cross-section`);
            
            // Test slice controls
            const sliceSlider = page.locator('input[type="range"][aria-label*="slice"]').first();
            if (await sliceSlider.isVisible()) {
              const box = await sliceSlider.boundingBox();
              if (box) {
                await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
                await takeScreenshot(page, `stem3d-bio-${cell.name.toLowerCase().replace(/ /g, '-')}-slice-30`);
                await page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2);
                await takeScreenshot(page, `stem3d-bio-${cell.name.toLowerCase().replace(/ /g, '-')}-slice-70`);
              }
            }
          }
          
          // Test organelle highlighting
          const parts = cell.organelles || cell.parts || [];
          for (const part of parts) {
            const partLabel = page.locator(`.annotation:has-text("${part}"), [data-label="${part}"]`).first();
            if (await partLabel.isVisible()) {
              await testHoverState(page, partLabel, `stem3d-bio-${cell.name.toLowerCase().replace(/ /g, '-')}-${part.toLowerCase().replace(/ /g, '-')}`);
              await partLabel.click();
              await takeScreenshot(page, `stem3d-bio-${cell.name.toLowerCase().replace(/ /g, '-')}-${part.toLowerCase().replace(/ /g, '-')}-selected`);
            }
          }
        }
      }
    });

    // Test 5: Mathematics - 3D Surfaces
    await test.step('3D Mathematics surfaces', async () => {
      const mathButton = page.locator('button:has-text("Mathematics"), [data-domain="mathematics"]').first();
      await clickWithScreenshot(page, mathButton, 'stem3d-mathematics-section');
      
      // Test 3D mathematical surfaces
      const surfaces = [
        { name: 'Saddle Point', equation: 'z = x² - y²' },
        { name: 'Paraboloid', equation: 'z = x² + y²' },
        { name: 'Torus', parametric: true },
        { name: 'Klein Bottle', parametric: true },
        { name: 'Möbius Strip', parametric: true }
      ];
      
      for (const surface of surfaces) {
        const surfaceButton = page.locator(`button:has-text("${surface.name}")`).first();
        if (await surfaceButton.isVisible()) {
          await clickWithScreenshot(page, surfaceButton, `stem3d-math-${surface.name.toLowerCase().replace(/ /g, '-')}`);
          await waitForAnimation(page);
          await page.waitForTimeout(1500);
          
          // Test wireframe toggle
          const wireframeToggle = page.locator('button:has-text("Wireframe"), input[name="wireframe"]').first();
          if (await wireframeToggle.isVisible()) {
            await clickWithScreenshot(page, wireframeToggle, `stem3d-math-${surface.name.toLowerCase().replace(/ /g, '-')}-wireframe`);
          }
          
          // Test mesh density
          const meshSlider = page.locator('input[aria-label*="mesh density"]').first();
          if (await meshSlider.isVisible()) {
            await meshSlider.fill('50');
            await takeScreenshot(page, `stem3d-math-${surface.name.toLowerCase().replace(/ /g, '-')}-mesh-dense`);
          }
        }
      }
      
      // Test custom 3D equation input
      const customButton = page.locator('button:has-text("Custom Surface")').first();
      if (await customButton.isVisible()) {
        await clickWithScreenshot(page, customButton, 'stem3d-math-custom-surface');
        
        const equationInput = page.locator('input[placeholder*="z ="], textarea[placeholder*="equation"]').first();
        if (await equationInput.isVisible()) {
          await equationInput.fill('sin(sqrt(x^2 + y^2)) / sqrt(x^2 + y^2)');
          await takeScreenshot(page, 'stem3d-math-custom-equation');
          
          const plotButton = page.locator('button:has-text("Plot")').first();
          await clickWithScreenshot(page, plotButton, 'stem3d-math-custom-plot');
          await waitForAnimation(page);
          await page.waitForTimeout(2000);
          await takeScreenshot(page, 'stem3d-math-custom-result');
        }
      }
    });

    // Test 6: Engineering - 3D Models
    await test.step('3D Engineering models', async () => {
      const engButton = page.locator('button:has-text("Engineering"), [data-domain="engineering"]').first();
      if (await engButton.isVisible()) {
        await clickWithScreenshot(page, engButton, 'stem3d-engineering-section');
        
        // Test engineering visualizations
        const models = [
          { name: 'Gear System', interactive: true },
          { name: 'Bridge Structure', stressTest: true },
          { name: 'Engine Components', exploded: true },
          { name: 'Circuit Board', layers: true }
        ];
        
        for (const model of models) {
          const modelButton = page.locator(`button:has-text("${model.name}")`).first();
          if (await modelButton.isVisible()) {
            await clickWithScreenshot(page, modelButton, `stem3d-eng-${model.name.toLowerCase().replace(/ /g, '-')}`);
            await waitForAnimation(page);
            await page.waitForTimeout(2000);
            
            if (model.interactive) {
              // Test gear interaction
              const speedSlider = page.locator('input[aria-label*="speed"]').first();
              if (await speedSlider.isVisible()) {
                await speedSlider.fill('100');
                await takeScreenshot(page, `stem3d-eng-${model.name.toLowerCase().replace(/ /g, '-')}-fast`);
              }
            }
            
            if (model.stressTest) {
              // Test stress visualization
              const stressButton = page.locator('button:has-text("Show Stress")').first();
              if (await stressButton.isVisible()) {
                await clickWithScreenshot(page, stressButton, `stem3d-eng-${model.name.toLowerCase().replace(/ /g, '-')}-stress`);
              }
            }
            
            if (model.exploded) {
              // Test exploded view
              const explodeButton = page.locator('button:has-text("Explode View")').first();
              if (await explodeButton.isVisible()) {
                await clickWithScreenshot(page, explodeButton, `stem3d-eng-${model.name.toLowerCase().replace(/ /g, '-')}-exploded`);
              }
            }
          }
        }
      }
    });

    // Test 7: Astronomy - 3D Space
    await test.step('3D Astronomy visualizations', async () => {
      const astroButton = page.locator('button:has-text("Astronomy"), [data-domain="astronomy"]').first();
      if (await astroButton.isVisible()) {
        await clickWithScreenshot(page, astroButton, 'stem3d-astronomy-section');
        
        // Test space visualizations
        const celestialObjects = [
          { name: 'Solar System', scale: true },
          { name: 'Galaxy Formation', time: true },
          { name: 'Black Hole', relativity: true },
          { name: 'Exoplanet System', habitable: true }
        ];
        
        for (const obj of celestialObjects) {
          const objButton = page.locator(`button:has-text("${obj.name}")`).first();
          if (await objButton.isVisible()) {
            await clickWithScreenshot(page, objButton, `stem3d-astro-${obj.name.toLowerCase().replace(/ /g, '-')}`);
            await waitForAnimation(page);
            await page.waitForTimeout(2000);
            
            if (obj.scale) {
              // Test scale controls
              const scaleButton = page.locator('button:has-text("Realistic Scale")').first();
              if (await scaleButton.isVisible()) {
                await clickWithScreenshot(page, scaleButton, `stem3d-astro-${obj.name.toLowerCase().replace(/ /g, '-')}-realistic`);
              }
            }
            
            if (obj.time) {
              // Test time controls
              const timeSlider = page.locator('input[aria-label*="time"]').first();
              if (await timeSlider.isVisible()) {
                await timeSlider.fill('75');
                await takeScreenshot(page, `stem3d-astro-${obj.name.toLowerCase().replace(/ /g, '-')}-time-75`);
              }
            }
          }
        }
      }
    });

    // Test 8: Advanced Annotation System
    await test.step('3D Advanced annotations', async () => {
      // Test LaTeX formulas in 3D
      const formulaButton = page.locator('button:has-text("Show Formulas")').first();
      if (await formulaButton.isVisible()) {
        await clickWithScreenshot(page, formulaButton, 'stem3d-formulas-enabled');
        
        // Check for rendered LaTeX
        const katexElements = await page.locator('.katex').all();
        if (katexElements.length > 0) {
          await takeScreenshot(page, 'stem3d-latex-formulas');
        }
      }
      
      // Test annotation occlusion
      const occlusionToggle = page.locator('button:has-text("Smart Occlusion"), input[name="occlusion"]').first();
      if (await occlusionToggle.isVisible()) {
        await clickWithScreenshot(page, occlusionToggle, 'stem3d-annotation-occlusion');
      }
      
      // Test annotation levels in 3D
      const levels = ['Beginner', 'Intermediate', 'Expert'];
      for (const level of levels) {
        const levelButton = page.locator(`button:has-text("${level} Level")`).first();
        if (await levelButton.isVisible()) {
          await clickWithScreenshot(page, levelButton, `stem3d-annotation-level-${level.toLowerCase()}`);
          await waitForAnimation(page);
        }
      }
    });

    // Test 9: 3D Controls and Camera
    await test.step('3D camera controls', async () => {
      // Test preset camera views
      const views = ['Front', 'Top', 'Side', 'Isometric'];
      for (const view of views) {
        const viewButton = page.locator(`button:has-text("${view} View")`).first();
        if (await viewButton.isVisible()) {
          await clickWithScreenshot(page, viewButton, `stem3d-camera-${view.toLowerCase()}`);
          await waitForAnimation(page);
        }
      }
      
      // Test camera animation
      const animateButton = page.locator('button:has-text("Animate Camera"), button:has-text("Orbit")').first();
      if (await animateButton.isVisible()) {
        await clickWithScreenshot(page, animateButton, 'stem3d-camera-animate-start');
        await page.waitForTimeout(3000);
        await takeScreenshot(page, 'stem3d-camera-animating');
        await animateButton.click(); // Stop animation
      }
    });

    // Test 10: Genesis Physics Integration
    await test.step('Genesis physics integration', async () => {
      // Check Genesis connection
      const genesisIndicator = page.locator('.genesis-indicator, [data-testid="genesis-status"]').first();
      if (await genesisIndicator.isVisible()) {
        const isConnected = await genesisIndicator.textContent();
        if (isConnected?.includes('Connected')) {
          await takeScreenshot(page, 'stem3d-genesis-connected');
          
          // Test physics commands
          const commandButtons = ['Reset Physics', 'Pause Physics', 'Step Physics'];
          for (const command of commandButtons) {
            const cmdButton = page.locator(`button:has-text("${command}")`).first();
            if (await cmdButton.isVisible()) {
              await clickWithScreenshot(page, cmdButton, `stem3d-genesis-${command.toLowerCase().replace(/ /g, '-')}`);
            }
          }
        } else {
          await takeScreenshot(page, 'stem3d-genesis-disconnected');
        }
      }
    });

    // Test 11: Performance with complex 3D scenes
    await test.step('3D Performance test', async () => {
      // Load a complex scene
      const complexButton = page.locator('button:has-text("Protein Folding"), button:has-text("Complex Scene")').first();
      if (await complexButton.isVisible()) {
        await clickWithScreenshot(page, complexButton, 'stem3d-performance-complex-load');
        await waitForAnimation(page);
        await page.waitForTimeout(3000); // Let scene fully load
        
        // Check FPS indicator
        const fpsIndicator = page.locator('.fps-counter, [data-testid="fps"]').first();
        if (await fpsIndicator.isVisible()) {
          await takeScreenshot(page, 'stem3d-performance-fps');
        }
        
        // Test LOD (Level of Detail)
        const lodButton = page.locator('button:has-text("LOD"), button:has-text("Quality")').first();
        if (await lodButton.isVisible()) {
          await clickWithScreenshot(page, lodButton, 'stem3d-performance-lod');
        }
      }
    });

    // Test 12: Responsive 3D visualization
    await test.step('Responsive 3D design', async () => {
      await testResponsive(page, 'stem3d-responsive');
    });

    console.log('✅ 3D STEM visualization tests completed');
  });

  // Helper function to test 3D controls
  async function test3DControls(page: any, prefix: string) {
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    
    if (box) {
      // Test rotation
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2);
      await page.mouse.up();
      await takeScreenshot(page, `${prefix}-rotated`);
      
      // Test zoom
      await page.mouse.wheel(0, -200);
      await takeScreenshot(page, `${prefix}-zoomed-in`);
      
      await page.mouse.wheel(0, 400);
      await takeScreenshot(page, `${prefix}-zoomed-out`);
      
      // Test pan (right-click drag)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down({ button: 'right' });
      await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
      await page.mouse.up({ button: 'right' });
      await takeScreenshot(page, `${prefix}-panned`);
    }
  }

  // Helper function to test molecule interaction
  async function testMoleculeInteraction(page: any, moleculeName: string) {
    // Test atom selection
    const atom = page.locator('.atom, [data-testid="atom"]').first();
    if (await atom.isVisible()) {
      await atom.click();
      await takeScreenshot(page, `stem3d-molecule-${moleculeName.toLowerCase().replace(/ /g, '-')}-atom-selected`);
      
      // Check for atom info panel
      const atomInfo = page.locator('.atom-info, [data-testid="atom-info"]').first();
      if (await atomInfo.isVisible()) {
        await takeScreenshot(page, `stem3d-molecule-${moleculeName.toLowerCase().replace(/ /g, '-')}-atom-info`);
      }
    }
    
    // Test bond highlighting
    const bond = page.locator('.bond, [data-testid="bond"]').first();
    if (await bond.isVisible()) {
      await bond.hover();
      await takeScreenshot(page, `stem3d-molecule-${moleculeName.toLowerCase().replace(/ /g, '-')}-bond-highlight`);
    }
  }

  test('Test 3D file import and export', async ({ page }) => {
    await test.step('Import 3D models', async () => {
      const importButton = page.locator('button:has-text("Import 3D")').first();
      if (await importButton.isVisible()) {
        await clickWithScreenshot(page, importButton, 'stem3d-import-dialog');
        
        // Test supported formats
        const formats = ['OBJ', 'STL', 'PDB', 'GLTF'];
        for (const format of formats) {
          const formatOption = page.locator(`[data-format="${format}"]`).first();
          if (await formatOption.isVisible()) {
            await takeScreenshot(page, `stem3d-import-format-${format.toLowerCase()}`);
          }
        }
      }
    });
    
    await test.step('Export 3D scenes', async () => {
      const exportButton = page.locator('button:has-text("Export 3D")').first();
      if (await exportButton.isVisible()) {
        await clickWithScreenshot(page, exportButton, 'stem3d-export-options');
        
        // Test export formats
        const exportFormats = ['GLTF', 'OBJ', 'STL', 'Screenshot', '360° Video'];
        for (const format of exportFormats) {
          const formatButton = page.locator(`button:has-text("${format}")`).first();
          if (await formatButton.isVisible()) {
            await testHoverState(page, formatButton, `stem3d-export-${format.toLowerCase().replace(/[° ]/g, '-')}`);
          }
        }
      }
    });
  });

  test('Test WebSocket connection to Genesis', async ({ page }) => {
    await test.step('Monitor WebSocket connection', async () => {
      // Open network tab equivalent
      const networkButton = page.locator('button:has-text("Network"), button:has-text("Debug")').first();
      if (await networkButton.isVisible()) {
        await clickWithScreenshot(page, networkButton, 'stem3d-network-debug');
        
        // Look for WebSocket status
        const wsStatus = page.locator('.websocket-status, [data-testid="ws-status"]').first();
        if (await wsStatus.isVisible()) {
          await takeScreenshot(page, 'stem3d-websocket-status');
        }
      }
      
      // Test reconnection
      const reconnectButton = page.locator('button:has-text("Reconnect")').first();
      if (await reconnectButton.isVisible()) {
        await clickWithScreenshot(page, reconnectButton, 'stem3d-websocket-reconnect');
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'stem3d-websocket-reconnected');
      }
    });
  });
});