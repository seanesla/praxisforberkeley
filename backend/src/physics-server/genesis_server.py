#!/usr/bin/env python3
"""
Genesis Physics Server for Praxis
Handles 3D physics simulation for biological structures
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import numpy as np

import genesis as gs
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PhysicsUpdate:
    """Physics update message structure"""
    timestamp: float
    bodies: List[Dict[str, Any]]
    annotations: Optional[List[Dict[str, Any]]] = None
    metrics: Optional[Dict[str, float]] = None

class GenesisPhysicsServer:
    def __init__(self):
        self.app = FastAPI(title="Genesis Physics Server")
        self.scene: Optional[gs.Scene] = None
        self.solver: Optional[gs.Solver] = None
        self.active_connections: List[WebSocket] = []
        self.is_running = False
        self.physics_task: Optional[asyncio.Task] = None
        self.bodies: Dict[str, gs.Body] = {}
        self.constraints: Dict[str, Any] = {}
        
        # Configure CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000", "http://localhost:3001"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Set up routes
        self._setup_routes()
        
    def _setup_routes(self):
        """Set up FastAPI routes"""
        
        @self.app.on_event("startup")
        async def startup_event():
            await self.initialize_genesis()
        
        @self.app.on_event("shutdown")
        async def shutdown_event():
            await self.cleanup()
        
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await self.handle_websocket(websocket)
        
        @self.app.post("/api/physics/reset")
        async def reset_simulation():
            await self.reset_simulation()
            return {"status": "success", "message": "Simulation reset"}
        
        @self.app.post("/api/physics/pause")
        async def pause_simulation():
            self.is_running = False
            return {"status": "success", "message": "Simulation paused"}
        
        @self.app.post("/api/physics/resume")
        async def resume_simulation():
            self.is_running = True
            return {"status": "success", "message": "Simulation resumed"}
        
        @self.app.post("/api/physics/add_body")
        async def add_body(body_config: Dict[str, Any]):
            body_id = await self.add_body(body_config)
            return {"status": "success", "body_id": body_id}
        
        @self.app.post("/api/physics/remove_body/{body_id}")
        async def remove_body(body_id: str):
            await self.remove_body(body_id)
            return {"status": "success", "message": f"Body {body_id} removed"}
        
        @self.app.post("/api/physics/add_constraint")
        async def add_constraint(constraint_config: Dict[str, Any]):
            constraint_id = await self.add_constraint(constraint_config)
            return {"status": "success", "constraint_id": constraint_id}
        
        @self.app.post("/api/physics/load_preset/{preset_name}")
        async def load_preset(preset_name: str):
            await self.load_biological_preset(preset_name)
            return {"status": "success", "message": f"Preset {preset_name} loaded"}
    
    async def initialize_genesis(self):
        """Initialize Genesis physics engine"""
        try:
            logger.info("Initializing Genesis physics engine...")
            
            # Initialize Genesis
            gs.init()
            
            # Create scene with biological simulation parameters
            self.scene = gs.Scene(
                dt=0.001,  # 1ms timestep for molecular accuracy
                gravity=(0, 0, 0),  # No gravity for molecular simulation
                air_density=1.0,
                air_viscosity=0.0001,
            )
            
            # Create solver with high accuracy for molecular dynamics
            self.solver = gs.Solver(
                scene=self.scene,
                solver_type="PCG",  # Preconditioned Conjugate Gradient
                iterations=50,
                tolerance=1e-6,
            )
            
            logger.info("Genesis initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Genesis: {e}")
            raise
    
    async def handle_websocket(self, websocket: WebSocket):
        """Handle WebSocket connections"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")
        
        try:
            # Start physics loop if not running
            if not self.physics_task or self.physics_task.done():
                self.physics_task = asyncio.create_task(self.physics_loop())
            
            # Keep connection alive and handle messages
            while True:
                data = await websocket.receive_json()
                await self.handle_client_message(websocket, data)
                
        except WebSocketDisconnect:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
    
    async def handle_client_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle messages from client"""
        msg_type = message.get("type")
        
        if msg_type == "apply_force":
            body_id = message.get("body_id")
            force = message.get("force", [0, 0, 0])
            if body_id in self.bodies:
                self.bodies[body_id].add_force(np.array(force))
        
        elif msg_type == "set_position":
            body_id = message.get("body_id")
            position = message.get("position", [0, 0, 0])
            if body_id in self.bodies:
                self.bodies[body_id].set_position(np.array(position))
        
        elif msg_type == "set_velocity":
            body_id = message.get("body_id")
            velocity = message.get("velocity", [0, 0, 0])
            if body_id in self.bodies:
                self.bodies[body_id].set_velocity(np.array(velocity))
    
    async def physics_loop(self):
        """Main physics simulation loop"""
        logger.info("Starting physics loop")
        self.is_running = True
        
        while len(self.active_connections) > 0:
            if self.is_running and self.solver:
                try:
                    # Step physics
                    self.solver.step()
                    
                    # Prepare update
                    update = self.prepare_physics_update()
                    
                    # Broadcast to all connected clients
                    await self.broadcast_update(update)
                    
                    # Control update rate (60 FPS)
                    await asyncio.sleep(1/60)
                    
                except Exception as e:
                    logger.error(f"Physics loop error: {e}")
            else:
                await asyncio.sleep(0.1)
        
        logger.info("Physics loop stopped")
    
    def prepare_physics_update(self) -> PhysicsUpdate:
        """Prepare physics update message"""
        bodies_data = []
        
        for body_id, body in self.bodies.items():
            try:
                # Get body state
                position = body.get_position().tolist()
                rotation = body.get_quaternion().tolist()  # [x, y, z, w]
                velocity = body.get_velocity().tolist()
                
                body_data = {
                    "id": body_id,
                    "position": position,
                    "rotation": rotation,
                    "velocity": velocity,
                    "metadata": body.metadata if hasattr(body, 'metadata') else {}
                }
                bodies_data.append(body_data)
                
            except Exception as e:
                logger.error(f"Error getting state for body {body_id}: {e}")
        
        # Calculate metrics
        metrics = {
            "fps": 60.0,  # Target FPS
            "bodyCount": len(self.bodies),
            "constraintCount": len(self.constraints),
            "simulationTime": time.time()
        }
        
        return PhysicsUpdate(
            timestamp=time.time(),
            bodies=bodies_data,
            metrics=metrics
        )
    
    async def broadcast_update(self, update: PhysicsUpdate):
        """Broadcast update to all connected clients"""
        message = json.dumps(asdict(update))
        
        # Send to all connected clients
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to send update: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
    
    async def add_body(self, config: Dict[str, Any]) -> str:
        """Add a body to the simulation"""
        body_id = config.get("id", f"body_{len(self.bodies)}")
        body_type = config.get("type", "sphere")
        
        try:
            if body_type == "sphere":
                radius = config.get("radius", 1.0)
                mass = config.get("mass", 1.0)
                position = config.get("position", [0, 0, 0])
                
                # Create sphere body
                body = self.scene.add_sphere(
                    radius=radius,
                    mass=mass,
                    position=np.array(position),
                )
                
            elif body_type == "box":
                size = config.get("size", [1, 1, 1])
                mass = config.get("mass", 1.0)
                position = config.get("position", [0, 0, 0])
                
                body = self.scene.add_box(
                    size=np.array(size),
                    mass=mass,
                    position=np.array(position),
                )
            
            # Store metadata
            body.metadata = config.get("metadata", {})
            self.bodies[body_id] = body
            
            logger.info(f"Added body: {body_id}")
            return body_id
            
        except Exception as e:
            logger.error(f"Failed to add body: {e}")
            raise
    
    async def remove_body(self, body_id: str):
        """Remove a body from the simulation"""
        if body_id in self.bodies:
            try:
                self.scene.remove_body(self.bodies[body_id])
                del self.bodies[body_id]
                logger.info(f"Removed body: {body_id}")
            except Exception as e:
                logger.error(f"Failed to remove body: {e}")
                raise
    
    async def add_constraint(self, config: Dict[str, Any]) -> str:
        """Add a constraint between bodies"""
        constraint_id = config.get("id", f"constraint_{len(self.constraints)}")
        constraint_type = config.get("type", "spring")
        
        try:
            if constraint_type == "spring":
                body_a_id = config.get("body_a")
                body_b_id = config.get("body_b")
                stiffness = config.get("stiffness", 100.0)
                damping = config.get("damping", 1.0)
                rest_length = config.get("rest_length", 1.0)
                
                if body_a_id in self.bodies and body_b_id in self.bodies:
                    constraint = self.scene.add_spring(
                        body_a=self.bodies[body_a_id],
                        body_b=self.bodies[body_b_id],
                        stiffness=stiffness,
                        damping=damping,
                        rest_length=rest_length,
                    )
                    self.constraints[constraint_id] = constraint
                    logger.info(f"Added constraint: {constraint_id}")
                    
            return constraint_id
            
        except Exception as e:
            logger.error(f"Failed to add constraint: {e}")
            raise
    
    async def load_biological_preset(self, preset_name: str):
        """Load a biological structure preset"""
        from bio_templates import BiologicalTemplates
        
        templates = BiologicalTemplates(self.scene)
        
        if preset_name == "water_molecule":
            await templates.create_water_molecule(self)
        elif preset_name == "protein_chain":
            await templates.create_protein_chain(self)
        elif preset_name == "dna_helix":
            await templates.create_dna_helix(self)
        elif preset_name == "cell_membrane":
            await templates.create_cell_membrane(self)
        elif preset_name == "mitochondrion":
            await templates.create_mitochondrion(self)
        else:
            logger.warning(f"Unknown preset: {preset_name}")
    
    async def reset_simulation(self):
        """Reset the simulation"""
        logger.info("Resetting simulation")
        
        # Clear all bodies and constraints
        self.bodies.clear()
        self.constraints.clear()
        
        # Recreate scene
        await self.initialize_genesis()
    
    async def cleanup(self):
        """Clean up resources"""
        logger.info("Cleaning up Genesis server")
        self.is_running = False
        
        if self.physics_task:
            self.physics_task.cancel()
        
        # Close all WebSocket connections
        for connection in self.active_connections:
            await connection.close()
        
        self.active_connections.clear()

def main():
    """Main entry point"""
    server = GenesisPhysicsServer()
    
    # Run the server
    uvicorn.run(
        server.app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )

if __name__ == "__main__":
    main()