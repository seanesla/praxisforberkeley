import {
  PhysicsBody,
  PhysicsState,
  PhysicsConfig,
  Spring,
  Force,
  Vector2D,
  PhysicsMetrics,
} from './types';
import { DEFAULT_PHYSICS_CONFIG, PHYSICS_CONSTANTS } from './constants';
import { vec2 } from './forces';
import { CollisionDetector, CollisionResolver, SpatialHash } from './collision';
import { createIntegrator } from './integrators';

export class PhysicsEngine {
  private state: PhysicsState;
  private spatialHash: SpatialHash;
  private integrator: ReturnType<typeof createIntegrator>;
  private previousPositions: Map<string, Vector2D>;
  private metrics: PhysicsMetrics;
  private lastUpdateTime: number;
  
  constructor(config: Partial<PhysicsConfig> = {}) {
    this.state = {
      bodies: new Map(),
      springs: new Map(),
      forces: [],
      config: { ...DEFAULT_PHYSICS_CONFIG, ...config },
      time: 0,
      paused: false,
    };
    
    this.spatialHash = new SpatialHash();
    this.integrator = createIntegrator(this.state.config.integrator);
    this.previousPositions = new Map();
    this.lastUpdateTime = 0;
    
    this.metrics = {
      fps: 0,
      bodyCount: 0,
      springCount: 0,
      collisionChecks: 0,
      totalEnergy: 0,
      computeTime: 0,
    };
  }
  
  // Body management
  addBody(body: PhysicsBody): void {
    this.state.bodies.set(body.id, body);
    this.previousPositions.set(body.id, body.position);
  }
  
  removeBody(id: string): void {
    this.state.bodies.delete(id);
    this.previousPositions.delete(id);
    
    // Remove associated springs
    const springsToRemove: string[] = [];
    this.state.springs.forEach((spring, springId) => {
      if (spring.bodyA === id || spring.bodyB === id) {
        springsToRemove.push(springId);
      }
    });
    springsToRemove.forEach(springId => this.state.springs.delete(springId));
  }
  
  updateBody(id: string, updates: Partial<PhysicsBody>): void {
    const body = this.state.bodies.get(id);
    if (body) {
      Object.assign(body, updates);
    }
  }
  
  getBody(id: string): PhysicsBody | undefined {
    return this.state.bodies.get(id);
  }
  
  getBodies(): PhysicsBody[] {
    return Array.from(this.state.bodies.values());
  }
  
  // Spring management
  addSpring(spring: Spring): void {
    this.state.springs.set(spring.id, spring);
  }
  
  removeSpring(id: string): void {
    this.state.springs.delete(id);
  }
  
  // Force management
  addForce(force: Force): void {
    this.state.forces.push(force);
  }
  
  clearForces(): void {
    this.state.forces = [];
  }
  
  // Configuration
  updateConfig(config: Partial<PhysicsConfig>): void {
    Object.assign(this.state.config, config);
    
    if (config.integrator) {
      this.integrator = createIntegrator(config.integrator);
    }
  }
  
  // State management
  pause(): void {
    this.state.paused = true;
  }
  
  resume(): void {
    this.state.paused = false;
  }
  
  isPaused(): boolean {
    return this.state.paused;
  }
  
  reset(): void {
    this.state.bodies.clear();
    this.state.springs.clear();
    this.state.forces = [];
    this.state.time = 0;
    this.previousPositions.clear();
  }
  
  // Main physics update
  update(deltaTime?: number): void {
    if (this.state.paused) return;
    
    const startTime = performance.now();
    const dt = deltaTime || this.state.config.timeStep;
    const bodies = Array.from(this.state.bodies.values());
    const springs = Array.from(this.state.springs.values());
    
    // Update metrics
    this.metrics.bodyCount = bodies.length;
    this.metrics.springCount = springs.length;
    this.metrics.collisionChecks = 0;
    
    // Apply forces and integrate
    bodies.forEach(body => {
      if (body.fixed) return;
      
      // Calculate total force on body
      let totalForce: Vector2D = { x: 0, y: 0 };
      
      for (const force of this.state.forces) {
        const f = force.calculate(body, bodies, springs);
        totalForce = vec2.add(totalForce, f);
      }
      
      // Apply global damping
      body.velocity = vec2.multiply(body.velocity, this.state.config.globalDamping);
      
      // Integrate motion
      const previousPos = this.previousPositions.get(body.id);
      const result = this.integrator.integrate(body, totalForce, dt, previousPos);
      
      // Update body state
      body.position = result.position;
      body.velocity = vec2.limit(result.velocity, this.state.config.maxVelocity);
      body.acceleration = vec2.divide(totalForce, body.mass);
      
      // Store previous position for Verlet
      if (result.previousPosition) {
        this.previousPositions.set(body.id, result.previousPosition);
      }
    });
    
    // Handle collisions
    if (this.state.config.collisionEnabled) {
      this.handleCollisions(bodies);
    }
    
    // Apply bounds
    if (this.state.config.bounds) {
      this.applyBounds(bodies);
    }
    
    // Update time
    this.state.time += dt;
    
    // Update metrics
    const endTime = performance.now();
    this.metrics.computeTime = endTime - startTime;
    this.metrics.totalEnergy = this.calculateTotalEnergy(bodies);
    
    if (this.lastUpdateTime > 0) {
      this.metrics.fps = 1000 / (endTime - this.lastUpdateTime);
    }
    this.lastUpdateTime = endTime;
  }
  
  private handleCollisions(bodies: PhysicsBody[]): void {
    // Build spatial hash
    this.spatialHash.clear();
    bodies.forEach(body => this.spatialHash.insert(body));
    
    // Check collisions
    const checked = new Set<string>();
    
    bodies.forEach(bodyA => {
      const potential = this.spatialHash.getPotentialCollisions(bodyA);
      
      potential.forEach(bodyBId => {
        const pairKey = [bodyA.id, bodyBId].sort().join('-');
        if (checked.has(pairKey)) return;
        checked.add(pairKey);
        
        const bodyB = this.state.bodies.get(bodyBId);
        if (!bodyB) return;
        
        const collision = CollisionDetector.circleCircle(bodyA, bodyB);
        if (collision) {
          CollisionResolver.resolveCollision(collision);
          this.metrics.collisionChecks++;
        }
      });
    });
  }
  
  private applyBounds(bodies: PhysicsBody[]): void {
    if (!this.state.config.bounds) return;
    
    const { min, max } = this.state.config.bounds;
    
    bodies.forEach(body => {
      const collisions = CollisionDetector.circleBounds(body, min, max);
      collisions.forEach(collision => {
        CollisionResolver.resolveCollision(collision);
      });
    });
  }
  
  private calculateTotalEnergy(bodies: PhysicsBody[]): number {
    return bodies.reduce((total, body) => {
      if (body.fixed) return total;
      
      // Kinetic energy: 1/2 * m * v^2
      const speed = vec2.magnitude(body.velocity);
      const kinetic = 0.5 * body.mass * speed * speed;
      
      // Potential energy (simplified - just gravity)
      const potential = body.mass * Math.abs(this.state.config.gravity.y) * body.position.y;
      
      return total + kinetic + potential;
    }, 0);
  }
  
  // Getters
  getMetrics(): PhysicsMetrics {
    return { ...this.metrics };
  }
  
  getConfig(): PhysicsConfig {
    return { ...this.state.config };
  }
  
  getTime(): number {
    return this.state.time;
  }
  
  // Utility methods
  applyImpulse(bodyId: string, impulse: Vector2D): void {
    const body = this.state.bodies.get(bodyId);
    if (body && !body.fixed) {
      body.velocity = vec2.add(body.velocity, vec2.divide(impulse, body.mass));
    }
  }
  
  setPosition(bodyId: string, position: Vector2D): void {
    const body = this.state.bodies.get(bodyId);
    if (body) {
      body.position = position;
      this.previousPositions.set(bodyId, position);
    }
  }
  
  setVelocity(bodyId: string, velocity: Vector2D): void {
    const body = this.state.bodies.get(bodyId);
    if (body && !body.fixed) {
      body.velocity = velocity;
    }
  }
}