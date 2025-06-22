import { Vector2D, PhysicsBody, Spring, Force } from './types';
import { PHYSICS_CONSTANTS } from './constants';

// Vector math utilities
export const vec2 = {
  add: (a: Vector2D, b: Vector2D): Vector2D => ({ x: a.x + b.x, y: a.y + b.y }),
  subtract: (a: Vector2D, b: Vector2D): Vector2D => ({ x: a.x - b.x, y: a.y - b.y }),
  multiply: (v: Vector2D, scalar: number): Vector2D => ({ x: v.x * scalar, y: v.y * scalar }),
  divide: (v: Vector2D, scalar: number): Vector2D => ({ x: v.x / scalar, y: v.y / scalar }),
  magnitude: (v: Vector2D): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vector2D): Vector2D => {
    const mag = vec2.magnitude(v);
    return mag > 0 ? vec2.divide(v, mag) : { x: 0, y: 0 };
  },
  distance: (a: Vector2D, b: Vector2D): number => vec2.magnitude(vec2.subtract(b, a)),
  dot: (a: Vector2D, b: Vector2D): number => a.x * b.x + a.y * b.y,
  limit: (v: Vector2D, max: number): Vector2D => {
    const mag = vec2.magnitude(v);
    return mag > max ? vec2.multiply(vec2.normalize(v), max) : v;
  },
};

// Force generators
export const Forces = {
  // Constant downward gravity
  gravity: (g: Vector2D): Force => ({
    type: 'gravity',
    calculate: (body: PhysicsBody) => {
      if (body.fixed) return { x: 0, y: 0 };
      return vec2.multiply(g, body.mass);
    },
  }),

  // Spring force between connected bodies
  spring: (springs: Spring[]): Force => ({
    type: 'spring',
    calculate: (body: PhysicsBody, bodies: PhysicsBody[]) => {
      if (body.fixed) return { x: 0, y: 0 };
      
      let totalForce = { x: 0, y: 0 };
      const bodyMap = new Map(bodies.map(b => [b.id, b]));
      
      for (const spring of springs) {
        let otherBody: PhysicsBody | undefined;
        let isBodyA = false;
        
        if (spring.bodyA === body.id) {
          otherBody = bodyMap.get(spring.bodyB);
          isBodyA = true;
        } else if (spring.bodyB === body.id) {
          otherBody = bodyMap.get(spring.bodyA);
        }
        
        if (!otherBody) continue;
        
        const delta = vec2.subtract(otherBody.position, body.position);
        const distance = vec2.magnitude(delta);
        
        if (distance < PHYSICS_CONSTANTS.MIN_DISTANCE) continue;
        
        const displacement = distance - spring.restLength;
        const springForce = displacement * spring.stiffness;
        
        const direction = vec2.normalize(delta);
        const force = vec2.multiply(direction, springForce);
        
        // Add damping
        const relativeVelocity = vec2.subtract(otherBody.velocity, body.velocity);
        const dampingForce = vec2.multiply(relativeVelocity, spring.damping);
        
        totalForce = vec2.add(totalForce, vec2.add(force, dampingForce));
      }
      
      return totalForce;
    },
  }),

  // Coulomb repulsion (for node separation)
  repulsion: (strength: number = 1000): Force => ({
    type: 'repulsion',
    calculate: (body: PhysicsBody, bodies: PhysicsBody[]) => {
      if (body.fixed) return { x: 0, y: 0 };
      
      let totalForce = { x: 0, y: 0 };
      
      for (const other of bodies) {
        if (other.id === body.id) continue;
        
        const delta = vec2.subtract(body.position, other.position);
        const distance = vec2.magnitude(delta);
        
        if (distance < PHYSICS_CONSTANTS.MIN_DISTANCE) continue;
        
        const charge1 = body.charge ?? 1;
        const charge2 = other.charge ?? 1;
        
        // F = k * q1 * q2 / r^2
        const forceMagnitude = strength * charge1 * charge2 / (distance * distance);
        const force = vec2.multiply(vec2.normalize(delta), forceMagnitude);
        
        totalForce = vec2.add(totalForce, force);
      }
      
      return totalForce;
    },
  }),

  // Gravitational attraction between bodies
  nbodyGravity: (G: number = 1): Force => ({
    type: 'attraction',
    calculate: (body: PhysicsBody, bodies: PhysicsBody[]) => {
      if (body.fixed) return { x: 0, y: 0 };
      
      let totalForce = { x: 0, y: 0 };
      
      for (const other of bodies) {
        if (other.id === body.id) continue;
        
        const delta = vec2.subtract(other.position, body.position);
        const distance = vec2.magnitude(delta);
        
        if (distance < PHYSICS_CONSTANTS.MIN_DISTANCE) continue;
        
        // F = G * m1 * m2 / r^2
        const forceMagnitude = G * body.mass * other.mass / (distance * distance);
        const force = vec2.multiply(vec2.normalize(delta), forceMagnitude);
        
        totalForce = vec2.add(totalForce, force);
      }
      
      return totalForce;
    },
  }),

  // Drag force (air resistance)
  drag: (coefficient: number = 0.01): Force => ({
    type: 'drag',
    calculate: (body: PhysicsBody) => {
      if (body.fixed) return { x: 0, y: 0 };
      
      const speed = vec2.magnitude(body.velocity);
      if (speed < PHYSICS_CONSTANTS.MIN_DISTANCE) return { x: 0, y: 0 };
      
      // F = -c * v^2 * v̂
      const dragMagnitude = coefficient * speed * speed;
      return vec2.multiply(vec2.normalize(body.velocity), -dragMagnitude);
    },
  }),

  // Center attraction (pulls bodies toward a point)
  centerAttraction: (center: Vector2D, strength: number = 0.1): Force => ({
    type: 'attraction',
    calculate: (body: PhysicsBody) => {
      if (body.fixed) return { x: 0, y: 0 };
      
      const delta = vec2.subtract(center, body.position);
      const distance = vec2.magnitude(delta);
      
      if (distance < PHYSICS_CONSTANTS.MIN_DISTANCE) return { x: 0, y: 0 };
      
      return vec2.multiply(vec2.normalize(delta), strength * distance);
    },
  }),

  // Custom force function
  custom: (fn: (body: PhysicsBody, bodies: PhysicsBody[]) => Vector2D): Force => ({
    type: 'custom',
    calculate: fn,
  }),
};