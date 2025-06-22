'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import RAPIER from '@dimforge/rapier3d-compat';

export default function PhysicsRapierPage() {
  const [command, setCommand] = useState('');
  const sceneRef = useRef<{
    scene: THREE.Scene;
    world: RAPIER.World;
    dynamicBodies: [THREE.Object3D, RAPIER.RigidBody][];
  }>();

  useEffect(() => {
    const init = async () => {
      await RAPIER.init();
      
      const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
      const world = new RAPIER.World(gravity);
      const dynamicBodies: [THREE.Object3D, RAPIER.RigidBody][] = [];

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      // Store references for command handling
      sceneRef.current = {
        scene,
        world,
        dynamicBodies
      };

      // Lights
      const light1 = new THREE.SpotLight(undefined, Math.PI * 10);
      light1.position.set(2.5, 5, 5);
      light1.angle = Math.PI / 3;
      light1.penumbra = 0.5;
      light1.castShadow = true;
      light1.shadow.blurSamples = 10;
      light1.shadow.radius = 5;
      scene.add(light1);

      const light2 = light1.clone();
      light2.position.set(-2.5, 5, 5);
      scene.add(light2);

      // Camera
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 2, 5);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.VSMShadowMap;
      document.body.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.y = 1;

      // Floor
      const floorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(100, 1, 100),
        new THREE.MeshPhongMaterial({ color: 0x808080 })
      );
      floorMesh.receiveShadow = true;
      floorMesh.position.y = -1;
      scene.add(floorMesh);
      const floorBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0)
      );
      const floorShape = RAPIER.ColliderDesc.cuboid(50, 0.5, 50);
      world.createCollider(floorShape, floorBody);

      // Stats
      const stats = new Stats();
      document.body.appendChild(stats.dom);

      // GUI
      const gui = new GUI();
      const physicsFolder = gui.addFolder('Physics');
      physicsFolder.add(world.gravity, 'x', -10.0, 10.0, 0.1);
      physicsFolder.add(world.gravity, 'y', -10.0, 10.0, 0.1);
      physicsFolder.add(world.gravity, 'z', -10.0, 10.0, 0.1);

      // Animation
      const clock = new THREE.Clock();
      let delta;

      function animate() {
        requestAnimationFrame(animate);

        delta = clock.getDelta();
        world.timestep = Math.min(delta, 0.1);
        world.step();

        for (let i = 0, n = dynamicBodies.length; i < n; i++) {
          dynamicBodies[i][0].position.copy(dynamicBodies[i][1].translation() as any);
          dynamicBodies[i][0].quaternion.copy(dynamicBodies[i][1].rotation() as any);
        }

        controls.update();
        renderer.render(scene, camera);
        stats.update();
      }

      // Handle window resize
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', handleResize);
      animate();

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        document.body.removeChild(renderer.domElement);
        document.body.removeChild(stats.dom);
        gui.destroy();
        renderer.dispose();
      };
    };

    init();
  }, []);

  const spawnObject = (type: string) => {
    if (!sceneRef.current) return;
    const { scene, world, dynamicBodies } = sceneRef.current;

    const x = (Math.random() - 0.5) * 4;
    const y = 5 + Math.random() * 2;
    const z = (Math.random() - 0.5) * 4;

    let mesh: THREE.Mesh;
    let body: RAPIER.RigidBody;
    let shape: RAPIER.ColliderDesc;

    switch (type.toLowerCase()) {
      case 'cube':
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshNormalMaterial()
        );
        body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setCanSleep(false)
        );
        shape = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
          .setMass(1)
          .setRestitution(1.1);
        break;

      case 'sphere':
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.5),
          new THREE.MeshNormalMaterial()
        );
        body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setCanSleep(false)
        );
        shape = RAPIER.ColliderDesc.ball(0.5)
          .setMass(1)
          .setRestitution(1.1);
        break;

      case 'cylinder':
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
          new THREE.MeshNormalMaterial()
        );
        body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setCanSleep(false)
        );
        shape = RAPIER.ColliderDesc.cylinder(0.5, 0.5)
          .setMass(1)
          .setRestitution(1.1);
        break;

      default:
        return;
    }

    mesh.castShadow = true;
    scene.add(mesh);
    world.createCollider(shape, body);
    dynamicBodies.push([mesh, body]);
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cmd = command.toLowerCase();
    if (cmd.includes('spawn') || cmd.includes('create') || cmd.includes('add')) {
      if (cmd.includes('cube')) spawnObject('cube');
      else if (cmd.includes('sphere') || cmd.includes('ball')) spawnObject('sphere');
      else if (cmd.includes('cylinder')) spawnObject('cylinder');
    }
    
    setCommand('');
  };

  return (
    <div className="relative w-full h-screen">
      {/* Command Interface */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4">
        <form onSubmit={handleCommand} className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type: spawn cube, spawn sphere, or spawn cylinder"
            className="flex-1 bg-white/10 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
