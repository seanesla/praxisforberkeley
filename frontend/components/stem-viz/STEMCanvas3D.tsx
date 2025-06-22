'use client';

import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Stats } from '@react-three/drei';
import { useGenesisPhysics } from '@/hooks/useGenesisPhysics';
import { STEMObject, VisualizationState, STEMAnnotation } from '@/lib/stem-viz/types';
import STEMObject3D from './STEMObject3D';
import AnnotationSystem from './AnnotationSystem';
import { Vector3, Color } from 'three';

interface STEMCanvas3DProps {
  objects: STEMObject[];
  annotations: STEMAnnotation[];
  onObjectSelect?: (objectId: string | null) => void;
  onStateChange?: (state: VisualizationState) => void;
  backgroundColor?: string;
  showGrid?: boolean;
  showStats?: boolean;
  enablePhysics?: boolean;
}

function Scene({ 
  objects, 
  annotations, 
  onObjectSelect,
  showGrid,
  enablePhysics 
}: Omit<STEMCanvas3DProps, 'backgroundColor' | 'showStats' | 'onStateChange'>) {
  const { camera } = useThree();
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  
  // Physics integration
  const physics = useGenesisPhysics({
    enabled: enablePhysics,
    onUpdate: (update) => {
      // Update object positions from physics
      update.bodies.forEach(body => {
        const object = objects.find(obj => obj.id === body.id);
        if (object) {
          object.geometry.position = {
            x: body.position[0],
            y: body.position[1],
            z: body.position[2]
          };
          // Update rotation if needed
          if (body.rotation) {
            object.geometry.rotation = {
              x: body.rotation[0],
              y: body.rotation[1],
              z: body.rotation[2],
              w: body.rotation[3]
            };
          }
        }
      });
    }
  });
  
  // Sync objects with physics engine
  useEffect(() => {
    if (enablePhysics && physics.isConnected) {
      objects.forEach(obj => {
        if (obj.physics) {
          physics.addBody({
            id: obj.id,
            type: obj.geometry.type,
            position: [
              obj.geometry.position.x,
              obj.geometry.position.y,
              obj.geometry.position.z
            ],
            mass: obj.physics.mass || 1,
            radius: obj.geometry.parameters?.radius || 1,
            metadata: obj.metadata
          });
        }
      });
    }
  }, [objects, enablePhysics, physics]);
  
  const handleObjectClick = (objectId: string) => {
    setSelectedObject(objectId);
    onObjectSelect?.(objectId);
  };
  
  const handleObjectHover = (objectId: string | null) => {
    setHoveredObject(objectId);
  };
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />
      
      {/* Grid */}
      {showGrid && (
        <Grid
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6e6e6e"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#9d9d9d"
          fadeDistance={100}
          fadeStrength={1}
          followCamera={false}
        />
      )}
      
      {/* STEM Objects */}
      {objects.map(object => (
        <STEMObject3D
          key={object.id}
          object={object}
          isSelected={selectedObject === object.id}
          isHovered={hoveredObject === object.id}
          onClick={() => handleObjectClick(object.id)}
          onPointerOver={() => handleObjectHover(object.id)}
          onPointerOut={() => handleObjectHover(null)}
        />
      ))}
      
      {/* Annotations */}
      <AnnotationSystem
        annotations={annotations}
        selectedObject={selectedObject}
        hoveredObject={hoveredObject}
        camera={camera}
      />
    </>
  );
}

export default function STEMCanvas3D({
  objects,
  annotations,
  onObjectSelect,
  onStateChange,
  backgroundColor = '#0a0a0a',
  showGrid = true,
  showStats = false,
  enablePhysics = false
}: STEMCanvas3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visualizationState, setVisualizationState] = useState<VisualizationState>({
    camera: {
      position: { x: 10, y: 10, z: 10 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      zoom: 1,
      fov: 75
    },
    selection: [],
    highlightedObjects: [],
    time: 0,
    playing: false,
    speed: 1,
    parameters: {},
    measurements: [],
    viewMode: 'normal'
  });
  
  useEffect(() => {
    onStateChange?.(visualizationState);
  }, [visualizationState, onStateChange]);
  
  return (
    <div className="w-full h-full relative">
      <Canvas
        ref={canvasRef}
        className="w-full h-full"
        gl={{ 
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true
        }}
        dpr={[1, 2]}
        onCreated={({ scene }) => {
          scene.background = new Color(backgroundColor);
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={[10, 10, 10]}
          fov={75}
          near={0.1}
          far={1000}
        />
        
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.5}
          minDistance={1}
          maxDistance={500}
        />
        
        <Suspense fallback={null}>
          <Scene
            objects={objects}
            annotations={annotations}
            onObjectSelect={onObjectSelect}
            showGrid={showGrid}
            enablePhysics={enablePhysics}
          />
        </Suspense>
        
        {showStats && <Stats />}
      </Canvas>
      
      {/* UI Overlays */}
      <div className="absolute top-4 left-4 text-white text-sm">
        <div className="glass rounded-lg p-3 space-y-1">
          <div>Objects: {objects.length}</div>
          <div>Annotations: {annotations.length}</div>
          {enablePhysics && <div className="text-green-400">Physics Active</div>}
        </div>
      </div>
    </div>
  );
}