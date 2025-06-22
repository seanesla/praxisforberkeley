const { spawn } = require('child_process');
const path = require('path');

// Set up environment
process.env.NODE_ENV = 'development';
process.env.TS_NODE_TRANSPILE_ONLY = 'true'; // Skip type checking

// Start the server
const server = spawn('npx', ['ts-node', 'src/simple-server.ts'], {
  cwd: __dirname,
  env: process.env,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});