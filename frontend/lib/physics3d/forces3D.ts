import { Vector3D, Physics3DBody, MolecularBond, Force3D } from './types3D';
import { vec3 } from './vector3';

// Physical constants
const CONSTANTS = {
  BOLTZMANN: 1.380649e-23, // J/K
  AVOGADRO: 6.02214076e23,
  ELEMENTARY_CHARGE: 1.602176634e-19, // C
  VACUUM_PERMITTIVITY: 8.854187817e-12, // F/m
  WATER_DIELECTRIC: 80,
  
  // Scaled constants for simulation
  COULOMB_SCALE: 100,
  LJ_EPSILON: 1.0, // Depth of potential well
  LJ_SIGMA: 3.4, // Distance at which potential is zero
};

// Element properties for molecular simulations
const ELEMENT_PROPERTIES: Record<string, { mass: number; radius: number; charge?: number }> = {
  H: { mass: 1.008, radius: 1.2 },
  C: { mass: 12.011, radius: 1.7 },
  N: { mass: 14.007, radius: 1.55 },
  O: { mass: 15.999, radius: 1.52 },
  P: { mass: 30.974, radius: 1.8 },
  S: { mass: 32.06, radius: 1.8 },
  // Add more elements as needed
};

export const Forces3D = {
  // Standard gravity
  gravity: (g: Vector3D): Force3D => ({
    type: 'gravity',
    calculate: (body: Physics3DBody) => {
      if (body.fixed) return vec3.zero();
      return vec3.multiply(g, body.mass);
    },
  }),

  // Spring force for molecular bonds
  molecularSpring: (bonds: MolecularBond[]): Force3D => ({
    type: 'spring',
    calculate: (body: Physics3DBody, bodies: Physics3DBody[]) => {
      if (body.fixed) return vec3.zero();
      
      let totalForce = vec3.zero();
      const bodyMap = new Map(bodies.map(b => [b.id, b]));
      
      for (const bond of bonds) {
        let otherBody: Physics3DBody | undefined;
        
        if (bond.atomA === body.id) {
          otherBody = bodyMap.get(bond.atomB);
        } else if (bond.atomB === body.id) {
          otherBody = bodyMap.get(bond.atomA);
        }
        
        if (!otherBody) continue;
        
        const delta = vec3.subtract(otherBody.position, body.position);
        const distance = vec3.magnitude(delta);
        
        if (distance < 0.01) continue;
        
        // Harmonic oscillator with different spring constants for bond types
        const k = bond.strength * (bond.order || 1);
        const displacement = distance - bond.length;
        const forceMagnitude = -k * displacement;
        
        const force = vec3.multiply(vec3.normalize(delta), forceMagnitude);
        totalForce = vec3.add(totalForce, force);
      }
      
      return totalForce;
    },
  }),

  // Lennard-Jones potential for van der Waals forces
  lennardJones: (epsilon: number = CONSTANTS.LJ_EPSILON, sigma: number = CONSTANTS.LJ_SIGMA): Force3D => ({
    type: 'vanDerWaals',
    calculate: (body: Physics3DBody, bodies: Physics3DBody[]) => {
      if (body.fixed) return vec3.zero();
      
      let totalForce = vec3.zero();
      
      for (const other of bodies) {
        if (other.id === body.id) continue;
        
        const r = vec3.distance(body.position, other.position);
        if (r < 0.1 || r > 10) continue; // Cutoff distance
        
        // LJ potential: U(r) = 4ε[(σ/r)^12 - (σ/r)^6]
        // Force: F(r) = -dU/dr = 24ε/r[(2(σ/r)^12 - (σ/r)^6)]
        const sigma_r = sigma / r;
        const sigma_r6 = Math.pow(sigma_r, 6);
        const sigma_r12 = sigma_r6 * sigma_r6;
        
        const forceMagnitude = 24 * epsilon / r * (2 * sigma_r12 - sigma_r6);
        const direction = vec3.normalize(vec3.subtract(body.position, other.position));
        
        totalForce = vec3.add(totalForce, vec3.multiply(direction, forceMagnitude));
      }
      
      return totalForce;
    },
  }),

  // Coulombic/electrostatic force
  electrostatic: (dielectric: number = CONSTANTS.WATER_DIELECTRIC): Force3D => ({
    type: 'electrostatic',
    calculate: (body: Physics3DBody, bodies: Physics3DBody[]) => {
      if (body.fixed || !body.charge) return vec3.zero();
      
      let totalForce = vec3.zero();
      const k = CONSTANTS.COULOMB_SCALE / dielectric;
      
      for (const other of bodies) {
        if (other.id === body.id || !other.charge) continue;
        
        const delta = vec3.subtract(body.position, other.position);
        const r = vec3.magnitude(delta);
        
        if (r < 0.1) continue;
        
        // Coulomb's law: F = k*q1*q2/r^2
        const forceMagnitude = k * body.charge * other.charge / (r * r);
        const force = vec3.multiply(vec3.normalize(delta), forceMagnitude);
        
        totalForce = vec3.add(totalForce, force);
      }
      
      return totalForce;
    },
  }),

  // Hydrogen bonding force (simplified)
  hydrogenBond: (strength: number = 5.0): Force3D => ({
    type: 'molecular',
    calculate: (body: Physics3DBody, bodies: Physics3DBody[], bonds?: MolecularBond[]) => {
      if (body.fixed || body.molecularProperties?.element !== 'H') return vec3.zero();
      
      let totalForce = vec3.zero();
      
      // Find if H is bonded to N, O, or F (donor)
      const donorBond = bonds?.find(b => 
        (b.atomA === body.id || b.atomB === body.id) &&
        b.bondType === 'single'
      );
      
      if (!donorBond) return totalForce;
      
      // Look for acceptors (N, O, F with lone pairs)
      for (const other of bodies) {
        if (other.id === body.id) continue;
        
        const acceptorElement = other.molecularProperties?.element;
        if (!acceptorElement || !['N', 'O', 'F'].includes(acceptorElement)) continue;
        
        const r = vec3.distance(body.position, other.position);
        if (r < 1.5 || r > 3.5) continue; // H-bond distance range
        
        // Simplified H-bond potential
        const optimalDistance = 2.8;
        const displacement = r - optimalDistance;
        const forceMagnitude = -strength * displacement * Math.exp(-displacement * displacement);
        
        const direction = vec3.normalize(vec3.subtract(other.position, body.position));
        totalForce = vec3.add(totalForce, vec3.multiply(direction, forceMagnitude));
      }
      
      return totalForce;
    },
  }),

  // Hydrophobic/hydrophilic interactions
  hydrophobic: (scale: number = 1.0): Force3D => ({
    type: 'molecular',
    calculate: (body: Physics3DBody, bodies: Physics3DBody[]) => {
      if (body.fixed || !body.molecularProperties?.hydrophobicity) return vec3.zero();
      
      let totalForce = vec3.zero();
      const bodyHydro = body.molecularProperties.hydrophobicity;
      
      for (const other of bodies) {
        if (other.id === body.id || !other.molecularProperties?.hydrophobicity) continue;
        
        const otherHydro = other.molecularProperties.hydrophobicity;
        const r = vec3.distance(body.position, other.position);
        
        if (r < 0.1 || r > 8) continue;
        
        // Like attracts like (hydrophobic-hydrophobic or hydrophilic-hydrophilic)
        const interaction = bodyHydro * otherHydro;
        const forceMagnitude = scale * interaction / (r * r);
        
        const direction = vec3.normalize(vec3.subtract(
          interaction > 0 ? other.position : body.position,
          interaction > 0 ? body.position : other.position
        ));
        
        totalForce = vec3.add(totalForce, vec3.multiply(direction, forceMagnitude));
      }
      
      return totalForce;
    },
  }),

  // Torsional force for dihedral angles
  torsion: (dihedrals: Array<{ atoms: string[]; angle: number; force: number }>): Force3D => ({
    type: 'molecular',
    calculate: (body: Physics3DBody, bodies: Physics3DBody[]) => {
      if (body.fixed) return vec3.zero();
      
      let totalForce = vec3.zero();
      const bodyMap = new Map(bodies.map(b => [b.id, b]));
      
      for (const dihedral of dihedrals) {
        if (!dihedral.atoms.includes(body.id)) continue;
        
        const [a, b, c, d] = dihedral.atoms.map(id => bodyMap.get(id));
        if (!a || !b || !c || !d) continue;
        
        // Calculate dihedral angle
        const v1 = vec3.subtract(b.position, a.position);
        const v2 = vec3.subtract(c.position, b.position);
        const v3 = vec3.subtract(d.position, c.position);
        
        const n1 = vec3.cross(v1, v2);
        const n2 = vec3.cross(v2, v3);
        
        const angle = vec3.angle(n1, n2);
        const torque = -dihedral.force * (angle - dihedral.angle);
        
        // Apply torque as forces
        if (body.id === dihedral.atoms[0] || body.id === dihedral.atoms[3]) {
          const axis = vec3.normalize(v2);
          const r = body.id === dihedral.atoms[0] ? v1 : vec3.multiply(v3, -1);
          const force = vec3.multiply(vec3.cross(axis, r), torque / vec3.magnitude(r));
          totalForce = vec3.add(totalForce, force);
        }
      }
      
      return totalForce;
    },
  }),

  // Brownian motion for thermal effects
  brownian: (temperature: number = 300, scale: number = 0.1): Force3D => ({
    type: 'custom',
    calculate: (body: Physics3DBody) => {
      if (body.fixed) return vec3.zero();
      
      // Random force scaled by temperature and inverse mass
      const kT = CONSTANTS.BOLTZMANN * temperature * scale;
      const magnitude = Math.sqrt(2 * kT / body.mass);
      
      return vec3.multiply(vec3.randomUnit(), magnitude);
    },
  }),

  // Drag force for fluid resistance
  drag3D: (coefficient: number = 0.01, fluidDensity: number = 1): Force3D => ({
    type: 'drag',
    calculate: (body: Physics3DBody) => {
      if (body.fixed) return vec3.zero();
      
      const speed = vec3.magnitude(body.velocity);
      if (speed < 0.01) return vec3.zero();
      
      // Stokes drag for low Reynolds number
      const area = Math.PI * body.radius * body.radius;
      const dragMagnitude = 0.5 * coefficient * fluidDensity * area * speed * speed;
      
      return vec3.multiply(vec3.normalize(body.velocity), -dragMagnitude);
    },
  }),

  // Custom force field
  field: (fieldFunction: (position: Vector3D) => Vector3D): Force3D => ({
    type: 'custom',
    calculate: (body: Physics3DBody) => {
      if (body.fixed) return vec3.zero();
      return fieldFunction(body.position);
    },
  }),
};