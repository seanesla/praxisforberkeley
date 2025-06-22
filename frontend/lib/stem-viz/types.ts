/**
 * Universal STEM Visualization System Types
 */

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

// Domain types
export type STEMDomain = 
  | 'physics' 
  | 'chemistry' 
  | 'biology' 
  | 'mathematics' 
  | 'engineering' 
  | 'astronomy' 
  | 'earth-science'
  | 'computer-science';

// Visualization input types
export interface VisualizationInput {
  type: 'equation' | 'data' | 'description' | 'file' | 'preset' | 'code';
  
  equation?: {
    formula: string;
    variables: Variable[];
    domain: {
      x?: [number, number];
      y?: [number, number];
      z?: [number, number];
      t?: [number, number];
    };
    resolution?: number;
  };
  
  data?: {
    format: 'csv' | 'json' | 'smiles' | 'pdb' | 'obj' | 'stl' | 'xyz' | 'mol2';
    content: string | ArrayBuffer;
    metadata?: Record<string, any>;
  };
  
  description?: {
    text: string;
    domain: STEMDomain;
    level: 'elementary' | 'middle' | 'high' | 'undergraduate' | 'graduate';
    language?: string;
  };
  
  file?: {
    url: string;
    type: string;
  };
  
  preset?: {
    domain: STEMDomain;
    category: string;
    name: string;
    parameters?: Record<string, any>;
  };
  
  code?: {
    language: 'python' | 'javascript' | 'mathematica' | 'matlab';
    source: string;
  };
}

export interface Variable {
  name: string;
  type: 'independent' | 'dependent' | 'parameter';
  range?: [number, number];
  value?: number;
  unit?: string;
}

// Core visualization objects
export interface STEMObject {
  id: string;
  type: 'primitive' | 'compound' | 'field' | 'particle' | 'constraint';
  domain: STEMDomain;
  geometry: GeometryData;
  material: MaterialData;
  physics?: PhysicsData;
  annotations: STEMAnnotation[];
  metadata: Record<string, any>;
  children?: STEMObject[];
}

export interface GeometryData {
  type: 'sphere' | 'box' | 'cylinder' | 'mesh' | 'line' | 'points' | 'field';
  parameters: any;
  position: Vector3D;
  rotation: Quaternion;
  scale: Vector3D;
}

export interface MaterialData {
  type: 'basic' | 'phong' | 'physical' | 'shader' | 'volumetric';
  color?: string | number;
  opacity?: number;
  emissive?: string | number;
  metalness?: number;
  roughness?: number;
  shader?: ShaderData;
}

export interface ShaderData {
  vertex: string;
  fragment: string;
  uniforms: Record<string, any>;
}

export interface PhysicsData {
  mass?: number;
  velocity?: Vector3D;
  angularVelocity?: Vector3D;
  forces?: Force[];
  constraints?: Constraint[];
  charge?: number;
  temperature?: number;
  pressure?: number;
}

export interface Force {
  type: 'gravity' | 'electric' | 'magnetic' | 'spring' | 'drag' | 'custom';
  magnitude?: number;
  direction?: Vector3D;
  fieldFunction?: (position: Vector3D, time: number) => Vector3D;
}

export interface Constraint {
  type: 'fixed' | 'hinge' | 'ball' | 'spring' | 'distance';
  targetId?: string;
  parameters: any;
}

// Annotation system
export interface STEMAnnotation {
  id: string;
  targetId: string;
  type: 'label' | 'callout' | 'measurement' | 'formula' | 'explanation' | 'data';
  
  content: {
    primary: string;
    secondary?: string;
    details?: string;
    formula?: string; // LaTeX format
    value?: number | string;
    unit?: string;
    difficulty?: 'basic' | 'intermediate' | 'advanced' | 'expert';
    language?: string;
    
    media?: {
      images?: Array<{ url: string; caption?: string }>;
      videos?: Array<{ url: string; caption?: string }>;
      audio?: Array<{ url: string; caption?: string }>;
      links?: Array<{ title: string; url: string; type?: string }>;
      references?: Array<{ citation: string; doi?: string }>;
    };
    
    interactive?: {
      quiz?: QuizQuestion[];
      simulation?: SimulationControl[];
      exploration?: ExplorationTask[];
    };
  };
  
  style: {
    position: 'attached' | 'floating' | 'fixed' | 'orbital';
    anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | Vector3D;
    visibility: 'always' | 'hover' | 'click' | 'zoom' | 'conditional';
    visibilityCondition?: (state: VisualizationState) => boolean;
    theme: 'light' | 'dark' | 'academic' | 'colorful' | 'minimal';
    priority: number; // For managing overlapping annotations
  };
  
  behavior?: {
    tracking?: boolean; // Follow target object
    billboarding?: boolean; // Always face camera
    scaling?: 'fixed' | 'distance' | 'zoom';
    animation?: 'none' | 'pulse' | 'fade' | 'slide';
    sound?: string; // Play sound on interaction
  };
}

// Quiz and interaction types
export interface QuizQuestion {
  question: string;
  type: 'multiple-choice' | 'numeric' | 'true-false' | 'identification';
  options?: string[];
  correctAnswer: string | number | boolean;
  explanation?: string;
  hints?: string[];
}

export interface SimulationControl {
  parameter: string;
  type: 'slider' | 'toggle' | 'select' | 'numeric';
  range?: [number, number];
  options?: Array<{ label: string; value: any }>;
  default: any;
  unit?: string;
  onChange: (value: any) => void;
}

export interface ExplorationTask {
  title: string;
  description: string;
  objective: string;
  checkCompletion: (state: VisualizationState) => boolean;
  hints?: string[];
  reward?: string;
}

// Visualization state
export interface VisualizationState {
  camera: {
    position: Vector3D;
    rotation: Quaternion;
    zoom: number;
    fov: number;
  };
  selection: string[];
  highlightedObjects: string[];
  time: number;
  playing: boolean;
  speed: number;
  parameters: Record<string, any>;
  measurements: Measurement[];
  viewMode: 'normal' | 'xray' | 'wireframe' | 'heatmap' | 'field';
  slicing?: {
    enabled: boolean;
    plane: { normal: Vector3D; distance: number };
  };
}

export interface Measurement {
  id: string;
  type: 'distance' | 'angle' | 'area' | 'volume' | 'velocity' | 'custom';
  points: Vector3D[];
  value: number;
  unit: string;
  visible: boolean;
}

// Domain-specific types
export interface PhysicsSimulation {
  type: 'mechanics' | 'electromagnetics' | 'thermodynamics' | 'quantum' | 'relativity';
  objects: STEMObject[];
  fields?: Field[];
  particles?: Particle[];
  boundary?: BoundaryCondition[];
}

export interface Field {
  type: 'electric' | 'magnetic' | 'gravitational' | 'temperature' | 'pressure' | 'custom';
  fieldFunction: (position: Vector3D, time: number) => Vector3D | number;
  visualization: 'arrows' | 'lines' | 'volume' | 'isosurface';
  colorMap?: string;
}

export interface Particle {
  id: string;
  position: Vector3D;
  velocity: Vector3D;
  mass: number;
  charge?: number;
  spin?: Vector3D;
  lifetime?: number;
  trail?: boolean;
}

export interface BoundaryCondition {
  type: 'reflecting' | 'absorbing' | 'periodic' | 'fixed';
  geometry: GeometryData;
  properties?: any;
}

// Chemical structures
export interface Molecule {
  id: string;
  atoms: Atom[];
  bonds: Bond[];
  properties?: {
    name?: string;
    formula?: string;
    mass?: number;
    charge?: number;
    dipole?: Vector3D;
    energy?: number;
  };
}

export interface Atom {
  id: string;
  element: string;
  position: Vector3D;
  charge?: number;
  hybridization?: string;
  formalCharge?: number;
}

export interface Bond {
  atomA: string;
  atomB: string;
  order: 1 | 1.5 | 2 | 3;
  type: 'single' | 'double' | 'triple' | 'aromatic' | 'coordinate';
  length?: number;
}

// Mathematical objects
export interface MathFunction {
  expression: string;
  variables: string[];
  domain: Record<string, [number, number]>;
  singularities?: Vector3D[];
  criticalPoints?: Vector3D[];
}

export interface GeometricShape {
  type: 'polyhedron' | 'surface' | 'curve' | 'fractal';
  parameters: any;
  symmetries?: string[];
  properties?: Record<string, any>;
}

// Export formats
export interface ExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'gif' | 'mp4' | 'webm' | 'gltf' | 'obj' | 'stl';
  resolution?: [number, number];
  duration?: number; // For animations
  fps?: number;
  quality?: number;
  background?: string;
  includeAnnotations?: boolean;
}