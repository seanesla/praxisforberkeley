import { describe, it, expect, beforeEach } from '@jest/globals';
import { PhysicsEngine } from '../physicsEngine';
import { PhysicsBody, Spring } from '../types';
import { Forces } from '../forces';

describe('PhysicsEngine', () => {
  let engine: PhysicsEngine;

  const createTestBody = (id: string, x: number, y: number): PhysicsBody => ({
    id,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    mass: 1,
    radius: 10,
    fixed: false,
    damping: 0,
  });

  beforeEach(() => {
    engine = new PhysicsEngine({
      gravity: { x: 0, y: 0 },
      globalDamping: 1,
      collisionEnabled: true,
      timeStep: 0.016,
    });
  });

  describe('Body Management', () => {
    it('should add and retrieve bodies', () => {
      const body = createTestBody('1', 0, 0);
      engine.addBody(body);
      
      expect(engine.getBody('1')).toEqual(body);
      expect(engine.getBodies().length).toBe(1);
    });

    it('should remove bodies', () => {
      const body = createTestBody('1', 0, 0);
      engine.addBody(body);
      engine.removeBody('1');
      
      expect(engine.getBody('1')).toBeUndefined();
      expect(engine.getBodies().length).toBe(0);
    });

    it('should update body properties', () => {
      const body = createTestBody('1', 0, 0);
      engine.addBody(body);
      engine.updateBody('1', { mass: 2, fixed: true });
      
      const updated = engine.getBody('1');
      expect(updated?.mass).toBe(2);
      expect(updated?.fixed).toBe(true);
    });

    it('should remove associated springs when removing body', () => {
      const body1 = createTestBody('1', 0, 0);
      const body2 = createTestBody('2', 10, 0);
      const spring: Spring = {
        id: 's1',
        bodyA: '1',
        bodyB: '2',
        restLength: 10,
        stiffness: 0.1,
        damping: 0.01,
      };
      
      engine.addBody(body1);
      engine.addBody(body2);
      engine.addSpring(spring);
      
      engine.removeBody('1');
      
      // Spring should be removed
      engine.update();
      // No error should occur
    });
  });

  describe('Physics Simulation', () => {
    it('should apply gravity to bodies', () => {
      engine.updateConfig({ gravity: { x: 0, y: 10 } });
      engine.addForce(Forces.gravity({ x: 0, y: 10 }));
      
      const body = createTestBody('1', 0, 0);
      engine.addBody(body);
      
      const initialY = body.position.y;
      engine.update();
      
      expect(engine.getBody('1')!.position.y).toBeGreaterThan(initialY);
      expect(engine.getBody('1')!.velocity.y).toBeGreaterThan(0);
    });

    it('should not move fixed bodies', () => {
      engine.addForce(Forces.gravity({ x: 0, y: 10 }));
      
      const body = { ...createTestBody('1', 0, 0), fixed: true };
      engine.addBody(body);
      
      const initialPos = { ...body.position };
      engine.update();
      
      expect(engine.getBody('1')!.position).toEqual(initialPos);
    });

    it('should apply damping to moving bodies', () => {
      engine.updateConfig({ globalDamping: 0.9 });
      
      const body = createTestBody('1', 0, 0);
      body.velocity = { x: 10, y: 0 };
      engine.addBody(body);
      
      engine.update();
      
      expect(engine.getBody('1')!.velocity.x).toBeLessThan(10);
      expect(engine.getBody('1')!.velocity.x).toBeGreaterThan(8); // Some damping applied
    });

    it('should limit maximum velocity', () => {
      engine.updateConfig({ maxVelocity: 5 });
      
      const body = createTestBody('1', 0, 0);
      body.velocity = { x: 10, y: 10 };
      engine.addBody(body);
      
      engine.update();
      
      const velocity = engine.getBody('1')!.velocity;
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
      expect(speed).toBeLessThanOrEqual(5);
    });
  });

  describe('Collision Handling', () => {
    it('should detect and resolve collisions', () => {
      const body1 = createTestBody('1', 0, 0);
      const body2 = createTestBody('2', 15, 0); // Overlapping
      body1.velocity = { x: 5, y: 0 };
      body2.velocity = { x: -5, y: 0 };
      
      engine.addBody(body1);
      engine.addBody(body2);
      
      engine.update();
      
      // Bodies should be separated
      const distance = Math.abs(engine.getBody('2')!.position.x - engine.getBody('1')!.position.x);
      expect(distance).toBeGreaterThanOrEqual(20); // Sum of radii
    });

    it('should respect bounds', () => {
      engine.updateConfig({
        bounds: {
          min: { x: -50, y: -50 },
          max: { x: 50, y: 50 }
        }
      });
      
      const body = createTestBody('1', 45, 0);
      body.velocity = { x: 10, y: 0 };
      engine.addBody(body);
      
      engine.update();
      
      // Body should not go past bounds
      expect(engine.getBody('1')!.position.x).toBeLessThanOrEqual(40); // 50 - radius
    });

    it('should disable collisions when configured', () => {
      engine.updateConfig({ collisionEnabled: false });
      
      const body1 = createTestBody('1', 0, 0);
      const body2 = createTestBody('2', 10, 0); // Overlapping
      
      engine.addBody(body1);
      engine.addBody(body2);
      
      engine.update();
      
      // Bodies should still overlap
      const distance = Math.abs(body2.position.x - body1.position.x);
      expect(distance).toBe(10); // No separation
    });
  });

  describe('Spring Forces', () => {
    it('should apply spring forces between connected bodies', () => {
      const body1 = createTestBody('1', 0, 0);
      const body2 = createTestBody('2', 20, 0);
      const spring: Spring = {
        id: 's1',
        bodyA: '1',
        bodyB: '2',
        restLength: 10,
        stiffness: 0.1,
        damping: 0,
      };
      
      engine.addBody(body1);
      engine.addBody(body2);
      engine.addSpring(spring);
      engine.addForce(Forces.spring([spring]));
      
      engine.update();
      
      // Bodies should move toward each other
      expect(engine.getBody('1')!.position.x).toBeGreaterThan(0);
      expect(engine.getBody('2')!.position.x).toBeLessThan(20);
    });
  });

  describe('State Management', () => {
    it('should pause and resume simulation', () => {
      const body = createTestBody('1', 0, 0);
      body.velocity = { x: 10, y: 0 };
      engine.addBody(body);
      
      engine.pause();
      const pausedPos = { ...body.position };
      
      engine.update();
      expect(engine.getBody('1')!.position).toEqual(pausedPos);
      
      engine.resume();
      engine.update();
      expect(engine.getBody('1')!.position.x).toBeGreaterThan(pausedPos.x);
    });

    it('should reset engine state', () => {
      engine.addBody(createTestBody('1', 0, 0));
      engine.addForce(Forces.gravity({ x: 0, y: 10 }));
      
      engine.reset();
      
      expect(engine.getBodies().length).toBe(0);
      expect(engine.getTime()).toBe(0);
    });
  });

  describe('Metrics', () => {
    it('should track simulation metrics', () => {
      engine.addBody(createTestBody('1', 0, 0));
      engine.addBody(createTestBody('2', 50, 0));
      
      engine.update();
      
      const metrics = engine.getMetrics();
      expect(metrics.bodyCount).toBe(2);
      expect(metrics.computeTime).toBeGreaterThan(0);
      expect(metrics.totalEnergy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Methods', () => {
    it('should support different integrators', () => {
      ['euler', 'verlet', 'rk4'].forEach(integrator => {
        engine.updateConfig({ integrator: integrator as any });
        
        const body = createTestBody('1', 0, 0);
        body.velocity = { x: 10, y: 0 };
        engine.addBody(body);
        
        engine.update();
        
        // All integrators should move the body
        expect(engine.getBody('1')!.position.x).toBeGreaterThan(0);
        
        engine.reset();
      });
    });
  });
});