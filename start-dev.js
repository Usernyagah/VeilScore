#!/usr/bin/env node
/**
 * Concurrent development server startup script (Node.js version)
 * Starts both the React client and FastAPI backend simultaneously
 * 
 * Usage: node start-dev.js
 * Or: npm run dev:all (from client directory)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const CLIENT_DIR = path.join(SCRIPT_DIR, 'client');
const ZKML_DIR = path.join(SCRIPT_DIR, 'zkml');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check prerequisites
function checkPrerequisites() {
  const checks = [
    { cmd: 'python3', name: 'Python 3' },
    { cmd: 'node', name: 'Node.js' },
    { cmd: 'npm', name: 'npm' },
  ];

  for (const { cmd, name } of checks) {
    try {
      require('child_process').execSync(`which ${cmd}`, { stdio: 'ignore' });
    } catch {
      log(`Error: ${name} not found. Please install it first.`, 'red');
      process.exit(1);
    }
  }
}

// Cleanup function
let processes = [];

function cleanup() {
  log('\nShutting down servers...', 'yellow');
  processes.forEach(proc => {
    try {
      proc.kill('SIGTERM');
    } catch (e) {
      // Ignore errors
    }
  });
  setTimeout(() => {
    processes.forEach(proc => {
      try {
        proc.kill('SIGKILL');
      } catch (e) {
        // Ignore errors
      }
    });
    process.exit(0);
  }, 2000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start API server
function startAPI() {
  log('[1/2] Starting FastAPI backend on port 8000...', 'blue');
  
  const apiProcess = spawn('python3', ['-m', 'api.main'], {
    cwd: ZKML_DIR,
    stdio: 'inherit',
    shell: false,
  });

  apiProcess.on('error', (err) => {
    log(`Error starting API: ${err.message}`, 'red');
    cleanup();
  });

  processes.push(apiProcess);
  log('✓ API server started', 'green');
  return apiProcess;
}

// Start client server
function startClient() {
  log('[2/2] Starting React client on port 8080...', 'blue');

  // Check if node_modules exists
  const nodeModulesPath = path.join(CLIENT_DIR, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('Installing client dependencies...', 'yellow');
    const installProcess = spawn('npm', ['install'], {
      cwd: CLIENT_DIR,
      stdio: 'inherit',
      shell: false,
    });

    installProcess.on('close', (code) => {
      if (code !== 0) {
        log('Error installing dependencies', 'red');
        cleanup();
        return;
      }
      startClientDev();
    });
  } else {
    startClientDev();
  }
}

function startClientDev() {
  const clientProcess = spawn('npm', ['run', 'dev'], {
    cwd: CLIENT_DIR,
    stdio: 'inherit',
    shell: false,
  });

  clientProcess.on('error', (err) => {
    log(`Error starting client: ${err.message}`, 'red');
    cleanup();
  });

  processes.push(clientProcess);
  log('✓ Client server started', 'green');
  
  log('\n========================================', 'green');
  log('Both servers are running!', 'green');
  log('========================================', 'green');
  log('\nFrontend: http://localhost:8080', 'blue');
  log('Backend API: http://localhost:8000', 'blue');
  log('API Health: http://localhost:8000/health', 'blue');
  log('\nPress Ctrl+C to stop both servers', 'yellow');
}

// Main execution
checkPrerequisites();
startAPI();
setTimeout(() => startClient(), 2000);

