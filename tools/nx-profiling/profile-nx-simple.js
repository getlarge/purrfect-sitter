#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create profiling directories
const sessionId = Date.now();
const profileDir = path.join(__dirname, 'sessions', sessionId.toString());

// Create directory structure
fs.mkdirSync(path.join(profileDir, 'cpu', 'parent'), { recursive: true });
fs.mkdirSync(path.join(profileDir, 'cpu', 'workers'), { recursive: true });
fs.mkdirSync(path.join(profileDir, 'trace'), { recursive: true });

console.log(`🎯 Starting profiling session: ${sessionId}`);
console.log(`📁 Profile directory: ${profileDir}`);
console.log(`🔥 CPU profiling only (debugging heap issues)`);

// Get Nx arguments
const nxArgs = process.argv.slice(2);
if (nxArgs.length === 0) {
  console.error('Usage: node profile-nx-simple.js <nx-command> [args...]');
  console.error('Example: node profile-nx-simple.js build admin-dashboard');
  process.exit(1);
}

// Set up environment for child processes (CPU profiling only)
const env = {
  ...process.env,
  NX_PROFILE_SESSION: sessionId.toString(),
  NX_PARENT_PID: process.pid.toString(),
  NX_PROFILE_DIR: profileDir,
  // Enable CPU profiling for child processes
  NODE_OPTIONS: `--cpu-prof --cpu-prof-dir=${path.join(profileDir, 'cpu', 'workers')}`
};

console.log(`🚀 Running: nx ${nxArgs.join(' ')}`);

// Use node with profiling options to run nx
const nxPath = path.join(process.cwd(), 'node_modules', '.bin', 'nx');
const nodeArgs = [
  `--cpu-prof`,
  `--cpu-prof-name=parent-${process.pid}-${sessionId}.cpuprofile`,
  `--cpu-prof-dir=${path.join(profileDir, 'cpu', 'parent')}`,
  nxPath,
  ...nxArgs
];

const nx = spawn('node', nodeArgs, {
  stdio: 'inherit',
  env: env,
  cwd: process.cwd()
});

// Capture start time
const startTime = Date.now();

nx.on('exit', (code) => {
  const duration = Date.now() - startTime;
  
  console.log(`\n✅ Profiling session ${sessionId} completed in ${(duration/1000).toFixed(2)}s`);
  console.log(`📊 Exit code: ${code}`);
  
  // Count generated profiles
  const cpuParentFiles = fs.readdirSync(path.join(profileDir, 'cpu', 'parent')).length;
  const cpuWorkerFiles = fs.readdirSync(path.join(profileDir, 'cpu', 'workers')).length;
  
  console.log(`\n📊 Generated profiles:`);
  console.log(`   CPU: ${cpuParentFiles} parent + ${cpuWorkerFiles} workers`);
  
  // Save session metadata
  const metadata = {
    sessionId,
    command: `nx ${nxArgs.join(' ')}`,
    startTime: new Date(startTime).toISOString(),
    duration,
    exitCode: code,
    parentPid: process.pid,
    profileDir,
    profiles: {
      cpu: { parent: cpuParentFiles, workers: cpuWorkerFiles }
    }
  };
  
  fs.writeFileSync(
    path.join(profileDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`\n📁 Profiles saved in: ${profileDir}`);
  console.log(`\nNext steps:`);
  console.log(`1. CPU Analysis: node profiling/analyze-profiles.js ${sessionId}`);
  console.log(`2. Process Tree: node profiling/process-tree.js ${sessionId}`);
  console.log(`3. View CPU profiles in Chrome DevTools (chrome://inspect)`);
  
  process.exit(code);
});

nx.on('error', (err) => {
  console.error('Failed to start Nx:', err);
  process.exit(1);
});