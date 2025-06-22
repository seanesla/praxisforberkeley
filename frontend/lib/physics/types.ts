export interface Vector2D {
  x: number;
  y: number;
}

export interface PhysicsBody {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  mass: number;
  radius: number;
  fixed: boolean;
  damping: number;
  charge?: number;
  metadata?: any;
}

export interface Spring {
  id: string;
  bodyA: string;
  bodyB: string;
  restLength: number;
  stiffness: number;
  damping: number;
}

export interface Force {
  type: 'gravity' | 'spring' | 'repulsion' | 'attraction' | 'drag' | 'custom';
  calculate: (body: PhysicsBody, bodies: PhysicsBody[], springs?: Spring[]) => Vector2D;
}

export interface PhysicsConfig {
  gravity: Vector2D;
  globalDamping: number;
  collisionEnabled: boolean;
  bounds?: {
    min: Vector2D;
    max: Vector2D;
  };
  timeStep: number;
  maxVelocity: number;
  minDistance: number;
  integrator: 'verlet' | 'euler' | 'rk4';
}

export interface CollisionResult {
  bodyA: PhysicsBody;
  bodyB: PhysicsBody;
  normal: Vector2D;
  depth: number;
  point: Vector2D;
}

export interface SpatialHashCell {
  bodies: Set<string>;
}

export interface PhysicsState {
  bodies: Map<string, PhysicsBody>;
  springs: Map<string, Spring>;
  forces: Force[];
  config: PhysicsConfig;
  time: number;
  paused: boolean;
}

export interface PhysicsMetrics {
  fps: number;
  bodyCount: number;
  springCount: number;
  collisionChecks: number;
  totalEnergy: number;
  computeTime: number;
}