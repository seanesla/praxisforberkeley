'use client';

import { useEffect, useRef, useState } from 'react';
import { useSimplePhysics } from '@/hooks/useSimplePhysics';
import { SimpleBody } from '@/lib/physics-simple';

export default function SimplePhysicsDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gravity, setGravity] = useState({ x: 0, y: 200 });
  const [drag, setDrag] = useState(0.99);
  const [showInfo, setShowInfo] = useState(true);

  const {
    bodies,
    isRunning,
    start,
    stop,
    reset,
    addBody,
    clearBodies,
    setGravity: updateGravity,
    setDrag: updateDrag,
    setBounds,
    createRandomBody
  } = useSimplePhysics({
    config: {
      gravity,
      drag,
      bounds: { width: 800, height: 600 }
    },
    autoStart: false
  });

  // Set canvas bounds
  useEffect(() => {
    if (canvasRef.current) {
      setBounds(canvasRef.current.width, canvasRef.current.height);
    }
  }, [setBounds]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw bodies
    bodies.forEach(body => {
      ctx.fillStyle = body.color || '#60a5fa';
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw velocity vector
      if (showInfo) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(body.position.x, body.position.y);
        ctx.lineTo(
          body.position.x + body.velocity.x * 0.1,
          body.position.y + body.velocity.y * 0.1
        );
        ctx.stroke();
      }
    });

    // Draw info
    if (showInfo) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.fillText(`Bodies: ${bodies.length}`, 10, 20);
      ctx.fillText(`Gravity: (${gravity.x.toFixed(0)}, ${gravity.y.toFixed(0)})`, 10, 35);
      ctx.fillText(`Drag: ${drag.toFixed(2)}`, 10, 50);
      ctx.fillText(isRunning ? 'Running' : 'Paused', 10, 65);
    }
  }, [bodies, gravity, drag, isRunning, showInfo]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const body: SimpleBody = {
      id: `body-${Date.now()}`,
      position: { x, y },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
      radius: 10 + Math.random() * 20,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };

    addBody(body);
  };

  // Add random bodies
  const addRandomBodies = (count: number) => {
    for (let i = 0; i < count; i++) {
      const body = createRandomBody({ width: 800, height: 600 });
      addBody(body);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Simple Physics Demo</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            {showInfo ? 'Hide' : 'Show'} Info
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleCanvasClick}
            className="border border-gray-700 rounded cursor-crosshair"
          />
          <div className="absolute bottom-2 left-2 text-xs text-gray-400">
            Click to add bodies
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 w-64">
          {/* Playback controls */}
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold mb-3">Simulation</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={isRunning ? stop : start}
                className={`flex-1 px-3 py-2 rounded ${
                  isRunning
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isRunning ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={reset}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Reset
              </button>
            </div>
            <div className="text-sm text-gray-400">
              Status: {isRunning ? 'Running' : 'Paused'}
            </div>
          </div>

          {/* Body controls */}
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold mb-3">Bodies ({bodies.length})</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => addRandomBodies(5)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                Add 5 Random Bodies
              </button>
              <button
                onClick={() => addRandomBodies(20)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                Add 20 Random Bodies
              </button>
              <button
                onClick={clearBodies}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Physics controls */}
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold mb-3">Physics Settings</h3>
            
            {/* Gravity Y */}
            <div className="mb-4">
              <label className="text-sm text-gray-400">
                Gravity Y: {gravity.y}
              </label>
              <input
                type="range"
                min="-500"
                max="500"
                value={gravity.y}
                onChange={(e) => {
                  const newGravity = { ...gravity, y: Number(e.target.value) };
                  setGravity(newGravity);
                  updateGravity(newGravity);
                }}
                className="w-full"
              />
            </div>

            {/* Gravity X */}
            <div className="mb-4">
              <label className="text-sm text-gray-400">
                Gravity X: {gravity.x}
              </label>
              <input
                type="range"
                min="-500"
                max="500"
                value={gravity.x}
                onChange={(e) => {
                  const newGravity = { ...gravity, x: Number(e.target.value) };
                  setGravity(newGravity);
                  updateGravity(newGravity);
                }}
                className="w-full"
              />
            </div>

            {/* Drag */}
            <div className="mb-4">
              <label className="text-sm text-gray-400">
                Drag: {drag.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.9"
                max="1"
                step="0.001"
                value={drag}
                onChange={(e) => {
                  const newDrag = Number(e.target.value);
                  setDrag(newDrag);
                  updateDrag(newDrag);
                }}
                className="w-full"
              />
            </div>

            {/* Preset buttons */}
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => {
                  const preset = { x: 0, y: 200 };
                  setGravity(preset);
                  updateGravity(preset);
                  setDrag(0.99);
                  updateDrag(0.99);
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              >
                Normal Gravity
              </button>
              <button
                onClick={() => {
                  const preset = { x: 0, y: 0 };
                  setGravity(preset);
                  updateGravity(preset);
                  setDrag(0.999);
                  updateDrag(0.999);
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              >
                Zero Gravity
              </button>
              <button
                onClick={() => {
                  const preset = { x: 100, y: 100 };
                  setGravity(preset);
                  updateGravity(preset);
                  setDrag(0.98);
                  updateDrag(0.98);
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              >
                Wind + Gravity
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-800 p-4 rounded text-sm text-gray-400">
            <h3 className="font-semibold text-white mb-2">How to use:</h3>
            <ul className="space-y-1">
              <li>• Click canvas to add a body</li>
              <li>• Use buttons to add multiple bodies</li>
              <li>• Adjust gravity and drag sliders</li>
              <li>• Bodies bounce off walls</li>
              <li>• Red lines show velocity vectors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}