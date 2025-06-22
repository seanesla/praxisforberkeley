import SimplePhysicsDemo from '@/components/physics-demo/SimplePhysicsDemo';

export default function PhysicsDemoPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Simple Physics Engine Demo</h1>
          <p className="text-gray-400 max-w-3xl">
            This is a simplified physics engine implementation focusing on the essentials.
            It features basic particle dynamics with gravity, drag, and boundary collisions.
            The engine uses Euler integration for simplicity and clarity.
          </p>
        </div>
        
        <SimplePhysicsDemo />
        
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Features</h2>
            <ul className="space-y-2 text-gray-400">
              <li>✓ Basic particle system with position, velocity, acceleration</li>
              <li>✓ Simple Euler integration for motion</li>
              <li>✓ Configurable gravity (X and Y axes)</li>
              <li>✓ Air resistance/drag simulation</li>
              <li>✓ Boundary collision with energy loss</li>
              <li>✓ Real-time physics at 60 FPS</li>
              <li>✓ Interactive canvas - click to add particles</li>
              <li>✓ Visual velocity vectors</li>
            </ul>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Implementation Details</h2>
            <ul className="space-y-2 text-gray-400">
              <li>• No collision detection between bodies (simplified)</li>
              <li>• Fixed timestep with frame-based updates</li>
              <li>• Minimal configuration options</li>
              <li>• React hook for easy integration</li>
              <li>• Canvas-based rendering</li>
              <li>• TypeScript for type safety</li>
              <li>• ~300 lines of code total</li>
              <li>• Focus on clarity over performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}