'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { STEMAnnotation } from '@/lib/stem-viz/types';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface AnnotationSystemProps {
  annotations: STEMAnnotation[];
  selectedObject: string | null;
  hoveredObject: string | null;
  camera: THREE.Camera;
}

function Annotation3D({ 
  annotation, 
  isVisible,
  targetPosition 
}: { 
  annotation: STEMAnnotation; 
  isVisible: boolean;
  targetPosition?: THREE.Vector3;
}) {
  const htmlRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const { camera, size } = useThree();
  
  // Calculate screen position for fixed annotations
  const screenPosition = useMemo(() => {
    if (annotation.style.position === 'fixed' && targetPosition) {
      const vector = targetPosition.clone();
      vector.project(camera);
      
      return {
        x: (vector.x + 1) * size.width / 2,
        y: (-vector.y + 1) * size.height / 2
      };
    }
    return null;
  }, [annotation.style.position, targetPosition, camera, size]);
  
  // Render LaTeX formula if present
  const formulaHtml = useMemo(() => {
    if (annotation.content.formula) {
      try {
        return katex.renderToString(annotation.content.formula, {
          throwOnError: false,
          displayMode: true
        });
      } catch (error) {
        console.error('KaTeX error:', error);
        return annotation.content.formula;
      }
    }
    return null;
  }, [annotation.content.formula]);
  
  if (!isVisible) return null;
  
  const position = annotation.style.anchor && typeof annotation.style.anchor === 'object'
    ? new THREE.Vector3(annotation.style.anchor.x, annotation.style.anchor.y, annotation.style.anchor.z)
    : targetPosition || new THREE.Vector3();
  
  // Different annotation types
  switch (annotation.type) {
    case 'label':
      return (
        <Text
          position={position}
          fontSize={annotation.style.fontSize || 0.3}
          color={annotation.style.color || 'white'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {annotation.content.primary}
        </Text>
      );
    
    case 'callout':
      const offset = annotation.style.anchor === 'top' ? [0, 2, 0] :
                    annotation.style.anchor === 'bottom' ? [0, -2, 0] :
                    annotation.style.anchor === 'left' ? [-2, 0, 0] :
                    annotation.style.anchor === 'right' ? [2, 0, 0] :
                    [1, 1, 1];
      
      const calloutPosition = position.clone().add(new THREE.Vector3(...offset));
      
      return (
        <group>
          {/* Leader line */}
          <Line
            points={[position, calloutPosition]}
            color={annotation.style.lineColor || 'white'}
            lineWidth={annotation.style.lineWidth || 1}
            dashed={true}
            dashScale={5}
          />
          
          {/* Callout content */}
          <Html
            position={calloutPosition}
            center
            style={{
              pointerEvents: 'auto',
              userSelect: 'none'
            }}
          >
            <div
              className={`
                ${annotation.style.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}
                ${annotation.style.theme === 'academic' ? 'bg-blue-50 text-blue-900 border-blue-200' : ''}
                ${annotation.style.theme === 'colorful' ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white' : ''}
                rounded-lg shadow-lg p-3 max-w-xs
                ${annotation.behavior?.animation === 'pulse' ? 'animate-pulse' : ''}
                ${annotation.behavior?.animation === 'fade' ? 'animate-fade-in' : ''}
              `}
              onClick={() => setExpanded(!expanded)}
            >
              <h3 className="font-bold text-sm mb-1">{annotation.content.primary}</h3>
              {annotation.content.secondary && (
                <p className="text-xs opacity-80">{annotation.content.secondary}</p>
              )}
              
              {expanded && (
                <div className="mt-2 space-y-2">
                  {annotation.content.details && (
                    <p className="text-xs">{annotation.content.details}</p>
                  )}
                  
                  {formulaHtml && (
                    <div 
                      className="bg-white/10 p-2 rounded text-center"
                      dangerouslySetInnerHTML={{ __html: formulaHtml }}
                    />
                  )}
                  
                  {annotation.content.value !== undefined && (
                    <div className="text-sm font-mono">
                      {annotation.content.value} {annotation.content.unit}
                    </div>
                  )}
                  
                  {annotation.content.media?.links && (
                    <div className="space-y-1">
                      {annotation.content.media.links.map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline block"
                        >
                          {link.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {annotation.content.interactive?.quiz && (
                <button className="text-xs mt-2 bg-blue-500 text-white px-2 py-1 rounded">
                  Take Quiz
                </button>
              )}
            </div>
          </Html>
        </group>
      );
    
    case 'measurement':
      // For distance, angle, etc. measurements
      return (
        <group>
          <Text
            position={position}
            fontSize={0.2}
            color="yellow"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            {`${annotation.content.value} ${annotation.content.unit}`}
          </Text>
        </group>
      );
    
    case 'data':
      // For real-time data display
      return (
        <Html position={position} center>
          <div className="bg-black/80 text-green-400 font-mono text-xs p-2 rounded">
            <div>{annotation.content.primary}</div>
            {annotation.content.value !== undefined && (
              <div className="text-lg">
                {annotation.content.value} {annotation.content.unit}
              </div>
            )}
          </div>
        </Html>
      );
    
    default:
      return null;
  }
}

export default function AnnotationSystem({
  annotations,
  selectedObject,
  hoveredObject,
  camera
}: AnnotationSystemProps) {
  const { scene } = useThree();
  const [visibleAnnotations, setVisibleAnnotations] = useState<Set<string>>(new Set());
  const [targetPositions, setTargetPositions] = useState<Map<string, THREE.Vector3>>(new Map());
  
  // Update target positions
  useEffect(() => {
    const positions = new Map<string, THREE.Vector3>();
    
    annotations.forEach(annotation => {
      const target = scene.getObjectByName(annotation.targetId);
      if (target && target instanceof THREE.Mesh) {
        positions.set(annotation.targetId, target.position.clone());
      }
    });
    
    setTargetPositions(positions);
  }, [annotations, scene]);
  
  // Determine which annotations should be visible
  useFrame(() => {
    const visible = new Set<string>();
    
    annotations.forEach(annotation => {
      let shouldShow = false;
      
      switch (annotation.style.visibility) {
        case 'always':
          shouldShow = true;
          break;
        
        case 'hover':
          shouldShow = hoveredObject === annotation.targetId;
          break;
        
        case 'click':
          shouldShow = selectedObject === annotation.targetId;
          break;
        
        case 'zoom':
          // Show based on camera distance
          const targetPos = targetPositions.get(annotation.targetId);
          if (targetPos) {
            const distance = camera.position.distanceTo(targetPos);
            shouldShow = distance < 10; // Adjust threshold as needed
          }
          break;
        
        case 'conditional':
          // Use custom condition function
          if (annotation.style.visibilityCondition) {
            shouldShow = annotation.style.visibilityCondition({
              camera: {
                position: { 
                  x: camera.position.x, 
                  y: camera.position.y, 
                  z: camera.position.z 
                },
                rotation: { 
                  x: camera.quaternion.x,
                  y: camera.quaternion.y,
                  z: camera.quaternion.z,
                  w: camera.quaternion.w
                },
                zoom: 1,
                fov: 75
              },
              selection: selectedObject ? [selectedObject] : [],
              highlightedObjects: hoveredObject ? [hoveredObject] : [],
              time: 0,
              playing: false,
              speed: 1,
              parameters: {},
              measurements: [],
              viewMode: 'normal'
            });
          }
          break;
      }
      
      if (shouldShow) {
        visible.add(annotation.id);
      }
    });
    
    setVisibleAnnotations(visible);
  });
  
  // Sort annotations by priority for rendering order
  const sortedAnnotations = useMemo(() => {
    return [...annotations].sort((a, b) => 
      (b.style.priority || 0) - (a.style.priority || 0)
    );
  }, [annotations]);
  
  return (
    <group name="annotations">
      {sortedAnnotations.map(annotation => (
        <Annotation3D
          key={annotation.id}
          annotation={annotation}
          isVisible={visibleAnnotations.has(annotation.id)}
          targetPosition={targetPositions.get(annotation.targetId)}
        />
      ))}
    </group>
  );
}