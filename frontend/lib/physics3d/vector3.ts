import { Vector3D, Quaternion } from './types3D';

export const vec3 = {
  // Creation
  create: (x: number = 0, y: number = 0, z: number = 0): Vector3D => ({ x, y, z }),
  zero: (): Vector3D => ({ x: 0, y: 0, z: 0 }),
  one: (): Vector3D => ({ x: 1, y: 1, z: 1 }),
  
  // Basic operations
  add: (a: Vector3D, b: Vector3D): Vector3D => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z
  }),
  
  subtract: (a: Vector3D, b: Vector3D): Vector3D => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z
  }),
  
  multiply: (v: Vector3D, scalar: number): Vector3D => ({
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar
  }),
  
  divide: (v: Vector3D, scalar: number): Vector3D => {
    if (scalar === 0) return vec3.zero();
    return {
      x: v.x / scalar,
      y: v.y / scalar,
      z: v.z / scalar
    };
  },
  
  // Vector operations
  magnitude: (v: Vector3D): number => {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },
  
  magnitudeSquared: (v: Vector3D): number => {
    return v.x * v.x + v.y * v.y + v.z * v.z;
  },
  
  normalize: (v: Vector3D): Vector3D => {
    const mag = vec3.magnitude(v);
    return mag > 0 ? vec3.divide(v, mag) : vec3.zero();
  },
  
  distance: (a: Vector3D, b: Vector3D): number => {
    return vec3.magnitude(vec3.subtract(b, a));
  },
  
  distanceSquared: (a: Vector3D, b: Vector3D): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return dx * dx + dy * dy + dz * dz;
  },
  
  dot: (a: Vector3D, b: Vector3D): number => {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },
  
  cross: (a: Vector3D, b: Vector3D): Vector3D => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }),
  
  angle: (a: Vector3D, b: Vector3D): number => {
    const dot = vec3.dot(a, b);
    const magA = vec3.magnitude(a);
    const magB = vec3.magnitude(b);
    if (magA === 0 || magB === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB))));
  },
  
  // Utility functions
  limit: (v: Vector3D, max: number): Vector3D => {
    const mag = vec3.magnitude(v);
    return mag > max ? vec3.multiply(vec3.normalize(v), max) : v;
  },
  
  lerp: (a: Vector3D, b: Vector3D, t: number): Vector3D => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  }),
  
  slerp: (a: Vector3D, b: Vector3D, t: number): Vector3D => {
    const dot = vec3.dot(vec3.normalize(a), vec3.normalize(b));
    const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
    const sinTheta = Math.sin(theta);
    
    if (sinTheta < 0.001) {
      return vec3.lerp(a, b, t);
    }
    
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;
    
    return vec3.add(
      vec3.multiply(a, wa),
      vec3.multiply(b, wb)
    );
  },
  
  reflect: (v: Vector3D, normal: Vector3D): Vector3D => {
    const dot2 = 2 * vec3.dot(v, normal);
    return vec3.subtract(v, vec3.multiply(normal, dot2));
  },
  
  project: (v: Vector3D, onto: Vector3D): Vector3D => {
    const magSquared = vec3.magnitudeSquared(onto);
    if (magSquared === 0) return vec3.zero();
    const scalar = vec3.dot(v, onto) / magSquared;
    return vec3.multiply(onto, scalar);
  },
  
  // Rotation using Rodrigues' formula
  rotateAroundAxis: (v: Vector3D, axis: Vector3D, angle: number): Vector3D => {
    const k = vec3.normalize(axis);
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    
    const dot = vec3.dot(k, v);
    const cross = vec3.cross(k, v);
    
    return vec3.add(
      vec3.add(
        vec3.multiply(v, cosAngle),
        vec3.multiply(cross, sinAngle)
      ),
      vec3.multiply(k, dot * (1 - cosAngle))
    );
  },
  
  // Convert to/from spherical coordinates
  toSpherical: (v: Vector3D): { r: number; theta: number; phi: number } => {
    const r = vec3.magnitude(v);
    const theta = Math.atan2(v.y, v.x); // Azimuthal angle
    const phi = Math.acos(r > 0 ? v.z / r : 0); // Polar angle
    return { r, theta, phi };
  },
  
  fromSpherical: (r: number, theta: number, phi: number): Vector3D => ({
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi)
  }),
  
  // Random vectors
  random: (scale: number = 1): Vector3D => ({
    x: (Math.random() - 0.5) * 2 * scale,
    y: (Math.random() - 0.5) * 2 * scale,
    z: (Math.random() - 0.5) * 2 * scale
  }),
  
  randomUnit: (): Vector3D => {
    const theta = Math.random() * 2 * Math.PI;
    const z = (Math.random() - 0.5) * 2;
    const r = Math.sqrt(1 - z * z);
    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
      z
    };
  }
};

// Quaternion operations for 3D rotations
export const quat = {
  identity: (): Quaternion => ({ x: 0, y: 0, z: 0, w: 1 }),
  
  fromAxisAngle: (axis: Vector3D, angle: number): Quaternion => {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    const normalized = vec3.normalize(axis);
    return {
      x: normalized.x * s,
      y: normalized.y * s,
      z: normalized.z * s,
      w: Math.cos(halfAngle)
    };
  },
  
  multiply: (a: Quaternion, b: Quaternion): Quaternion => ({
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
  }),
  
  rotateVector: (q: Quaternion, v: Vector3D): Vector3D => {
    const qv = { x: v.x, y: v.y, z: v.z, w: 0 };
    const qConj = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
    const result = quat.multiply(quat.multiply(q, qv), qConj);
    return { x: result.x, y: result.y, z: result.z };
  }
};

// Matrix operations for transformations
export const mat4 = {
  // Create transformation matrix from position, rotation, and scale
  compose: (position: Vector3D, rotation: Quaternion, scale: Vector3D): Float32Array => {
    const matrix = new Float32Array(16);
    
    // Convert quaternion to rotation matrix
    const x2 = rotation.x + rotation.x;
    const y2 = rotation.y + rotation.y;
    const z2 = rotation.z + rotation.z;
    const xx = rotation.x * x2;
    const xy = rotation.x * y2;
    const xz = rotation.x * z2;
    const yy = rotation.y * y2;
    const yz = rotation.y * z2;
    const zz = rotation.z * z2;
    const wx = rotation.w * x2;
    const wy = rotation.w * y2;
    const wz = rotation.w * z2;
    
    matrix[0] = (1 - (yy + zz)) * scale.x;
    matrix[1] = (xy + wz) * scale.x;
    matrix[2] = (xz - wy) * scale.x;
    matrix[3] = 0;
    
    matrix[4] = (xy - wz) * scale.y;
    matrix[5] = (1 - (xx + zz)) * scale.y;
    matrix[6] = (yz + wx) * scale.y;
    matrix[7] = 0;
    
    matrix[8] = (xz + wy) * scale.z;
    matrix[9] = (yz - wx) * scale.z;
    matrix[10] = (1 - (xx + yy)) * scale.z;
    matrix[11] = 0;
    
    matrix[12] = position.x;
    matrix[13] = position.y;
    matrix[14] = position.z;
    matrix[15] = 1;
    
    return matrix;
  }
};