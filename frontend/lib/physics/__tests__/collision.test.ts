import { describe, it, expect, beforeEach } from '@jest/globals';
import { CollisionDetector, CollisionResolver, SpatialHash } from '../collision';
import { PhysicsBody, CollisionResult } from '../types';

describe('Collision Detection', () => {
  const createTestBody = (id: string, x: number, y: number, radius: number = 10): PhysicsBody => ({
    id,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    mass: 1,
    radius,
    fixed: false,
    damping: 0,
  });

  describe('CollisionDetector', () => {
    describe('circleCircle', () => {
      it('should detect collision between overlapping circles', () => {
        const body1 = createTestBody('1', 0, 0, 10);
        const body2 = createTestBody('2', 15, 0, 10);
        
        const collision = CollisionDetector.circleCircle(body1, body2);
        expect(collision).not.toBeNull();
        expect(collision!.depth).toBeCloseTo(5); // 10 + 10 - 15 = 5
        expect(collision!.normal.x).toBeCloseTo(1);
        expect(collision!.normal.y).toBeCloseTo(0);
      });

      it('should not detect collision between non-overlapping circles', () => {
        const body1 = createTestBody('1', 0, 0, 10);
        const body2 = createTestBody('2', 25, 0, 10);
        
        const collision = CollisionDetector.circleCircle(body1, body2);
        expect(collision).toBeNull();
      });

      it('should handle bodies at same position', () => {
        const body1 = createTestBody('1', 0, 0, 10);
        const body2 = createTestBody('2', 0, 0, 10);
        
        const collision = CollisionDetector.circleCircle(body1, body2);
        expect(collision).not.toBeNull();
        expect(collision!.depth).toBe(20); // Full overlap
      });
    });

    describe('circleBounds', () => {
      it('should detect collision with left boundary', () => {
        const body = createTestBody('1', 5, 50, 10);
        const min = { x: 0, y: 0 };
        const max = { x: 100, y: 100 };
        
        const collisions = CollisionDetector.circleBounds(body, min, max);
        expect(collisions.length).toBe(1);
        expect(collisions[0].normal).toEqual({ x: 1, y: 0 });
        expect(collisions[0].depth).toBe(5);
      });

      it('should detect collision with multiple boundaries', () => {
        const body = createTestBody('1', 5, 5, 10);
        const min = { x: 0, y: 0 };
        const max = { x: 100, y: 100 };
        
        const collisions = CollisionDetector.circleBounds(body, min, max);
        expect(collisions.length).toBe(2); // Left and top
      });

      it('should not detect collision when inside bounds', () => {
        const body = createTestBody('1', 50, 50, 10);
        const min = { x: 0, y: 0 };
        const max = { x: 100, y: 100 };
        
        const collisions = CollisionDetector.circleBounds(body, min, max);
        expect(collisions.length).toBe(0);
      });
    });
  });

  describe('CollisionResolver', () => {
    it('should resolve collision by separating bodies', () => {
      const body1 = createTestBody('1', 0, 0, 10);
      const body2 = createTestBody('2', 15, 0, 10);
      body1.velocity = { x: 5, y: 0 };
      body2.velocity = { x: -5, y: 0 };
      
      const collision: CollisionResult = {
        bodyA: body1,
        bodyB: body2,
        normal: { x: 1, y: 0 },
        depth: 5,
        point: { x: 10, y: 0 }
      };
      
      CollisionResolver.resolveCollision(collision);
      
      // Bodies should be pushed apart
      expect(body1.position.x).toBeLessThan(0);
      expect(body2.position.x).toBeGreaterThan(15);
      
      // Velocities should be reversed
      expect(body1.velocity.x).toBeLessThan(0);
      expect(body2.velocity.x).toBeGreaterThan(0);
    });

    it('should not move fixed bodies', () => {
      const body1 = { ...createTestBody('1', 0, 0, 10), fixed: true };
      const body2 = createTestBody('2', 15, 0, 10);
      
      const collision: CollisionResult = {
        bodyA: body1,
        bodyB: body2,
        normal: { x: 1, y: 0 },
        depth: 5,
        point: { x: 10, y: 0 }
      };
      
      const originalPos1 = { ...body1.position };
      CollisionResolver.resolveCollision(collision);
      
      // Fixed body should not move
      expect(body1.position).toEqual(originalPos1);
      // Non-fixed body should move away
      expect(body2.position.x).toBeGreaterThan(15);
    });

    it('should apply restitution correctly', () => {
      const body1 = createTestBody('1', 0, 0, 10);
      const body2 = createTestBody('2', 18, 0, 10);
      body1.velocity = { x: 10, y: 0 };
      body2.velocity = { x: -10, y: 0 };
      
      const collision: CollisionResult = {
        bodyA: body1,
        bodyB: body2,
        normal: { x: 1, y: 0 },
        depth: 2,
        point: { x: 10, y: 0 }
      };
      
      CollisionResolver.resolveCollision(collision, 1.0); // Perfect elastic collision
      
      // For equal masses, velocities should swap in elastic collision
      expect(body1.velocity.x).toBeCloseTo(-10);
      expect(body2.velocity.x).toBeCloseTo(10);
    });
  });

  describe('SpatialHash', () => {
    let spatialHash: SpatialHash;

    beforeEach(() => {
      spatialHash = new SpatialHash(50); // 50x50 cells
    });

    it('should insert body into correct cells', () => {
      const body = createTestBody('1', 25, 25, 10);
      spatialHash.insert(body);
      
      const potential = spatialHash.getPotentialCollisions(body);
      expect(potential.size).toBe(0); // No other bodies
    });

    it('should find potential collisions in same cell', () => {
      const body1 = createTestBody('1', 25, 25, 10);
      const body2 = createTestBody('2', 30, 30, 10);
      
      spatialHash.insert(body1);
      spatialHash.insert(body2);
      
      const potential = spatialHash.getPotentialCollisions(body1);
      expect(potential.has('2')).toBe(true);
    });

    it('should find potential collisions across cell boundaries', () => {
      const body1 = createTestBody('1', 45, 45, 15); // Spans multiple cells
      const body2 = createTestBody('2', 55, 55, 15);
      
      spatialHash.insert(body1);
      spatialHash.insert(body2);
      
      const potential = spatialHash.getPotentialCollisions(body1);
      expect(potential.has('2')).toBe(true);
    });

    it('should not include self in potential collisions', () => {
      const body = createTestBody('1', 25, 25, 10);
      spatialHash.insert(body);
      
      const potential = spatialHash.getPotentialCollisions(body);
      expect(potential.has('1')).toBe(false);
    });

    it('should clear all cells', () => {
      const body1 = createTestBody('1', 25, 25, 10);
      const body2 = createTestBody('2', 75, 75, 10);
      
      spatialHash.insert(body1);
      spatialHash.insert(body2);
      spatialHash.clear();
      
      const potential = spatialHash.getPotentialCollisions(body1);
      expect(potential.size).toBe(0);
    });
  });
});