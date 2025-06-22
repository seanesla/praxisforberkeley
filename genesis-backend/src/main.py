from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import json
import asyncio
import logging
from typing import List, Dict, Any
import genesis as gs  # Genesis Python bindings

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PhysicsSimulation:
    def __init__(self):
        # Initialize Genesis simulator
        self.simulator = gs.Simulator()
        self.simulator.init()
        
        # Set default physics parameters
        self.gravity = [0.0, -9.81, 0.0]
        self.simulator.set_gravity(self.gravity)
        
        # Initialize scene
        self.init_scene()
        
    def init_scene(self):
        # Create ground plane
        ground = gs.RigidBody()
        ground.set_mass(0)  # Static body
        ground.set_position([0, -2, 0])
        ground.set_rotation([1, 0, 0, 0])  # Quaternion
        self.simulator.add_rigid_body(ground)
        
    def add_object(self, shape: str, material: str, position: List[float]):
        """Add a new physics object to the simulation."""
        obj = gs.RigidBody()
        
        # Set material properties
        if material == "metal":
            obj.set_density(7800)  # kg/m³
            obj.set_friction(0.1)
            obj.set_restitution(0.5)
        elif material == "wood":
            obj.set_density(700)
            obj.set_friction(0.4)
            obj.set_restitution(0.3)
        elif material == "rubber":
            obj.set_density(1100)
            obj.set_friction(0.8)
            obj.set_restitution(0.8)
        elif material == "glass":
            obj.set_density(2500)
            obj.set_friction(0.2)
            obj.set_restitution(0.7)
            
        # Set shape
        if shape == "box":
            obj.add_box_shape([1, 1, 1])
        elif shape == "sphere":
            obj.add_sphere_shape(0.5)
        elif shape == "cylinder":
            obj.add_cylinder_shape(0.5, 1.0)
            
        obj.set_position(position)
        self.simulator.add_rigid_body(obj)
        
    def step(self) -> Dict[str, Any]:
        """Step the simulation and return object states."""
        self.simulator.step()
        
        # Get all object states
        states = []
        for obj in self.simulator.get_objects():
            state = {
                "position": obj.get_position().tolist(),
                "rotation": obj.get_rotation().tolist(),
                "velocity": obj.get_velocity().tolist()
            }
            states.append(state)
            
        return {"objects": states}
        
    def set_gravity(self, gravity: List[float]):
        """Update gravity vector."""
        self.gravity = gravity
        self.simulator.set_gravity(gravity)
        
    def reset(self):
        """Reset the simulation."""
        self.simulator.reset()
        self.init_scene()

# Global simulation instance
sim = PhysicsSimulation()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Receive command from client
            data = await websocket.receive_text()
            command = json.loads(data)
            
            if command["type"] == "add":
                sim.add_object(
                    shape=command["shape"],
                    material=command["material"],
                    position=command["position"]
                )
                
            elif command["type"] == "gravity":
                sim.set_gravity(command["value"])
                
            elif command["type"] == "reset":
                sim.reset()
                
            # Step simulation and send updated state
            state = sim.step()
            await websocket.send_json(state)
            
            # Add small delay to control simulation rate
            await asyncio.sleep(1/60)  # 60 Hz
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
