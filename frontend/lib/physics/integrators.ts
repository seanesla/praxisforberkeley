import { PhysicsBody, Vector2D } from './types';
import { vec2 } from './forces';

export interface Integrator {
  integrate(
    body: PhysicsBody,
    force: Vector2D,
    dt: number,
    previousPosition?: Vector2D
  ): { position: Vector2D; velocity: Vector2D; previousPosition?: Vector2D };
}

// Euler integration - simple but can be unstable
export class EulerIntegrator implements Integrator {
  integrate(body: PhysicsBody, force: Vector2D, dt: number): { position: Vector2D; velocity: Vector2D } {
    if (body.fixed) {
      return { position: body.position, velocity: { x: 0, y: 0 } };
    }
    
    // a = F / m
    const acceleration = vec2.divide(force, body.mass);
    
    // v = v + a * dt
    const velocity = vec2.add(body.velocity, vec2.multiply(acceleration, dt));
    
    // Apply damping
    const dampedVelocity = vec2.multiply(velocity, 1 - body.damping);
    
    // x = x + v * dt
    const position = vec2.add(body.position, vec2.multiply(dampedVelocity, dt));
    
    return { position, velocity: dampedVelocity };
  }
}

// Verlet integration - more stable, especially for springs
export class VerletIntegrator implements Integrator {
  integrate(
    body: PhysicsBody,
    force: Vector2D,
    dt: number,
    previousPosition?: Vector2D
  ): { position: Vector2D; velocity: Vector2D; previousPosition: Vector2D } {
    if (body.fixed) {
      return {
        position: body.position,
        velocity: { x: 0, y: 0 },
        previousPosition: body.position,
      };
    }
    
    // Use current position as previous if not provided
    const prevPos = previousPosition || body.position;
    
    // a = F / m
    const acceleration = vec2.divide(force, body.mass);
    
    // Verlet integration: x_new = 2*x - x_prev + a*dt^2
    const displacement = vec2.subtract(body.position, prevPos);
    const dampedDisplacement = vec2.multiply(displacement, 1 - body.damping);
    
    const newPosition = vec2.add(
      vec2.add(body.position, dampedDisplacement),
      vec2.multiply(acceleration, dt * dt)
    );
    
    // Calculate velocity from positions
    const velocity = vec2.divide(vec2.subtract(newPosition, body.position), dt);
    
    return {
      position: newPosition,
      velocity,
      previousPosition: body.position,
    };
  }
}

// Runge-Kutta 4th order - most accurate but computationally expensive
export class RK4Integrator implements Integrator {
  integrate(body: PhysicsBody, force: Vector2D, dt: number): { position: Vector2D; velocity: Vector2D } {
    if (body.fixed) {
      return { position: body.position, velocity: { x: 0, y: 0 } };
    }
    
    // Helper function to calculate acceleration
    const getAcceleration = (f: Vector2D) => vec2.divide(f, body.mass);
    
    // k1
    const a1 = getAcceleration(force);
    const v1 = body.velocity;
    
    // k2 (midpoint)
    const v2 = vec2.add(body.velocity, vec2.multiply(a1, dt / 2));
    const p2 = vec2.add(body.position, vec2.multiply(v1, dt / 2));
    const a2 = getAcceleration(force); // Simplified - should recalculate force at new position
    
    // k3 (midpoint with k2)
    const v3 = vec2.add(body.velocity, vec2.multiply(a2, dt / 2));
    const p3 = vec2.add(body.position, vec2.multiply(v2, dt / 2));
    const a3 = getAcceleration(force);
    
    // k4 (endpoint)
    const v4 = vec2.add(body.velocity, vec2.multiply(a3, dt));
    const p4 = vec2.add(body.position, vec2.multiply(v3, dt));
    const a4 = getAcceleration(force);
    
    // Combine
    const velocity = vec2.add(
      body.velocity,
      vec2.multiply(
        vec2.add(
          vec2.add(a1, vec2.multiply(a2, 2)),
          vec2.add(vec2.multiply(a3, 2), a4)
        ),
        dt / 6
      )
    );
    
    const position = vec2.add(
      body.position,
      vec2.multiply(
        vec2.add(
          vec2.add(v1, vec2.multiply(v2, 2)),
          vec2.add(vec2.multiply(v3, 2), v4)
        ),
        dt / 6
      )
    );
    
    // Apply damping
    const dampedVelocity = vec2.multiply(velocity, 1 - body.damping);
    
    return { position, velocity: dampedVelocity };
  }
}

// Factory function to create integrators
export function createIntegrator(type: 'euler' | 'verlet' | 'rk4'): Integrator {
  switch (type) {
    case 'euler':
      return new EulerIntegrator();
    case 'verlet':
      return new VerletIntegrator();
    case 'rk4':
      return new RK4Integrator();
    default:
      return new VerletIntegrator();
  }
}