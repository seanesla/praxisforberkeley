import { SimpleBody, SimpleVector2D, SimplePhysicsConfig, DEFAULT_SIMPLE_CONFIG } from './types';

export class SimplePhysicsEngine {
  private bodies: Map<string, SimpleBody> = new Map();
  private config: SimplePhysicsConfig;
  private time: number = 0;
  private running: boolean = false;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;

  constructor(config: Partial<SimplePhysicsConfig> = {}) {
    this.config = { ...DEFAULT_SIMPLE_CONFIG, ...config };
    console.log('SimplePhysicsEngine initialized with config:', this.config);
  }

  // Body management
  addBody(body: SimpleBody): void {
    console.log('Adding body:', body.id);
    this.bodies.set(body.id, body);
  }

  removeBody(id: string): void {
    console.log('Removing body:', id);
    this.bodies.delete(id);
  }

  getBody(id: string): SimpleBody | undefined {
    return this.bodies.get(id);
  }

  getBodies(): SimpleBody[] {
    return Array.from(this.bodies.values());
  }

  clearBodies(): void {
    console.log('Clearing all bodies');
    this.bodies.clear();
  }

  // Physics update
  update(deltaTime?: number): void {
    const dt = deltaTime || this.config.timestep;
    
    // Update each body
    this.bodies.forEach(body => {
      // Apply gravity
      body.acceleration = {
        x: this.config.gravity.x,
        y: this.config.gravity.y
      };

      // Update velocity (v = v + a * dt)
      body.velocity.x += body.acceleration.x * dt;
      body.velocity.y += body.acceleration.y * dt;

      // Apply drag
      body.velocity.x *= this.config.drag;
      body.velocity.y *= this.config.drag;

      // Update position (p = p + v * dt)
      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;

      // Apply bounds (bounce off walls)
      if (this.config.bounds) {
        const { width, height } = this.config.bounds;
        
        // Left/right walls
        if (body.position.x - body.radius < 0) {
          body.position.x = body.radius;
          body.velocity.x = Math.abs(body.velocity.x) * 0.8; // Bounce with energy loss
        } else if (body.position.x + body.radius > width) {
          body.position.x = width - body.radius;
          body.velocity.x = -Math.abs(body.velocity.x) * 0.8;
        }

        // Top/bottom walls
        if (body.position.y - body.radius < 0) {
          body.position.y = body.radius;
          body.velocity.y = Math.abs(body.velocity.y) * 0.8;
        } else if (body.position.y + body.radius > height) {
          body.position.y = height - body.radius;
          body.velocity.y = -Math.abs(body.velocity.y) * 0.8;
        }
      }
    });

    this.time += dt;
  }

  // Animation control
  start(): void {
    if (this.running) return;
    
    console.log('Starting physics simulation');
    this.running = true;
    this.lastFrameTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (!this.running) return;

      const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
      this.lastFrameTime = currentTime;

      this.update(deltaTime);
      
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stop(): void {
    console.log('Stopping physics simulation');
    this.running = false;
    
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  // Configuration
  setGravity(gravity: SimpleVector2D): void {
    console.log('Setting gravity:', gravity);
    this.config.gravity = gravity;
  }

  setDrag(drag: number): void {
    console.log('Setting drag:', drag);
    this.config.drag = Math.max(0, Math.min(1, drag)); // Clamp between 0 and 1
  }

  setBounds(width: number, height: number): void {
    console.log('Setting bounds:', width, height);
    this.config.bounds = { width, height };
  }

  getConfig(): SimplePhysicsConfig {
    return { ...this.config };
  }

  // Utility
  reset(): void {
    console.log('Resetting physics engine');
    this.stop();
    this.bodies.clear();
    this.time = 0;
  }

  getTime(): number {
    return this.time;
  }

  // Helper to create a random body
  static createRandomBody(bounds: { width: number; height: number }): SimpleBody {
    return {
      id: `body-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: Math.random() * bounds.width,
        y: Math.random() * bounds.height * 0.5 // Start in upper half
      },
      velocity: {
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200
      },
      acceleration: { x: 0, y: 0 },
      mass: 1,
      radius: 5 + Math.random() * 15,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };
  }
}

// Vector utility functions
export const vec2 = {
  add: (a: SimpleVector2D, b: SimpleVector2D): SimpleVector2D => ({
    x: a.x + b.x,
    y: a.y + b.y
  }),
  
  subtract: (a: SimpleVector2D, b: SimpleVector2D): SimpleVector2D => ({
    x: a.x - b.x,
    y: a.y - b.y
  }),
  
  multiply: (v: SimpleVector2D, scalar: number): SimpleVector2D => ({
    x: v.x * scalar,
    y: v.y * scalar
  }),
  
  magnitude: (v: SimpleVector2D): number => 
    Math.sqrt(v.x * v.x + v.y * v.y),
  
  normalize: (v: SimpleVector2D): SimpleVector2D => {
    const mag = vec2.magnitude(v);
    return mag > 0 ? vec2.multiply(v, 1 / mag) : { x: 0, y: 0 };
  }
};