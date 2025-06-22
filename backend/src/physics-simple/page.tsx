'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import RAPIER from '@dimforge/rapier3d-compat';

export default function PhysicsSimple() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const init = async () => {
      // Initialize Rapier
      await RAPIER.init();
      
      // Physics world
      const world = new RAPIER.World(new RAPIER.Vector3(0.0, -9.81, 0.0));
      const dynamicBodies: [THREE.Object3D, RAPIER.RigidBody][] = [];
      
      // Three.js setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 5, 10);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      containerRef.current.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      // Lights
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

      // Floor
      const floorGeometry = new THREE.PlaneGeometry(20, 20);
      const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.7,
        metalness: 0.3
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // Physics floor
      const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
      world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1, 10), groundBody);

      // Function to create random color material
      const createRandomMaterial = () => {
        return new THREE.MeshPhysicalMaterial({
          color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
          metalness: 0.5,
          roughness: 0.3,
          clearcoat: 1.0,
          clearcoatRoughness: 0.2
        });
      };

      // Function to spawn objects
      const spawnObject = (type: string, position: THREE.Vector3) => {
        let mesh: THREE.Mesh;
        let body: RAPIER.RigidBody;
        let shape: RAPIER.ColliderDesc;
        const material = createRandomMaterial();

        switch (type) {
          case 'cube':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
            shape = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
            break;

          case 'sphere':
            mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), material);
            shape = RAPIER.ColliderDesc.ball(0.5);
            break;

          case 'cylinder':
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 32), material);
            shape = RAPIER.ColliderDesc.cylinder(0.5, 0.5);
            break;

          case 'icosahedron':
            mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5), material);
            const points = new Float32Array(mesh.geometry.attributes.position.array);
            shape = RAPIER.ColliderDesc.convexHull(points) as RAPIER.ColliderDesc;
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

      // Click handler to spawn objects
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const handleClick = (event: MouseEvent) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        
        const spawnPoint = new THREE.Vector3();
        raycaster.ray.at(5, spawnPoint);
        
        const types = ['cube', 'sphere', 'cylinder', 'icosahedron'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        spawnObject(randomType, spawnPoint);
      };

      renderer.domElement.addEventListener('click', handleClick);

      // Stats
      const stats = new Stats();
      stats.dom.style.position = 'absolute';
      containerRef.current.appendChild(stats.dom);

      // GUI
      const gui = new GUI({ container: containerRef.current });
      const physicsFolder = gui.addFolder('Physics');
      physicsFolder.add(world.gravity, 'x', -10.0, 10.0, 0.1);
      physicsFolder.add(world.gravity, 'y', -10.0, 10.0, 0.1);
      physicsFolder.add(world.gravity, 'z', -10.0, 10.0, 0.1);

      // Animation
      const clock = new THREE.Clock();

      function animate() {
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        world.timestep = Math.min(delta, 0.1);
        world.step();
        
        // Update all dynamic bodies
        for (let i = 0; i < dynamicBodies.length; i++) {
          const [mesh, body] = dynamicBodies[i];
          mesh.position.copy(body.translation() as any);
          mesh.quaternion.copy(body.rotation() as any);
        }
        
        controls.update();
        renderer.render(scene, camera);
        stats.update();
      }

      // Handle resize
      function handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
      window.addEventListener('resize', handleResize);

      animate();

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('click', handleClick);
        if (containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
          containerRef.current.removeChild(stats.dom);
        }
        gui.destroy();
        renderer.dispose();
      };
    };

    init();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-screen relative" />
  );
}
