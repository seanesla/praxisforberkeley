'use client';

import { PhysicsBody } from '@/lib/physics';
import { vec2 } from '@/lib/physics/forces';

interface ForceVisualizerProps {
  bodies: PhysicsBody[];
}

export default function ForceVisualizer({ bodies }: ForceVisualizerProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <marker
          id="arrowhead-velocity"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill="#3B82F6"
          />
        </marker>
        
        <marker
          id="arrowhead-acceleration"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill="#EF4444"
          />
        </marker>
      </defs>
      
      <g transform="translate(50%, 50%)">
        {bodies.map(body => {
          if (body.fixed) return null;
          
          const velocityMag = vec2.magnitude(body.velocity);
          const accelMag = vec2.magnitude(body.acceleration);
          
          // Scale vectors for visualization
          const velocityScale = 0.5;
          const accelScale = 20;
          
          const velocityEnd = {
            x: body.position.x + body.velocity.x * velocityScale,
            y: body.position.y + body.velocity.y * velocityScale
          };
          
          const accelEnd = {
            x: body.position.x + body.acceleration.x * accelScale,
            y: body.position.y + body.acceleration.y * accelScale
          };
          
          return (
            <g key={body.id}>
              {/* Velocity vector (blue) */}
              {velocityMag > 0.1 && (
                <line
                  x1={body.position.x}
                  y1={body.position.y}
                  x2={velocityEnd.x}
                  y2={velocityEnd.y}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead-velocity)"
                  opacity="0.7"
                />
              )}
              
              {/* Acceleration vector (red) */}
              {accelMag > 0.01 && (
                <line
                  x1={body.position.x}
                  y1={body.position.y}
                  x2={accelEnd.x}
                  y2={accelEnd.y}
                  stroke="#EF4444"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead-acceleration)"
                  opacity="0.7"
                />
              )}
              
              {/* Body info */}
              <g transform={`translate(${body.position.x}, ${body.position.y})`}>
                <text
                  x={body.radius + 5}
                  y={-body.radius - 5}
                  fill="white"
                  fontSize="10"
                  opacity="0.7"
                >
                  v: {velocityMag.toFixed(0)}
                </text>
                <text
                  x={body.radius + 5}
                  y={-body.radius + 5}
                  fill="white"
                  fontSize="10"
                  opacity="0.7"
                >
                  a: {accelMag.toFixed(1)}
                </text>
              </g>
            </g>
          );
        })}
      </g>
      
      {/* Legend */}
      <g transform="translate(10, 10)">
        <rect
          x="0"
          y="0"
          width="120"
          height="60"
          fill="rgba(0, 0, 0, 0.7)"
          rx="5"
        />
        
        <line
          x1="10"
          y1="20"
          x2="40"
          y2="20"
          stroke="#3B82F6"
          strokeWidth="2"
          markerEnd="url(#arrowhead-velocity)"
        />
        <text x="50" y="24" fill="white" fontSize="12">
          Velocity
        </text>
        
        <line
          x1="10"
          y1="40"
          x2="40"
          y2="40"
          stroke="#EF4444"
          strokeWidth="2"
          markerEnd="url(#arrowhead-acceleration)"
        />
        <text x="50" y="44" fill="white" fontSize="12">
          Force
        </text>
      </g>
    </svg>
  );
}