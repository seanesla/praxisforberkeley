import { PhysicsConfig } from './types';

export const PHYSICS_CONSTANTS = {
  GRAVITATIONAL_CONSTANT: 6.67430e-11,
  COULOMB_CONSTANT: 8.9875517923e9,
  DEFAULT_MASS: 1,
  DEFAULT_RADIUS: 20,
  DEFAULT_DAMPING: 0.01,
  MIN_DISTANCE: 0.1,
  MAX_VELOCITY: 1000,
  COLLISION_RESTITUTION: 0.8,
  SPATIAL_HASH_CELL_SIZE: 100,
} as const;

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: { x: 0, y: 0 },
  globalDamping: 0.99,
  collisionEnabled: true,
  timeStep: 0.016, // 60 FPS
  maxVelocity: PHYSICS_CONSTANTS.MAX_VELOCITY,
  minDistance: PHYSICS_CONSTANTS.MIN_DISTANCE,
  integrator: 'verlet',
};

export const PHYSICS_PRESETS = {
  forceDirected: {
    ...DEFAULT_PHYSICS_CONFIG,
    globalDamping: 0.9,
  },
  gravity: {
    ...DEFAULT_PHYSICS_CONFIG,
    gravity: { x: 0, y: 300 },
    globalDamping: 0.99,
  },
  space: {
    ...DEFAULT_PHYSICS_CONFIG,
    gravity: { x: 0, y: 0 },
    globalDamping: 1,
    collisionEnabled: true,
  },
  molecular: {
    ...DEFAULT_PHYSICS_CONFIG,
    globalDamping: 0.95,
    minDistance: 30,
  },
  network: {
    ...DEFAULT_PHYSICS_CONFIG,
    globalDamping: 0.85,
    collisionEnabled: false,
  },
} as const;