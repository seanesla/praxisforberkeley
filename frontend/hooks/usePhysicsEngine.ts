import { useEffect, useRef, useCallback, useState } from 'react';
import { 
  PhysicsEngine, 
  PhysicsBody, 
  PhysicsConfig, 
  PhysicsMetrics,
  Spring,
  Force,
  Vector2D 
} from '@/lib/physics';

interface UsePhysicsEngineOptions {
  config?: Partial<PhysicsConfig>;
  onUpdate?: (engine: PhysicsEngine) => void;
  autoStart?: boolean;
}

export function usePhysicsEngine(options: UsePhysicsEngineOptions = {}) {
  const { config, onUpdate, autoStart = true } = options;
  
  const engineRef = useRef<PhysicsEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [metrics, setMetrics] = useState<PhysicsMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Initialize engine
  useEffect(() => {
    engineRef.current = new PhysicsEngine(config);
    
    if (autoStart) {
      start();
    }
    
    return () => {
      stop();
      engineRef.current = null;
    };
  }, []);
  
  // Update config when it changes
  useEffect(() => {
    if (engineRef.current && config) {
      engineRef.current.updateConfig(config);
    }
  }, [config]);
  
  // Animation loop
  const animate = useCallback(() => {
    if (!engineRef.current) return;
    
    engineRef.current.update();
    
    // Update metrics
    const newMetrics = engineRef.current.getMetrics();
    setMetrics(newMetrics);
    
    // Call update callback
    if (onUpdate) {
      onUpdate(engineRef.current);
    }
    
    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [onUpdate]);
  
  // Control methods
  const start = useCallback(() => {
    if (!engineRef.current || animationFrameRef.current !== null) return;
    
    engineRef.current.resume();
    setIsRunning(true);
    animate();
  }, [animate]);
  
  const stop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (engineRef.current) {
      engineRef.current.pause();
    }
    
    setIsRunning(false);
  }, []);
  
  const reset = useCallback(() => {
    stop();
    if (engineRef.current) {
      engineRef.current.reset();
      setMetrics(null);
    }
  }, [stop]);
  
  // Body management
  const addBody = useCallback((body: PhysicsBody) => {
    engineRef.current?.addBody(body);
  }, []);
  
  const removeBody = useCallback((id: string) => {
    engineRef.current?.removeBody(id);
  }, []);
  
  const updateBody = useCallback((id: string, updates: Partial<PhysicsBody>) => {
    engineRef.current?.updateBody(id, updates);
  }, []);
  
  const getBody = useCallback((id: string): PhysicsBody | undefined => {
    return engineRef.current?.getBody(id);
  }, []);
  
  const getBodies = useCallback((): PhysicsBody[] => {
    return engineRef.current?.getBodies() || [];
  }, []);
  
  // Spring management
  const addSpring = useCallback((spring: Spring) => {
    engineRef.current?.addSpring(spring);
  }, []);
  
  const removeSpring = useCallback((id: string) => {
    engineRef.current?.removeSpring(id);
  }, []);
  
  // Force management
  const addForce = useCallback((force: Force) => {
    engineRef.current?.addForce(force);
  }, []);
  
  const clearForces = useCallback(() => {
    engineRef.current?.clearForces();
  }, []);
  
  // Physics interactions
  const applyImpulse = useCallback((bodyId: string, impulse: Vector2D) => {
    engineRef.current?.applyImpulse(bodyId, impulse);
  }, []);
  
  const setPosition = useCallback((bodyId: string, position: Vector2D) => {
    engineRef.current?.setPosition(bodyId, position);
  }, []);
  
  const setVelocity = useCallback((bodyId: string, velocity: Vector2D) => {
    engineRef.current?.setVelocity(bodyId, velocity);
  }, []);
  
  return {
    // Engine reference
    engine: engineRef.current,
    
    // State
    metrics,
    isRunning,
    
    // Control
    start,
    stop,
    reset,
    
    // Body management
    addBody,
    removeBody,
    updateBody,
    getBody,
    getBodies,
    
    // Spring management
    addSpring,
    removeSpring,
    
    // Force management
    addForce,
    clearForces,
    
    // Physics interactions
    applyImpulse,
    setPosition,
    setVelocity,
  };
}