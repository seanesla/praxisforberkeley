import { Vector2D, PhysicsBody, CollisionResult } from './types';
import { vec2 } from './forces';
import { PHYSICS_CONSTANTS } from './constants';

export class CollisionDetector {
  // Check if two circles are colliding
  static circleCircle(bodyA: PhysicsBody, bodyB: PhysicsBody): CollisionResult | null {
    const delta = vec2.subtract(bodyB.position, bodyA.position);
    const distance = vec2.magnitude(delta);
    const minDistance = bodyA.radius + bodyB.radius;
    
    if (distance >= minDistance) return null;
    
    // Collision detected
    const normal = distance > 0 ? vec2.normalize(delta) : { x: 1, y: 0 };
    const depth = minDistance - distance;
    const point = vec2.add(
      bodyA.position,
      vec2.multiply(normal, bodyA.radius - depth / 2)
    );
    
    return { bodyA, bodyB, normal, depth, point };
  }
  
  // Check collision against bounds
  static circleBounds(
    body: PhysicsBody,
    min: Vector2D,
    max: Vector2D
  ): CollisionResult[] {
    const collisions: CollisionResult[] = [];
    
    // Left wall
    if (body.position.x - body.radius < min.x) {
      collisions.push({
        bodyA: body,
        bodyB: body, // Self-collision for bounds
        normal: { x: 1, y: 0 },
        depth: min.x - (body.position.x - body.radius),
        point: { x: min.x, y: body.position.y },
      });
    }
    
    // Right wall
    if (body.position.x + body.radius > max.x) {
      collisions.push({
        bodyA: body,
        bodyB: body,
        normal: { x: -1, y: 0 },
        depth: (body.position.x + body.radius) - max.x,
        point: { x: max.x, y: body.position.y },
      });
    }
    
    // Top wall
    if (body.position.y - body.radius < min.y) {
      collisions.push({
        bodyA: body,
        bodyB: body,
        normal: { x: 0, y: 1 },
        depth: min.y - (body.position.y - body.radius),
        point: { x: body.position.x, y: min.y },
      });
    }
    
    // Bottom wall
    if (body.position.y + body.radius > max.y) {
      collisions.push({
        bodyA: body,
        bodyB: body,
        normal: { x: 0, y: -1 },
        depth: (body.position.y + body.radius) - max.y,
        point: { x: body.position.x, y: max.y },
      });
    }
    
    return collisions;
  }
}

export class CollisionResolver {
  // Resolve collision using impulse method
  static resolveCollision(collision: CollisionResult, restitution: number = PHYSICS_CONSTANTS.COLLISION_RESTITUTION): void {
    const { bodyA, bodyB, normal, depth } = collision;
    
    // Skip if both bodies are fixed or it's a self-collision (bounds)
    if ((bodyA.fixed && bodyB.fixed) || bodyA === bodyB) {
      if (bodyA === bodyB && !bodyA.fixed) {
        // Bounds collision - just push the body back
        const correction = vec2.multiply(normal, depth);
        bodyA.position = vec2.add(bodyA.position, correction);
        
        // Reflect velocity
        const velocityDotNormal = vec2.dot(bodyA.velocity, normal);
        if (velocityDotNormal < 0) {
          const impulse = vec2.multiply(normal, -velocityDotNormal * (1 + restitution));
          bodyA.velocity = vec2.add(bodyA.velocity, impulse);
        }
      }
      return;
    }
    
    // Calculate relative velocity
    const relativeVelocity = vec2.subtract(bodyB.velocity, bodyA.velocity);
    const velocityAlongNormal = vec2.dot(relativeVelocity, normal);
    
    // Don't resolve if bodies are separating
    if (velocityAlongNormal > 0) return;
    
    // Calculate impulse magnitude
    const totalMass = bodyA.mass + bodyB.mass;
    const impulseMagnitude = -(1 + restitution) * velocityAlongNormal / totalMass;
    
    // Apply impulse
    const impulse = vec2.multiply(normal, impulseMagnitude);
    
    if (!bodyA.fixed) {
      bodyA.velocity = vec2.subtract(
        bodyA.velocity,
        vec2.multiply(impulse, bodyB.mass)
      );
    }
    
    if (!bodyB.fixed) {
      bodyB.velocity = vec2.add(
        bodyB.velocity,
        vec2.multiply(impulse, bodyA.mass)
      );
    }
    
    // Position correction to prevent overlap
    const percent = 0.8; // Penetration percentage to correct
    const slop = 0.01; // Penetration allowance
    const correctionMagnitude = Math.max(depth - slop, 0) / totalMass * percent;
    const correction = vec2.multiply(normal, correctionMagnitude);
    
    if (!bodyA.fixed) {
      bodyA.position = vec2.subtract(
        bodyA.position,
        vec2.multiply(correction, bodyB.mass)
      );
    }
    
    if (!bodyB.fixed) {
      bodyB.position = vec2.add(
        bodyB.position,
        vec2.multiply(correction, bodyA.mass)
      );
    }
  }
}

// Spatial hash for broad-phase collision detection
export class SpatialHash {
  private cellSize: number;
  private cells: Map<string, Set<string>>;
  
  constructor(cellSize: number = PHYSICS_CONSTANTS.SPATIAL_HASH_CELL_SIZE) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  
  clear(): void {
    this.cells.clear();
  }
  
  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
  
  insert(body: PhysicsBody): void {
    const minX = body.position.x - body.radius;
    const maxX = body.position.x + body.radius;
    const minY = body.position.y - body.radius;
    const maxY = body.position.y + body.radius;
    
    // Insert into all cells the body overlaps
    for (let x = minX; x <= maxX; x += this.cellSize) {
      for (let y = minY; y <= maxY; y += this.cellSize) {
        const key = this.getKey(x, y);
        
        if (!this.cells.has(key)) {
          this.cells.set(key, new Set());
        }
        
        this.cells.get(key)!.add(body.id);
      }
    }
  }
  
  getPotentialCollisions(body: PhysicsBody): Set<string> {
    const potential = new Set<string>();
    const minX = body.position.x - body.radius;
    const maxX = body.position.x + body.radius;
    const minY = body.position.y - body.radius;
    const maxY = body.position.y + body.radius;
    
    // Check all cells the body overlaps
    for (let x = minX; x <= maxX; x += this.cellSize) {
      for (let y = minY; y <= maxY; y += this.cellSize) {
        const key = this.getKey(x, y);
        const cell = this.cells.get(key);
        
        if (cell) {
          cell.forEach(id => {
            if (id !== body.id) {
              potential.add(id);
            }
          });
        }
      }
    }
    
    return potential;
  }
}