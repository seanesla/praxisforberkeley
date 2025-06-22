"""
Biological and STEM templates for Genesis physics simulations
"""

import numpy as np
import genesis as gs
from typing import Dict, List, Tuple, Optional
import math

class STEMTemplates:
    """Universal STEM visualization templates"""
    
    def __init__(self, scene: gs.Scene):
        self.scene = scene
        
    async def create_template(self, server, template_type: str, parameters: Dict):
        """Route to appropriate template creator"""
        template_map = {
            # Physics
            'pendulum': self.create_pendulum,
            'double_pendulum': self.create_double_pendulum,
            'spring_system': self.create_spring_system,
            'projectile': self.create_projectile,
            'solar_system': self.create_solar_system,
            'electromagnetic_field': self.create_em_field,
            
            # Chemistry
            'water_molecule': self.create_water_molecule,
            'benzene_ring': self.create_benzene_ring,
            'protein_chain': self.create_protein_chain,
            'crystal_lattice': self.create_crystal_lattice,
            'chemical_reaction': self.create_chemical_reaction,
            
            # Biology
            'dna_helix': self.create_dna_helix,
            'cell_membrane': self.create_cell_membrane,
            'mitochondrion': self.create_mitochondrion,
            'neuron': self.create_neuron,
            'virus': self.create_virus_particle,
            
            # Mathematics
            'parametric_surface': self.create_parametric_surface,
            'vector_field': self.create_vector_field,
            'fractal_3d': self.create_fractal_3d,
            'topology_demo': self.create_topology_demo,
            
            # Engineering
            'gear_system': self.create_gear_system,
            'bridge_structure': self.create_bridge_structure,
            'fluid_flow': self.create_fluid_flow,
            'circuit_3d': self.create_circuit_3d,
        }
        
        if template_type in template_map:
            await template_map[template_type](server, parameters)
        else:
            raise ValueError(f"Unknown template type: {template_type}")
    
    # === PHYSICS TEMPLATES ===
    
    async def create_pendulum(self, server, params: Dict):
        """Simple pendulum with adjustable parameters"""
        length = params.get('length', 2.0)
        mass = params.get('mass', 1.0)
        angle = params.get('initial_angle', 30) * np.pi / 180
        
        # Fixed point
        anchor = await server.add_body({
            'id': 'pendulum_anchor',
            'type': 'sphere',
            'radius': 0.1,
            'mass': 0,
            'position': [0, 2, 0],
            'metadata': {
                'name': 'Anchor Point',
                'description': 'Fixed point of pendulum',
                'annotations': ['fixed', 'anchor']
            }
        })
        
        # Pendulum bob
        bob_x = length * np.sin(angle)
        bob_y = 2 - length * np.cos(angle)
        
        bob = await server.add_body({
            'id': 'pendulum_bob',
            'type': 'sphere',
            'radius': 0.2,
            'mass': mass,
            'position': [bob_x, bob_y, 0],
            'metadata': {
                'name': 'Pendulum Bob',
                'description': f'Mass: {mass} kg',
                'annotations': ['mass', 'oscillating'],
                'measurements': {
                    'potential_energy': mass * 9.81 * bob_y,
                    'period': 2 * np.pi * np.sqrt(length / 9.81)
                }
            }
        })
        
        # Add constraint
        await server.add_constraint({
            'id': 'pendulum_rod',
            'type': 'distance',
            'body_a': 'pendulum_anchor',
            'body_b': 'pendulum_bob',
            'distance': length,
            'metadata': {
                'name': 'Pendulum Rod',
                'description': f'Length: {length} m'
            }
        })
        
        # Enable gravity
        self.scene.set_gravity([0, -9.81, 0])
    
    async def create_double_pendulum(self, server, params: Dict):
        """Chaotic double pendulum system"""
        l1 = params.get('length1', 1.0)
        l2 = params.get('length2', 1.0)
        m1 = params.get('mass1', 1.0)
        m2 = params.get('mass2', 1.0)
        
        # Create the double pendulum structure
        # ... (implementation details)
    
    async def create_solar_system(self, server, params: Dict):
        """Simplified solar system with planets"""
        scale = params.get('scale', 1e-9)  # Scale down real distances
        
        # Sun
        sun = await server.add_body({
            'id': 'sun',
            'type': 'sphere',
            'radius': 0.5,
            'mass': 1.989e30 * scale,
            'position': [0, 0, 0],
            'metadata': {
                'name': 'Sun',
                'real_radius': 6.96e8,  # meters
                'temperature': 5778,  # Kelvin
                'annotations': ['star', 'center']
            }
        })
        
        # Earth
        earth_distance = 1.496e11 * scale
        earth = await server.add_body({
            'id': 'earth',
            'type': 'sphere',
            'radius': 0.1,
            'mass': 5.972e24 * scale,
            'position': [earth_distance, 0, 0],
            'velocity': [0, 0, 29780 * scale],  # Orbital velocity
            'metadata': {
                'name': 'Earth',
                'real_radius': 6.371e6,
                'orbital_period': 365.25,  # days
                'annotations': ['planet', 'habitable']
            }
        })
        
        # Add gravitational forces
        # ... (implementation)
    
    # === CHEMISTRY TEMPLATES ===
    
    async def create_water_molecule(self, server, params: Dict):
        """H2O molecule with proper bond angles"""
        bond_length = params.get('bond_length', 0.96)  # Angstroms
        bond_angle = params.get('bond_angle', 104.5) * np.pi / 180
        
        # Oxygen atom (center)
        oxygen = await server.add_body({
            'id': 'water_O',
            'type': 'sphere',
            'radius': 0.066,  # Van der Waals radius in nm
            'mass': 16.0,  # Atomic mass units
            'position': [0, 0, 0],
            'metadata': {
                'element': 'O',
                'name': 'Oxygen',
                'charge': -0.82,  # Partial charge
                'annotations': ['oxygen', 'electronegative'],
                'color': '#FF0000'
            }
        })
        
        # Hydrogen atoms
        h1_x = bond_length * np.sin(bond_angle / 2)
        h1_z = bond_length * np.cos(bond_angle / 2)
        
        hydrogen1 = await server.add_body({
            'id': 'water_H1',
            'type': 'sphere',
            'radius': 0.031,  # Van der Waals radius
            'mass': 1.008,
            'position': [h1_x, 0, h1_z],
            'metadata': {
                'element': 'H',
                'name': 'Hydrogen 1',
                'charge': 0.41,
                'annotations': ['hydrogen', 'polar'],
                'color': '#FFFFFF'
            }
        })
        
        hydrogen2 = await server.add_body({
            'id': 'water_H2',
            'type': 'sphere',
            'radius': 0.031,
            'mass': 1.008,
            'position': [-h1_x, 0, h1_z],
            'metadata': {
                'element': 'H',
                'name': 'Hydrogen 2',
                'charge': 0.41,
                'annotations': ['hydrogen', 'polar'],
                'color': '#FFFFFF'
            }
        })
        
        # Add covalent bonds
        await server.add_constraint({
            'id': 'water_bond_OH1',
            'type': 'spring',
            'body_a': 'water_O',
            'body_b': 'water_H1',
            'stiffness': 500.0,
            'rest_length': bond_length,
            'metadata': {
                'bond_type': 'covalent',
                'order': 1,
                'annotations': ['chemical_bond']
            }
        })
        
        await server.add_constraint({
            'id': 'water_bond_OH2',
            'type': 'spring',
            'body_a': 'water_O',
            'body_b': 'water_H2',
            'stiffness': 500.0,
            'rest_length': bond_length,
            'metadata': {
                'bond_type': 'covalent',
                'order': 1,
                'annotations': ['chemical_bond']
            }
        })
    
    async def create_benzene_ring(self, server, params: Dict):
        """Benzene ring with alternating double bonds"""
        radius = params.get('radius', 1.4)  # Angstroms
        
        # Create 6 carbon atoms in hexagonal arrangement
        for i in range(6):
            angle = i * np.pi / 3
            x = radius * np.cos(angle)
            y = radius * np.sin(angle)
            
            carbon = await server.add_body({
                'id': f'benzene_C{i}',
                'type': 'sphere',
                'radius': 0.07,
                'mass': 12.011,
                'position': [x, y, 0],
                'metadata': {
                    'element': 'C',
                    'name': f'Carbon {i+1}',
                    'hybridization': 'sp2',
                    'annotations': ['carbon', 'aromatic'],
                    'color': '#404040'
                }
            })
            
            # Add hydrogen
            h_angle = angle
            h_x = (radius + 1.1) * np.cos(h_angle)
            h_y = (radius + 1.1) * np.sin(h_angle)
            
            hydrogen = await server.add_body({
                'id': f'benzene_H{i}',
                'type': 'sphere',
                'radius': 0.031,
                'mass': 1.008,
                'position': [h_x, h_y, 0],
                'metadata': {
                    'element': 'H',
                    'name': f'Hydrogen {i+1}',
                    'annotations': ['hydrogen'],
                    'color': '#FFFFFF'
                }
            })
            
            # C-H bond
            await server.add_constraint({
                'id': f'benzene_CH{i}',
                'type': 'spring',
                'body_a': f'benzene_C{i}',
                'body_b': f'benzene_H{i}',
                'stiffness': 400.0,
                'rest_length': 1.1,
                'metadata': {
                    'bond_type': 'covalent',
                    'order': 1
                }
            })
        
        # Create C-C bonds (aromatic)
        for i in range(6):
            next_i = (i + 1) % 6
            await server.add_constraint({
                'id': f'benzene_CC{i}',
                'type': 'spring',
                'body_a': f'benzene_C{i}',
                'body_b': f'benzene_C{next_i}',
                'stiffness': 600.0,
                'rest_length': 1.4,
                'metadata': {
                    'bond_type': 'aromatic',
                    'order': 1.5,
                    'annotations': ['aromatic_bond']
                }
            })
    
    # === BIOLOGY TEMPLATES ===
    
    async def create_dna_helix(self, server, params: Dict):
        """DNA double helix structure"""
        num_base_pairs = params.get('base_pairs', 10)
        radius = params.get('radius', 1.0)
        pitch = params.get('pitch', 3.4)  # Angstroms per turn
        
        bases = ['A', 'T', 'G', 'C']
        base_pairs = {'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G'}
        
        for i in range(num_base_pairs):
            angle = i * 2 * np.pi / 10  # 10 base pairs per turn
            height = i * pitch / 10
            
            # Strand 1
            x1 = radius * np.cos(angle)
            z1 = radius * np.sin(angle)
            
            # Strand 2 (opposite)
            x2 = radius * np.cos(angle + np.pi)
            z2 = radius * np.sin(angle + np.pi)
            
            # Create base pair
            base1 = bases[i % 4]
            base2 = base_pairs[base1]
            
            # Add nucleotides
            nuc1 = await server.add_body({
                'id': f'dna_base1_{i}',
                'type': 'sphere',
                'radius': 0.3,
                'mass': 300.0,  # Approximate mass
                'position': [x1, height, z1],
                'metadata': {
                    'base': base1,
                    'strand': 1,
                    'annotations': ['nucleotide', f'base_{base1}'],
                    'color': self._get_base_color(base1)
                }
            })
            
            nuc2 = await server.add_body({
                'id': f'dna_base2_{i}',
                'type': 'sphere',
                'radius': 0.3,
                'mass': 300.0,
                'position': [x2, height, z2],
                'metadata': {
                    'base': base2,
                    'strand': 2,
                    'annotations': ['nucleotide', f'base_{base2}'],
                    'color': self._get_base_color(base2)
                }
            })
            
            # Hydrogen bonds between base pairs
            await server.add_constraint({
                'id': f'dna_hbond_{i}',
                'type': 'spring',
                'body_a': f'dna_base1_{i}',
                'body_b': f'dna_base2_{i}',
                'stiffness': 50.0,  # Weaker than covalent
                'rest_length': 2 * radius,
                'metadata': {
                    'bond_type': 'hydrogen',
                    'annotations': ['base_pair', 'hydrogen_bond']
                }
            })
            
            # Sugar-phosphate backbone connections
            if i > 0:
                # Connect to previous base in same strand
                await server.add_constraint({
                    'id': f'dna_backbone1_{i}',
                    'type': 'spring',
                    'body_a': f'dna_base1_{i-1}',
                    'body_b': f'dna_base1_{i}',
                    'stiffness': 300.0,
                    'rest_length': pitch / 10,
                    'metadata': {
                        'bond_type': 'backbone',
                        'annotations': ['sugar_phosphate']
                    }
                })
                
                await server.add_constraint({
                    'id': f'dna_backbone2_{i}',
                    'type': 'spring',
                    'body_a': f'dna_base2_{i-1}',
                    'body_b': f'dna_base2_{i}',
                    'stiffness': 300.0,
                    'rest_length': pitch / 10,
                    'metadata': {
                        'bond_type': 'backbone',
                        'annotations': ['sugar_phosphate']
                    }
                })
    
    def _get_base_color(self, base: str) -> str:
        """Get color for DNA base"""
        colors = {
            'A': '#00FF00',  # Adenine - Green
            'T': '#FF0000',  # Thymine - Red
            'G': '#FFFF00',  # Guanine - Yellow
            'C': '#0000FF',  # Cytosine - Blue
        }
        return colors.get(base, '#FFFFFF')
    
    async def create_cell_membrane(self, server, params: Dict):
        """Phospholipid bilayer membrane section"""
        width = params.get('width', 10)
        height = params.get('height', 10)
        spacing = params.get('spacing', 0.5)
        
        # Create a grid of phospholipids
        for i in range(int(width / spacing)):
            for j in range(int(height / spacing)):
                x = i * spacing - width / 2
                z = j * spacing - height / 2
                
                # Upper layer
                head1 = await server.add_body({
                    'id': f'lipid_head_upper_{i}_{j}',
                    'type': 'sphere',
                    'radius': 0.2,
                    'mass': 50.0,
                    'position': [x, 2, z],
                    'metadata': {
                        'component': 'phosphate_head',
                        'layer': 'upper',
                        'annotations': ['hydrophilic', 'membrane'],
                        'color': '#FF6B6B'
                    }
                })
                
                tail1 = await server.add_body({
                    'id': f'lipid_tail_upper_{i}_{j}',
                    'type': 'cylinder',
                    'radius': 0.1,
                    'height': 1.5,
                    'mass': 200.0,
                    'position': [x, 0.75, z],
                    'metadata': {
                        'component': 'fatty_acid_tail',
                        'layer': 'upper',
                        'annotations': ['hydrophobic', 'membrane'],
                        'color': '#4ECDC4'
                    }
                })
                
                # Lower layer
                head2 = await server.add_body({
                    'id': f'lipid_head_lower_{i}_{j}',
                    'type': 'sphere',
                    'radius': 0.2,
                    'mass': 50.0,
                    'position': [x, -2, z],
                    'metadata': {
                        'component': 'phosphate_head',
                        'layer': 'lower',
                        'annotations': ['hydrophilic', 'membrane'],
                        'color': '#FF6B6B'
                    }
                })
                
                tail2 = await server.add_body({
                    'id': f'lipid_tail_lower_{i}_{j}',
                    'type': 'cylinder',
                    'radius': 0.1,
                    'height': 1.5,
                    'mass': 200.0,
                    'position': [x, -0.75, z],
                    'metadata': {
                        'component': 'fatty_acid_tail',
                        'layer': 'lower',
                        'annotations': ['hydrophobic', 'membrane'],
                        'color': '#4ECDC4'
                    }
                })
                
                # Connect head to tail
                await server.add_constraint({
                    'type': 'spring',
                    'body_a': f'lipid_head_upper_{i}_{j}',
                    'body_b': f'lipid_tail_upper_{i}_{j}',
                    'stiffness': 200.0,
                    'rest_length': 1.25
                })
                
                await server.add_constraint({
                    'type': 'spring',
                    'body_a': f'lipid_head_lower_{i}_{j}',
                    'body_b': f'lipid_tail_lower_{i}_{j}',
                    'stiffness': 200.0,
                    'rest_length': 1.25
                })
    
    # === MATHEMATICS TEMPLATES ===
    
    async def create_parametric_surface(self, server, params: Dict):
        """Create a parametric surface from equations"""
        u_range = params.get('u_range', [-np.pi, np.pi])
        v_range = params.get('v_range', [-np.pi, np.pi])
        resolution = params.get('resolution', 20)
        equations = params.get('equations', {
            'x': 'cos(u) * (3 + cos(v))',
            'y': 'sin(u) * (3 + cos(v))',
            'z': 'sin(v)'
        })
        
        # Create grid of points
        u_vals = np.linspace(u_range[0], u_range[1], resolution)
        v_vals = np.linspace(v_range[0], v_range[1], resolution)
        
        for i, u in enumerate(u_vals):
            for j, v in enumerate(v_vals):
                # Evaluate parametric equations
                x = eval(equations['x'], {'u': u, 'v': v, 'np': np, 'cos': np.cos, 'sin': np.sin})
                y = eval(equations['y'], {'u': u, 'v': v, 'np': np, 'cos': np.cos, 'sin': np.sin})
                z = eval(equations['z'], {'u': u, 'v': v, 'np': np, 'cos': np.cos, 'sin': np.sin})
                
                point = await server.add_body({
                    'id': f'surface_point_{i}_{j}',
                    'type': 'sphere',
                    'radius': 0.05,
                    'mass': 0.1,
                    'position': [x, y, z],
                    'metadata': {
                        'u': u,
                        'v': v,
                        'annotations': ['parametric_surface', 'mathematical'],
                        'color': self._get_surface_color(u, v, u_range, v_range)
                    }
                })
                
                # Connect to neighbors with springs
                if i > 0:
                    await server.add_constraint({
                        'type': 'spring',
                        'body_a': f'surface_point_{i-1}_{j}',
                        'body_b': f'surface_point_{i}_{j}',
                        'stiffness': 100.0,
                        'rest_length': 0.5
                    })
                
                if j > 0:
                    await server.add_constraint({
                        'type': 'spring',
                        'body_a': f'surface_point_{i}_{j-1}',
                        'body_b': f'surface_point_{i}_{j}',
                        'stiffness': 100.0,
                        'rest_length': 0.5
                    })
    
    def _get_surface_color(self, u: float, v: float, u_range: List[float], v_range: List[float]) -> str:
        """Generate color based on parametric coordinates"""
        u_norm = (u - u_range[0]) / (u_range[1] - u_range[0])
        v_norm = (v - v_range[0]) / (v_range[1] - v_range[0])
        
        r = int(255 * u_norm)
        g = int(255 * v_norm)
        b = int(255 * (1 - (u_norm + v_norm) / 2))
        
        return f'#{r:02x}{g:02x}{b:02x}'
    
    # === ENGINEERING TEMPLATES ===
    
    async def create_gear_system(self, server, params: Dict):
        """Interlocking gear system"""
        num_gears = params.get('num_gears', 3)
        base_radius = params.get('base_radius', 1.0)
        teeth = params.get('teeth', 20)
        
        for i in range(num_gears):
            x_pos = i * (base_radius * 2.2)
            
            # Create gear center
            gear = await server.add_body({
                'id': f'gear_{i}',
                'type': 'cylinder',
                'radius': base_radius,
                'height': 0.2,
                'mass': 5.0,
                'position': [x_pos, 0, 0],
                'metadata': {
                    'teeth': teeth,
                    'ratio': 1.0,
                    'annotations': ['gear', 'mechanical'],
                    'color': '#808080'
                }
            })
            
            # Add rotation constraint
            if i == 0:
                # Drive gear
                gear.metadata['drive'] = True
                gear.metadata['angular_velocity'] = 1.0  # rad/s
            else:
                # Connect to previous gear
                ratio = (-1) ** i  # Alternating rotation direction
                gear.metadata['gear_ratio'] = ratio

# Alias for backward compatibility
BiologicalTemplates = STEMTemplates