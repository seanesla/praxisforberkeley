export interface SimpleVector2D {
  x: number;
  y: number;
}

export interface SimpleBody {
  id: string;
  position: SimpleVector2D;
  velocity: SimpleVector2D;
  acceleration: SimpleVector2D;
  mass: number;
  radius: number;
  color?: string;
}

export interface SimplePhysicsConfig {
  gravity: SimpleVector2D;
  drag: number;
  bounds?: {
    width: number;
    height: number;
  };
  timestep: number;
}

export const DEFAULT_SIMPLE_CONFIG: SimplePhysicsConfig = {
  gravity: { x: 0, y: 200 }, // pixels/s^2
  drag: 0.99, // velocity multiplier per frame
  timestep: 1/60, // 60 FPS
  bounds: undefined
};