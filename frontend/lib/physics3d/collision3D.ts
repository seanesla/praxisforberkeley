import { Vector3D, Physics3DBody, Collision3DResult } from './types3D';
import { vec3 } from './vector3';

export class CollisionDetector3D {
  // Sphere-sphere collision detection
  static sphereSphere(bodyA: Physics3DBody, bodyB: Physics3DBody): Collision3DResult | null {
    const delta = vec3.subtract(bodyB.position, bodyA.position);
    const distance = vec3.magnitude(delta);
    const minDistance = bodyA.radius + bodyB.radius;
    
    if (distance >= minDistance) return null;
    
    // Collision detected
    const normal = distance > 0 ? vec3.normalize(delta) : vec3.create(1, 0, 0);
    const depth = minDistance - distance;
    const contactPoint = vec3.add(
      bodyA.position,
      vec3.multiply(normal, bodyA.radius - depth / 2)
    );
    
    return { bodyA, bodyB, normal, depth, contactPoint };
  }
  
  // Sphere-box collision detection
  static sphereBox(sphere: Physics3DBody, boxCenter: Vector3D, boxSize: Vector3D): Collision3DResult | null {
    // Find closest point on box to sphere center
    const closestPoint = vec3.create(
      Math.max(boxCenter.x - boxSize.x / 2, Math.min(sphere.position.x, boxCenter.x + boxSize.x / 2)),
      Math.max(boxCenter.y - boxSize.y / 2, Math.min(sphere.position.y, boxCenter.y + boxSize.y / 2)),
      Math.max(boxCenter.z - boxSize.z / 2, Math.min(sphere.position.z, boxCenter.z + boxSize.z / 2))
    );
    
    const distance = vec3.distance(sphere.position, closestPoint);
    
    if (distance >= sphere.radius) return null;
    
    const normal = distance > 0 
      ? vec3.normalize(vec3.subtract(sphere.position, closestPoint))
      : vec3.create(0, 1, 0);
    
    return {
      bodyA: sphere,
      bodyB: sphere, // Self-collision for bounds
      normal,
      depth: sphere.radius - distance,
      contactPoint: closestPoint
    };
  }
  
  // Capsule-capsule collision (for bonds)
  static capsuleCapsule(
    bodyA: Physics3DBody, 
    bodyB: Physics3DBody,
    heightA: number,
    heightB: number
  ): Collision3DResult | null {
    // Simplified: treat as elongated spheres
    const effectiveRadiusA = bodyA.radius + heightA / 2;
    const effectiveRadiusB = bodyB.radius + heightB / 2;
    
    const delta = vec3.subtract(bodyB.position, bodyA.position);
    const distance = vec3.magnitude(delta);
    const minDistance = effectiveRadiusA + effectiveRadiusB;
    
    if (distance >= minDistance) return null;
    
    const normal = vec3.normalize(delta);
    const depth = minDistance - distance;
    const contactPoint = vec3.add(
      bodyA.position,
      vec3.multiply(normal, effectiveRadiusA - depth / 2)
    );
    
    return { bodyA, bodyB, normal, depth, contactPoint };
  }
  
  // Check collision against bounds
  static sphereBounds(
    body: Physics3DBody,
    min: Vector3D,
    max: Vector3D
  ): Collision3DResult[] {
    const collisions: Collision3DResult[] = [];
    
    // Check each axis
    const axes = [
      { axis: 'x', normal: vec3.create(1, 0, 0) },
      { axis: 'y', normal: vec3.create(0, 1, 0) },
      { axis: 'z', normal: vec3.create(0, 0, 1) }
    ];
    
    axes.forEach(({ axis, normal }) => {
      const pos = body.position[axis as keyof Vector3D];
      const minBound = min[axis as keyof Vector3D];
      const maxBound = max[axis as keyof Vector3D];
      
      if (pos - body.radius < minBound) {
        collisions.push({
          bodyA: body,
          bodyB: body,
          normal: normal,
          depth: minBound - (pos - body.radius),
          contactPoint: vec3.create(
            axis === 'x' ? minBound : body.position.x,
            axis === 'y' ? minBound : body.position.y,
            axis === 'z' ? minBound : body.position.z
          )
        });
      }
      
      if (pos + body.radius > maxBound) {
        collisions.push({
          bodyA: body,
          bodyB: body,
          normal: vec3.multiply(normal, -1),
          depth: (pos + body.radius) - maxBound,
          contactPoint: vec3.create(
            axis === 'x' ? maxBound : body.position.x,
            axis === 'y' ? maxBound : body.position.y,
            axis === 'z' ? maxBound : body.position.z
          )
        });
      }
    });
    
    return collisions;
  }
}

export class CollisionResolver3D {
  static resolveCollision(collision: Collision3DResult, restitution: number = 0.8): void {
    const { bodyA, bodyB, normal, depth } = collision;
    
    // Skip if both bodies are fixed or it's a self-collision (bounds)
    if ((bodyA.fixed && bodyB.fixed) || bodyA === bodyB) {
      if (bodyA === bodyB && !bodyA.fixed) {
        // Bounds collision - just push the body back
        const correction = vec3.multiply(normal, depth);
        bodyA.position = vec3.add(bodyA.position, correction);
        
        // Reflect velocity
        const velocityDotNormal = vec3.dot(bodyA.velocity, normal);
        if (velocityDotNormal < 0) {
          const impulse = vec3.multiply(normal, -velocityDotNormal * (1 + restitution));
          bodyA.velocity = vec3.add(bodyA.velocity, impulse);
        }
      }
      return;
    }
    
    // Calculate relative velocity
    const relativeVelocity = vec3.subtract(bodyB.velocity, bodyA.velocity);
    const velocityAlongNormal = vec3.dot(relativeVelocity, normal);
    
    // Don't resolve if bodies are separating
    if (velocityAlongNormal > 0) return;
    
    // Calculate impulse magnitude
    const totalMass = bodyA.mass + bodyB.mass;
    const impulseMagnitude = -(1 + restitution) * velocityAlongNormal / totalMass;
    
    // Apply impulse
    const impulse = vec3.multiply(normal, impulseMagnitude);
    
    if (!bodyA.fixed) {
      bodyA.velocity = vec3.subtract(
        bodyA.velocity,
        vec3.multiply(impulse, bodyB.mass)
      );
    }
    
    if (!bodyB.fixed) {
      bodyB.velocity = vec3.add(
        bodyB.velocity,
        vec3.multiply(impulse, bodyA.mass)
      );
    }
    
    // Position correction to prevent overlap
    const percent = 0.8;
    const slop = 0.01;
    const correctionMagnitude = Math.max(depth - slop, 0) / totalMass * percent;
    const correction = vec3.multiply(normal, correctionMagnitude);
    
    if (!bodyA.fixed) {
      bodyA.position = vec3.subtract(
        bodyA.position,
        vec3.multiply(correction, bodyB.mass)
      );
    }
    
    if (!bodyB.fixed) {
      bodyB.position = vec3.add(
        bodyB.position,
        vec3.multiply(correction, bodyA.mass)
      );
    }
  }
}

// Octree for 3D spatial partitioning
export class Octree {
  private root: OctreeNode;
  private maxDepth: number;
  private maxBodies: number;
  
  constructor(bounds: { min: Vector3D; max: Vector3D }, maxDepth: number = 5, maxBodies: number = 8) {
    this.root = new OctreeNode(bounds, 0);
    this.maxDepth = maxDepth;
    this.maxBodies = maxBodies;
  }
  
  clear(): void {
    this.root.clear();
  }
  
  insert(body: Physics3DBody): void {
    this.root.insert(body, this.maxDepth, this.maxBodies);
  }
  
  query(range: { center: Vector3D; radius: number }): Physics3DBody[] {
    const results: Physics3DBody[] = [];
    this.root.query(range, results);
    return results;
  }
  
  getPotentialCollisions(body: Physics3DBody): Set<string> {
    const range = {
      center: body.position,
      radius: body.radius * 2 // Search radius
    };
    
    const nearby = this.query(range);
    const potential = new Set<string>();
    
    nearby.forEach(other => {
      if (other.id !== body.id) {
        potential.add(other.id);
      }
    });
    
    return potential;
  }
}

class OctreeNode {
  private bounds: { min: Vector3D; max: Vector3D };
  private depth: number;
  private bodies: Physics3DBody[] = [];
  private children: OctreeNode[] | null = null;
  
  constructor(bounds: { min: Vector3D; max: Vector3D }, depth: number) {
    this.bounds = bounds;
    this.depth = depth;
  }
  
  clear(): void {
    this.bodies = [];
    if (this.children) {
      this.children.forEach(child => child.clear());
      this.children = null;
    }
  }
  
  subdivide(): void {
    const { min, max } = this.bounds;
    const mid = vec3.create(
      (min.x + max.x) / 2,
      (min.y + max.y) / 2,
      (min.z + max.z) / 2
    );
    
    this.children = [
      // Bottom half
      new OctreeNode({ min: vec3.create(min.x, min.y, min.z), max: vec3.create(mid.x, mid.y, mid.z) }, this.depth + 1),
      new OctreeNode({ min: vec3.create(mid.x, min.y, min.z), max: vec3.create(max.x, mid.y, mid.z) }, this.depth + 1),
      new OctreeNode({ min: vec3.create(min.x, min.y, mid.z), max: vec3.create(mid.x, mid.y, max.z) }, this.depth + 1),
      new OctreeNode({ min: vec3.create(mid.x, min.y, mid.z), max: vec3.create(max.x, mid.y, max.z) }, this.depth + 1),
      // Top half
      new OctreeNode({ min: vec3.create(min.x, mid.y, min.z), max: vec3.create(mid.x, max.y, mid.z) }, this.depth + 1),
      new OctreeNode({ min: vec3.create(mid.x, mid.y, min.z), max: vec3.create(max.x, max.y, mid.z) }, this.depth + 1),
      new OctreeNode({ min: vec3.create(min.x, mid.y, mid.z), max: vec3.create(mid.x, max.y, max.z) }, this.depth + 1),
      new OctreeNode({ min: vec3.create(mid.x, mid.y, mid.z), max: vec3.create(max.x, max.y, max.z) }, this.depth + 1),
    ];
  }
  
  insert(body: Physics3DBody, maxDepth: number, maxBodies: number): void {
    if (!this.contains(body.position)) return;
    
    if (this.children === null && this.bodies.length < maxBodies || this.depth >= maxDepth) {
      this.bodies.push(body);
      return;
    }
    
    if (this.children === null) {
      this.subdivide();
    }
    
    this.children!.forEach(child => child.insert(body, maxDepth, maxBodies));
  }
  
  query(range: { center: Vector3D; radius: number }, results: Physics3DBody[]): void {
    if (!this.intersectsSphere(range)) return;
    
    this.bodies.forEach(body => {
      if (vec3.distance(body.position, range.center) <= range.radius) {
        results.push(body);
      }
    });
    
    if (this.children) {
      this.children.forEach(child => child.query(range, results));
    }
  }
  
  private contains(point: Vector3D): boolean {
    return point.x >= this.bounds.min.x && point.x <= this.bounds.max.x &&
           point.y >= this.bounds.min.y && point.y <= this.bounds.max.y &&
           point.z >= this.bounds.min.z && point.z <= this.bounds.max.z;
  }
  
  private intersectsSphere(sphere: { center: Vector3D; radius: number }): boolean {
    const closestPoint = vec3.create(
      Math.max(this.bounds.min.x, Math.min(sphere.center.x, this.bounds.max.x)),
      Math.max(this.bounds.min.y, Math.min(sphere.center.y, this.bounds.max.y)),
      Math.max(this.bounds.min.z, Math.min(sphere.center.z, this.bounds.max.z))
    );
    
    return vec3.distance(sphere.center, closestPoint) <= sphere.radius;
  }
}