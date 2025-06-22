'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STEMObject } from '@/lib/stem-viz/types';
import { Text } from '@react-three/drei';

interface STEMObject3DProps {
  object: STEMObject;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export default function STEMObject3D({
  object,
  isSelected = false,
  isHovered = false,
  onClick,
  onPointerOver,
  onPointerOut
}: STEMObject3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.Mesh>(null);
  
  // Create geometry based on type
  const geometry = useMemo(() => {
    const { type, parameters } = object.geometry;
    
    switch (type) {
      case 'sphere':
        return new THREE.SphereGeometry(
          parameters.radius || 1,
          parameters.segments || 32,
          parameters.segments || 32
        );
      
      case 'box':
        return new THREE.BoxGeometry(
          parameters.width || 1,
          parameters.height || 1,
          parameters.depth || 1
        );
      
      case 'cylinder':
        return new THREE.CylinderGeometry(
          parameters.radiusTop || 1,
          parameters.radiusBottom || 1,
          parameters.height || 2,
          parameters.segments || 32
        );
      
      case 'points':
        // For particle systems
        const pointsGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(parameters.positions || []);
        pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return pointsGeometry;
      
      case 'line':
        // For molecular bonds, field lines, etc.
        const lineGeometry = new THREE.BufferGeometry();
        const linePositions = new Float32Array(parameters.positions || []);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        return lineGeometry;
      
      default:
        return new THREE.SphereGeometry(1);
    }
  }, [object.geometry]);
  
  // Create material based on type
  const material = useMemo(() => {
    const { type, color, opacity, emissive, metalness, roughness } = object.material;
    
    const baseProps = {
      color: new THREE.Color(color || '#ffffff'),
      transparent: opacity !== undefined && opacity < 1,
      opacity: opacity || 1,
    };
    
    switch (type) {
      case 'basic':
        return new THREE.MeshBasicMaterial(baseProps);
      
      case 'phong':
        return new THREE.MeshPhongMaterial({
          ...baseProps,
          emissive: new THREE.Color(emissive || '#000000'),
          shininess: 100
        });
      
      case 'physical':
        return new THREE.MeshPhysicalMaterial({
          ...baseProps,
          metalness: metalness || 0,
          roughness: roughness || 0.5,
          clearcoat: 0.1,
          clearcoatRoughness: 0.1
        });
      
      case 'shader':
        // Custom shader material for advanced effects
        return new THREE.ShaderMaterial({
          vertexShader: object.material.shader?.vertex || '',
          fragmentShader: object.material.shader?.fragment || '',
          uniforms: object.material.shader?.uniforms || {},
          transparent: true
        });
      
      default:
        return new THREE.MeshStandardMaterial(baseProps);
    }
  }, [object.material]);
  
  // Outline material for selection/hover
  const outlineMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: isSelected ? '#00ff00' : '#ffff00',
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.3
    });
  }, [isSelected]);
  
  // Animation for certain objects
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Pulsing effect for selected objects
    if (isSelected && outlineRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      outlineRef.current.scale.setScalar(scale);
    }
    
    // Custom animations based on metadata
    if (object.metadata.animate) {
      const { animationType, speed = 1 } = object.metadata.animate;
      
      switch (animationType) {
        case 'rotate':
          meshRef.current.rotation.y += delta * speed;
          break;
        case 'orbit':
          const radius = object.metadata.animate.radius || 5;
          meshRef.current.position.x = Math.cos(state.clock.elapsedTime * speed) * radius;
          meshRef.current.position.z = Math.sin(state.clock.elapsedTime * speed) * radius;
          break;
        case 'oscillate':
          const amplitude = object.metadata.animate.amplitude || 1;
          meshRef.current.position.y = object.geometry.position.y + 
            Math.sin(state.clock.elapsedTime * speed) * amplitude;
          break;
      }
    }
  });
  
  // Position and rotation from object data
  const position = new THREE.Vector3(
    object.geometry.position.x,
    object.geometry.position.y,
    object.geometry.position.z
  );
  
  const quaternion = new THREE.Quaternion(
    object.geometry.rotation.x,
    object.geometry.rotation.y,
    object.geometry.rotation.z,
    object.geometry.rotation.w
  );
  
  const scale = new THREE.Vector3(
    object.geometry.scale.x,
    object.geometry.scale.y,
    object.geometry.scale.z
  );
  
  // Render different types
  if (object.geometry.type === 'points') {
    return (
      <points
        ref={meshRef as any}
        geometry={geometry}
        position={position}
        quaternion={quaternion}
        scale={scale}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <pointsMaterial
          size={object.material.particleSize || 0.1}
          color={object.material.color || '#ffffff'}
          transparent={true}
          opacity={object.material.opacity || 1}
          sizeAttenuation={true}
        />
      </points>
    );
  }
  
  if (object.geometry.type === 'line') {
    return (
      <line
        ref={meshRef as any}
        geometry={geometry}
        position={position}
        quaternion={quaternion}
        scale={scale}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <lineBasicMaterial
          color={object.material.color || '#ffffff'}
          linewidth={object.material.lineWidth || 1}
          transparent={true}
          opacity={object.material.opacity || 1}
        />
      </line>
    );
  }
  
  // Standard mesh objects
  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        position={position}
        quaternion={quaternion}
        scale={scale}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        castShadow
        receiveShadow
      />
      
      {/* Selection/hover outline */}
      {(isSelected || isHovered) && (
        <mesh
          ref={outlineRef}
          geometry={geometry}
          material={outlineMaterial}
          position={position}
          quaternion={quaternion}
          scale={scale}
        />
      )}
      
      {/* Debug label */}
      {object.metadata.showLabel && (
        <Text
          position={[position.x, position.y + 1, position.z]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {object.metadata.name || object.id}
        </Text>
      )}
      
      {/* Render children recursively */}
      {object.children?.map(child => (
        <STEMObject3D
          key={child.id}
          object={child}
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        />
      ))}
    </group>
  );
}