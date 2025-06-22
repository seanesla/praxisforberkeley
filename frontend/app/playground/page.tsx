'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import RAPIER from '@dimforge/rapier3d-compat';

export default function PlaygroundPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    world: RAPIER.World;
    dynamicBodies: [THREE.Object3D, RAPIER.RigidBody][];
  }>();

  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    const init = async () => {
      await RAPIER.init();
      
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      // Camera
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 5, 10);

      // Renderer with better shadows
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      containerRef.current.appendChild(renderer.domElement);

      // Physics World
      const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
      const world = new RAPIER.World(gravity);
      const dynamicBodies: [THREE.Object3D, RAPIER.RigidBody][] = [];

      // Store references
      sceneRef.current = {
        scene,
        camera,
        renderer,
        world,
        dynamicBodies
      };

      // Lights for better visuals
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const spotLight = new THREE.SpotLight(0xffffff, 30);
      spotLight.position.set(5, 10, 5);
      spotLight.angle = Math.PI / 4;
      spotLight.penumbra = 0.1;
      spotLight.decay = 2;
      spotLight.distance = 200;
      spotLight.castShadow = true;
      spotLight.shadow.bias = -0.001;
      spotLight.shadow.mapSize.width = 2048;
      spotLight.shadow.mapSize.height = 2048;
      scene.add(spotLight);

      // Floor with better material
      const floorGeometry = new THREE.PlaneGeometry(100, 100);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.7,
        metalness: 0.3,
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // Physics floor
      const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
      const floorCollider = RAPIER.ColliderDesc.cuboid(50, 0.1, 50);
      world.createCollider(floorCollider, floorBody);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 3;
      controls.maxDistance = 20;
      controls.maxPolarAngle = Math.PI / 2;

      // Stats
      const stats = new Stats();
      stats.dom.style.position = 'absolute';
      stats.dom.style.top = '0px';
      containerRef.current.appendChild(stats.dom);

      // GUI
      const gui = new GUI({ container: containerRef.current });
      const physicsFolder = gui.addFolder('Physics');
      physicsFolder.add(world.gravity, 'x', -10.0, 10.0, 0.1);
      physicsFolder.add(world.gravity, 'y', -10.0, 10.0, 0.1);
      physicsFolder.add(world.gravity, 'z', -10.0, 10.0, 0.1);

      // Click handler for object spawning
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const handleClick = (event: MouseEvent) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Random type selection
        const types = ['cube', 'sphere', 'icosahedron', 'torus'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        // Spawn point from click
        const spawnPoint = new THREE.Vector3();
        raycaster.ray.at(10, spawnPoint); // Spawn 10 units along ray
        
        spawnObject(randomType, spawnPoint);
      };

      renderer.domElement.addEventListener('click', handleClick);

      // Animation
      const clock = new THREE.Clock();

      function animate() {
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        world.timestep = delta;
        world.step();

        // Update physics objects
        for (let i = 0; i < dynamicBodies.length; i++) {
          const [mesh, body] = dynamicBodies[i];
          mesh.position.copy(body.translation() as any);
          mesh.quaternion.copy(body.rotation() as any);
        }

        controls.update();
        renderer.render(scene, camera);
        stats.update();
      }

      // Handle window resize
      const handleResize = () => {
        if (!sceneRef.current) return;
        const { camera, renderer } = sceneRef.current;
        
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', handleResize);
      animate();
      setIsInitialized(true);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('click', handleClick);
        renderer.dispose();
        gui.destroy();
        containerRef.current?.removeChild(stats.dom);
        containerRef.current?.removeChild(renderer.domElement);
      };
    };

    init();
  }, [isInitialized]);

  const spawnObject = (type: string, position: THREE.Vector3) => {
    if (!sceneRef.current) return;
    const { scene, world, dynamicBodies } = sceneRef.current;

    let mesh: THREE.Mesh;
    let body: RAPIER.RigidBody;
    let shape: RAPIER.ColliderDesc;

    // Colorful material
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      metalness: 0.5,
      roughness: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.2
    });

    switch (type) {
      case 'cube':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
        shape = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        break;

      case 'sphere':
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), material);
        shape = RAPIER.ColliderDesc.ball(0.5);
        break;

      case 'icosahedron':
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5), material);
        const points = new Float32Array(mesh.geometry.attributes.position.array);
        shape = RAPIER.ColliderDesc.convexHull(points) as RAPIER.ColliderDesc;
        break;

      case 'torus':
        mesh = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 16, 32), material);
        const vertices = new Float32Array(mesh.geometry.attributes.position.array);
        const indices = mesh.geometry.index ? new Uint32Array(mesh.geometry.index.array) : undefined;
        shape = indices ? 
          RAPIER.ColliderDesc.trimesh(vertices, indices) as RAPIER.ColliderDesc :
          RAPIER.ColliderDesc.ball(0.5); // Fallback if no indices
        break;

      default:
        return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
    );

    shape.setMass(1).setRestitution(0.7).setFriction(0.3);
    world.createCollider(shape, body);
    dynamicBodies.push([mesh, body]);
  };

  return (
    <div ref={containerRef} className="w-full h-screen relative">
      <div className="absolute top-0 left-0 p-4 text-white text-lg">
        Click anywhere to spawn random shapes!
      </div>
    </div>
  );
}
