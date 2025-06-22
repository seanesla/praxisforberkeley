import { describe, it, expect } from '@jest/globals';
import { vec2, Forces } from '../forces';
import { PhysicsBody } from '../types';

describe('Vector Math Utilities', () => {
  describe('vec2', () => {
    it('should add vectors correctly', () => {
      const a = { x: 1, y: 2 };
      const b = { x: 3, y: 4 };
      expect(vec2.add(a, b)).toEqual({ x: 4, y: 6 });
    });

    it('should subtract vectors correctly', () => {
      const a = { x: 5, y: 7 };
      const b = { x: 2, y: 3 };
      expect(vec2.subtract(a, b)).toEqual({ x: 3, y: 4 });
    });

    it('should multiply vector by scalar', () => {
      const v = { x: 2, y: 3 };
      expect(vec2.multiply(v, 2)).toEqual({ x: 4, y: 6 });
    });

    it('should calculate magnitude correctly', () => {
      const v = { x: 3, y: 4 };
      expect(vec2.magnitude(v)).toBe(5);
    });

    it('should normalize vectors correctly', () => {
      const v = { x: 3, y: 4 };
      const normalized = vec2.normalize(v);
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
    });

    it('should handle zero vector normalization', () => {
      const v = { x: 0, y: 0 };
      expect(vec2.normalize(v)).toEqual({ x: 0, y: 0 });
    });

    it('should calculate distance between points', () => {
      const a = { x: 1, y: 1 };
      const b = { x: 4, y: 5 };
      expect(vec2.distance(a, b)).toBe(5);
    });

    it('should limit vector magnitude', () => {
      const v = { x: 6, y: 8 };
      const limited = vec2.limit(v, 5);
      expect(vec2.magnitude(limited)).toBe(5);
    });
  });
});

describe('Force Generators', () => {
  const createTestBody = (id: string, x: number, y: number, mass: number = 1): PhysicsBody => ({
    id,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    mass,
    radius: 10,
    fixed: false,
    damping: 0,
  });

  describe('Gravity Force', () => {
    it('should apply constant downward force', () => {
      const gravity = Forces.gravity({ x: 0, y: 10 });
      const body = createTestBody('1', 0, 0, 2);
      
      const force = gravity.calculate(body, []);
      expect(force).toEqual({ x: 0, y: 20 }); // mass * gravity
    });

    it('should not apply force to fixed bodies', () => {
      const gravity = Forces.gravity({ x: 0, y: 10 });
      const body = { ...createTestBody('1', 0, 0), fixed: true };
      
      const force = gravity.calculate(body, []);
      expect(force).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Repulsion Force', () => {
    it('should repel bodies away from each other', () => {
      const repulsion = Forces.repulsion(100);
      const body1 = createTestBody('1', 0, 0);
      const body2 = createTestBody('2', 10, 0);
      
      const force = repulsion.calculate(body1, [body1, body2]);
      expect(force.x).toBeLessThan(0); // Pushed left (away from body2)
      expect(force.y).toBe(0);
    });

    it('should apply stronger force at closer distances', () => {
      const repulsion = Forces.repulsion(100);
      const body1 = createTestBody('1', 0, 0);
      const body2Close = createTestBody('2', 5, 0);
      const body3Far = createTestBody('3', 20, 0);
      
      const forceClose = repulsion.calculate(body1, [body1, body2Close]);
      const forceFar = repulsion.calculate(body1, [body1, body3Far]);
      
      expect(vec2.magnitude(forceClose)).toBeGreaterThan(vec2.magnitude(forceFar));
    });
  });

  describe('N-Body Gravity', () => {
    it('should attract bodies towards each other', () => {
      const nbodyGravity = Forces.nbodyGravity(1);
      const body1 = createTestBody('1', 0, 0, 10);
      const body2 = createTestBody('2', 10, 0, 10);
      
      const force = nbodyGravity.calculate(body1, [body1, body2]);
      expect(force.x).toBeGreaterThan(0); // Attracted right (towards body2)
      expect(force.y).toBe(0);
    });

    it('should apply force proportional to mass', () => {
      const nbodyGravity = Forces.nbodyGravity(1);
      const body1 = createTestBody('1', 0, 0, 1);
      const body2Light = createTestBody('2', 10, 0, 1);
      const body3Heavy = createTestBody('3', 10, 0, 10);
      
      const forceLight = nbodyGravity.calculate(body1, [body1, body2Light]);
      const forceHeavy = nbodyGravity.calculate(body1, [body1, body3Heavy]);
      
      expect(vec2.magnitude(forceHeavy)).toBeGreaterThan(vec2.magnitude(forceLight));
    });
  });

  describe('Drag Force', () => {
    it('should oppose motion', () => {
      const drag = Forces.drag(0.1);
      const body = createTestBody('1', 0, 0);
      body.velocity = { x: 10, y: 0 };
      
      const force = drag.calculate(body, []);
      expect(force.x).toBeLessThan(0); // Opposing velocity
      expect(force.y).toBe(0);
    });

    it('should scale with velocity squared', () => {
      const drag = Forces.drag(0.1);
      const body1 = { ...createTestBody('1', 0, 0), velocity: { x: 5, y: 0 } };
      const body2 = { ...createTestBody('2', 0, 0), velocity: { x: 10, y: 0 } };
      
      const force1 = drag.calculate(body1, []);
      const force2 = drag.calculate(body2, []);
      
      // Force should be 4x for 2x velocity (v^2 relationship)
      expect(Math.abs(force2.x)).toBeCloseTo(Math.abs(force1.x) * 4);
    });
  });

  describe('Center Attraction', () => {
    it('should pull bodies toward center point', () => {
      const center = { x: 10, y: 10 };
      const centerAttraction = Forces.centerAttraction(center, 0.1);
      const body = createTestBody('1', 0, 0);
      
      const force = centerAttraction.calculate(body, []);
      expect(force.x).toBeGreaterThan(0); // Pulled right
      expect(force.y).toBeGreaterThan(0); // Pulled down
    });

    it('should apply stronger force at greater distances', () => {
      const center = { x: 0, y: 0 };
      const centerAttraction = Forces.centerAttraction(center, 0.1);
      const bodyNear = createTestBody('1', 5, 0);
      const bodyFar = createTestBody('2', 20, 0);
      
      const forceNear = centerAttraction.calculate(bodyNear, []);
      const forceFar = centerAttraction.calculate(bodyFar, []);
      
      expect(vec2.magnitude(forceFar)).toBeGreaterThan(vec2.magnitude(forceNear));
    });
  });
});