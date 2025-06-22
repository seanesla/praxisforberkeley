const { spawn } = require('child_process');
const path = require('path');

// Start backend server
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  shell: true,
  stdio: 'inherit'
});

// Start frontend server
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  shell: true,
  stdio: 'inherit'
});

// Handle process exit
const exitHandler = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down servers...`);
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
};

// Handle different termination signals
process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);

console.log('Praxis application started!');
console.log('Backend: http://localhost:5001');
console.log('Frontend: http://localhost:3000');
console.log('Press Ctrl+C to stop the servers.');
