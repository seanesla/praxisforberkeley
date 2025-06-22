'use client';

import { useState } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { PhysicsConfig, PhysicsMetrics, PHYSICS_PRESETS } from '@/lib/physics';

interface PhysicsControlPanelProps {
  config: Partial<PhysicsConfig>;
  metrics: PhysicsMetrics | null;
  onConfigChange: (config: Partial<PhysicsConfig>) => void;
  onToggleForces: () => void;
  showForces: boolean;
  isRunning: boolean;
  onPlayPause: () => void;
  onReset: () => void;
}

export default function PhysicsControlPanel({
  config,
  metrics,
  onConfigChange,
  onToggleForces,
  showForces,
  isRunning,
  onPlayPause,
  onReset
}: PhysicsControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('forceDirected');
  
  const handlePresetChange = (preset: keyof typeof PHYSICS_PRESETS) => {
    setActivePreset(preset);
    onConfigChange(PHYSICS_PRESETS[preset]);
  };
  
  const handleGravityChange = (axis: 'x' | 'y', value: number) => {
    onConfigChange({
      ...config,
      gravity: {
        ...config.gravity!,
        [axis]: value
      }
    });
  };
  
  const handleDampingChange = (value: number) => {
    onConfigChange({
      ...config,
      globalDamping: value
    });
  };
  
  const handleCollisionToggle = () => {
    onConfigChange({
      ...config,
      collisionEnabled: !config.collisionEnabled
    });
  };
  
  const handleIntegratorChange = (integrator: 'euler' | 'verlet' | 'rk4') => {
    onConfigChange({
      ...config,
      integrator
    });
  };
  
  return (
    <div className="absolute bottom-4 right-4 glass rounded-xl overflow-hidden" style={{ width: '320px' }}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            Physics Controls
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {/* Control Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onPlayPause}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 
                       hover:bg-white/20 rounded-lg transition-colors text-sm"
          >
            {isRunning ? (
              <>
                <PauseIcon className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                Play
              </>
            )}
          </button>
          
          <button
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 
                       hover:bg-white/20 rounded-lg transition-colors text-sm"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Reset
          </button>
          
          <button
            onClick={onToggleForces}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title={showForces ? "Hide Forces" : "Show Forces"}
          >
            {showForces ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* Metrics */}
      {metrics && (
        <div className="p-4 border-b border-white/10">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-400">FPS</p>
              <p className="font-mono">{metrics.fps.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-gray-400">Bodies</p>
              <p className="font-mono">{metrics.bodyCount}</p>
            </div>
            <div>
              <p className="text-gray-400">Energy</p>
              <p className="font-mono">{metrics.totalEnergy.toFixed(0)}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Expanded Controls */}
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Presets */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(PHYSICS_PRESETS).map(preset => (
                <button
                  key={preset}
                  onClick={() => handlePresetChange(preset as keyof typeof PHYSICS_PRESETS)}
                  className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                    activePreset === preset
                      ? 'bg-purple-500/30 text-purple-300'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1).replace(/([A-Z])/g, ' $1')}
                </button>
              ))}
            </div>
          </div>
          
          {/* Gravity Controls */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Gravity</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs w-8">X:</span>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  value={config.gravity?.x || 0}
                  onChange={(e) => handleGravityChange('x', Number(e.target.value))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-xs font-mono w-12 text-right">
                  {config.gravity?.x || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-8">Y:</span>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  value={config.gravity?.y || 0}
                  onChange={(e) => handleGravityChange('y', Number(e.target.value))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-xs font-mono w-12 text-right">
                  {config.gravity?.y || 0}
                </span>
              </div>
            </div>
          </div>
          
          {/* Damping */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Damping</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.globalDamping || 0.99}
                onChange={(e) => handleDampingChange(Number(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <span className="text-xs font-mono w-12 text-right">
                {(config.globalDamping || 0.99).toFixed(2)}
              </span>
            </div>
          </div>
          
          {/* Collision Toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.collisionEnabled !== false}
                onChange={handleCollisionToggle}
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className="text-xs">Enable Collisions</span>
            </label>
          </div>
          
          {/* Integrator */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Integration Method</label>
            <select
              value={config.integrator || 'verlet'}
              onChange={(e) => handleIntegratorChange(e.target.value as any)}
              className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-xs"
            >
              <option value="euler">Euler</option>
              <option value="verlet">Verlet (Recommended)</option>
              <option value="rk4">Runge-Kutta 4</option>
            </select>
          </div>
          
          {/* Time Step */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Time Step</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.001"
                max="0.05"
                step="0.001"
                value={config.timeStep || 0.016}
                onChange={(e) => onConfigChange({ ...config, timeStep: Number(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-xs font-mono w-12 text-right">
                {(config.timeStep || 0.016).toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}