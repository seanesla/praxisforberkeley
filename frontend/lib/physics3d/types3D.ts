export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Physics3DBody {
  id: string;
  position: Vector3D;
  velocity: Vector3D;
  acceleration: Vector3D;
  rotation: Quaternion;
  angularVelocity: Vector3D;
  mass: number;
  radius: number;
  fixed: boolean;
  damping: number;
  angularDamping: number;
  charge?: number;
  type?: 'sphere' | 'capsule' | 'mesh' | 'compound';
  metadata?: any;
  
  // Biological properties
  biologicalType?: 'atom' | 'molecule' | 'organelle' | 'cell' | 'tissue';
  molecularProperties?: {
    element?: string;
    bondType?: 'single' | 'double' | 'triple' | 'aromatic' | 'hydrogen';
    hydrophobicity?: number;
    charge?: number;
  };
}

export interface MolecularBond {
  id: string;
  atomA: string;
  atomB: string;
  bondType: 'single' | 'double' | 'triple' | 'aromatic' | 'hydrogen' | 'ionic' | 'vanDerWaals';
  length: number;
  strength: number;
  order?: number;
}

export interface Force3D {
  type: 'gravity' | 'molecular' | 'electrostatic' | 'vanDerWaals' | 'spring' | 'drag' | 'custom';
  calculate: (body: Physics3DBody, bodies: Physics3DBody[], bonds?: MolecularBond[]) => Vector3D;
}

export interface Physics3DConfig {
  gravity: Vector3D;
  globalDamping: number;
  angularDamping: number;
  collisionEnabled: boolean;
  bounds?: {
    min: Vector3D;
    max: Vector3D;
  };
  timeStep: number;
  maxVelocity: number;
  maxAngularVelocity: number;
  minDistance: number;
  integrator: 'euler' | 'verlet' | 'rk4';
  
  // Molecular simulation parameters
  temperature?: number; // Kelvin
  pressure?: number; // Pascal
  dielectricConstant?: number;
  cutoffDistance?: number;
}

export interface Collision3DResult {
  bodyA: Physics3DBody;
  bodyB: Physics3DBody;
  normal: Vector3D;
  depth: number;
  contactPoint: Vector3D;
}

export interface Physics3DMetrics {
  fps: number;
  bodyCount: number;
  bondCount: number;
  collisionChecks: number;
  totalEnergy: number;
  kineticEnergy: number;
  potentialEnergy: number;
  temperature: number;
  computeTime: number;
}

// Annotation types
export interface Annotation3D {
  id: string;
  targetId: string;
  type: 'label' | 'detailed' | 'measurement' | 'region';
  position: Vector3D;
  offset?: Vector3D;
  content: AnnotationContent;
  visible: boolean;
  interactive: boolean;
  style?: AnnotationStyle;
}

export interface AnnotationContent {
  title: string;
  description?: string;
  properties?: Record<string, any>;
  imageUrl?: string;
  references?: string[];
}

export interface AnnotationStyle {
  color?: string;
  fontSize?: number;
  backgroundColor?: string;
  lineColor?: string;
  lineWidth?: number;
  opacity?: number;
  billboard?: boolean; // Always face camera
}

// Biological structure types
export interface CellStructure {
  id: string;
  type: 'nucleus' | 'mitochondrion' | 'endoplasmicReticulum' | 'golgiApparatus' | 
        'ribosome' | 'lysosome' | 'peroxisome' | 'cytoskeleton' | 'membrane' | 'custom';
  name: string;
  position: Vector3D;
  scale: Vector3D;
  components: Physics3DBody[];
  annotations: Annotation3D[];
}

export interface MolecularStructure {
  id: string;
  name: string;
  formula?: string;
  atoms: Physics3DBody[];
  bonds: MolecularBond[];
  annotations: Annotation3D[];
  conformations?: Array<{
    name: string;
    positions: Record<string, Vector3D>;
    energy: number;
  }>;
}

export interface BiologicalPreset {
  id: string;
  name: string;
  category: 'cell' | 'molecule' | 'protein' | 'dna' | 'organelle' | 'tissue';
  description: string;
  thumbnail?: string;
  structure: CellStructure | MolecularStructure;
  physics: Partial<Physics3DConfig>;
  camera?: {
    position: Vector3D;
    target: Vector3D;
    fov?: number;
  };
}