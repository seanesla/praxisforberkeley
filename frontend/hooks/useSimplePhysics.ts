import { useEffect, useRef, useState, useCallback } from 'react';
import { SimplePhysicsEngine, SimpleBody, SimplePhysicsConfig } from '@/lib/physics-simple';

interface UseSimplePhysicsOptions {
  config?: Partial<SimplePhysicsConfig>;
  autoStart?: boolean;
  onUpdate?: (engine: SimplePhysicsEngine) => void;
}

export function useSimplePhysics({
  config,
  autoStart = true,
  onUpdate
}: UseSimplePhysicsOptions = {}) {
  const engineRef = useRef<SimplePhysicsEngine | null>(null);
  const [bodies, setBodies] = useState<SimpleBody[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize engine
  useEffect(() => {
    console.log('Initializing simple physics engine');
    const engine = new SimplePhysicsEngine(config);
    engineRef.current = engine;

    if (autoStart) {
      startPhysics();
    }

    return () => {
      console.log('Cleaning up simple physics engine');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      engine.stop();
    };
  }, []); // Only initialize once

  // Update config when it changes
  useEffect(() => {
    if (engineRef.current && config) {
      if (config.gravity) engineRef.current.setGravity(config.gravity);
      if (config.drag !== undefined) engineRef.current.setDrag(config.drag);
      if (config.bounds) engineRef.current.setBounds(config.bounds.width, config.bounds.height);
    }
  }, [config]);

  // Animation loop
  const startPhysics = useCallback(() => {
    if (!engineRef.current || isRunning) return;

    console.log('Starting physics animation loop');
    setIsRunning(true);
    
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (!engineRef.current) return;

      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      engineRef.current.update(deltaTime);
      setBodies([...engineRef.current.getBodies()]);
      
      if (onUpdate) {
        onUpdate(engineRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isRunning, onUpdate]);

  const stopPhysics = useCallback(() => {
    console.log('Stopping physics animation loop');
    setIsRunning(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Body management
  const addBody = useCallback((body: SimpleBody) => {
    if (engineRef.current) {
      engineRef.current.addBody(body);
      setBodies([...engineRef.current.getBodies()]);
    }
  }, []);

  const removeBody = useCallback((id: string) => {
    if (engineRef.current) {
      engineRef.current.removeBody(id);
      setBodies([...engineRef.current.getBodies()]);
    }
  }, []);

  const clearBodies = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.clearBodies();
      setBodies([]);
    }
  }, []);

  const reset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      setBodies([]);
      setIsRunning(false);
    }
  }, []);

  // Configuration updates
  const setGravity = useCallback((gravity: { x: number; y: number }) => {
    if (engineRef.current) {
      engineRef.current.setGravity(gravity);
    }
  }, []);

  const setDrag = useCallback((drag: number) => {
    if (engineRef.current) {
      engineRef.current.setDrag(drag);
    }
  }, []);

  const setBounds = useCallback((width: number, height: number) => {
    if (engineRef.current) {
      engineRef.current.setBounds(width, height);
    }
  }, []);

  // Utility
  const createRandomBody = useCallback((bounds: { width: number; height: number }) => {
    return SimplePhysicsEngine.createRandomBody(bounds);
  }, []);

  return {
    // State
    bodies,
    isRunning,
    
    // Controls
    start: startPhysics,
    stop: stopPhysics,
    reset,
    
    // Body management
    addBody,
    removeBody,
    clearBodies,
    createRandomBody,
    
    // Configuration
    setGravity,
    setDrag,
    setBounds,
    
    // Direct engine access (if needed)
    engine: engineRef.current
  };
}