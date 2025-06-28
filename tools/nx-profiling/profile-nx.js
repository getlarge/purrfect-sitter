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
fs.mkdirSync(path.join(profileDir, 'heap', 'parent'), { recursive: true });
fs.mkdirSync(path.join(profileDir, 'heap', 'workers'), { recursive: true });
fs.mkdirSync(path.join(profileDir, 'trace'), { recursive: true });

console.log(`🎯 Starting profiling session: ${sessionId}`);
console.log(`📁 Profile directory: ${profileDir}`);
console.log(`🧠 Heap profiling enabled - snapshots every 5 seconds`);

// Get Nx arguments
const nxArgs = process.argv.slice(2);
if (nxArgs.length === 0) {
  console.error('Usage: node profile-nx.js <nx-command> [args...]');
  console.error('Example: node profile-nx.js build admin-dashboard');
  process.exit(1);
}

// Create heap profiling wrapper script for workers
const heapWrapperScript = `
const v8 = require('v8');
const fs = require('fs');
const path = require('path');

// Set up heap profiling for this worker
const sessionId = process.env.NX_PROFILE_SESSION;
const heapDir = path.join(process.env.NX_PROFILE_DIR, 'heap', 'workers');
let snapshotCount = 0;

function takeHeapSnapshot(suffix = '') {
  try {
    const filename = path.join(heapDir, \`heap-\${process.pid}-\${sessionId}\${suffix}.heapsnapshot\`);
    v8.writeHeapSnapshot(filename);
  } catch (e) {
    // Silently ignore heap snapshot errors to avoid spam
  }
}

// Take initial snapshot
takeHeapSnapshot('-start');

// Take snapshots every 5 seconds
const heapInterval = setInterval(() => {
  takeHeapSnapshot(\`-\${snapshotCount++}\`);
}, 5000);

// Take final snapshot on exit
process.on('beforeExit', () => {
  clearInterval(heapInterval);
  takeHeapSnapshot('-end');
});

process.on('SIGINT', () => {
  clearInterval(heapInterval);
  takeHeapSnapshot('-interrupted');
  process.exit(1);
});
`;

// Write heap wrapper to temp file
const wrapperPath = path.join(profileDir, 'heap-wrapper.js');
fs.writeFileSync(wrapperPath, heapWrapperScript);

// Set up environment for child processes
const env = {
  ...process.env,
  NX_PROFILE_SESSION: sessionId.toString(),
  NX_PARENT_PID: process.pid.toString(),
  NX_PROFILE_DIR: profileDir,
  // Enable CPU profiling AND heap profiling for child processes
  NODE_OPTIONS: `--cpu-prof --cpu-prof-dir=${path.join(profileDir, 'cpu', 'workers')} --require=${wrapperPath} --trace-event-categories=node,node.async_hooks,v8,node.perf --trace-event-file-pattern=${path.join(profileDir, 'trace', 'trace-{pid}-{rotation}.log')}`,
};

console.log(`🚀 Running: nx ${nxArgs.join(' ')}`);

// Set up heap profiling for parent process
const v8 = require('v8');
let parentSnapshotCount = 0;

function takeParentHeapSnapshot(suffix = '') {
  try {
    const filename = path.join(
      profileDir,
      'heap',
      'parent',
      `heap-parent-${process.pid}-${sessionId}${suffix}.heapsnapshot`,
    );
    v8.writeHeapSnapshot(filename);
  } catch (e) {
    console.warn('Failed to create parent heap snapshot:', e.message);
  }
}

// Take initial parent heap snapshot
takeParentHeapSnapshot('-start');

// Take parent heap snapshots every 2.5 seconds
const parentHeapInterval = setInterval(() => {
  takeParentHeapSnapshot(`-${parentSnapshotCount++}`);
}, 2500);

// Use node with profiling options to run nx
const nxPath = path.join(process.cwd(), 'node_modules', '.bin', 'nx');
const nodeArgs = [
  `--cpu-prof`,
  `--cpu-prof-name=parent-${process.pid}-${sessionId}.cpuprofile`,
  `--cpu-prof-dir=${path.join(profileDir, 'cpu', 'parent')}`,
  `--trace-event-categories=node,node.async_hooks,v8,node.perf`,
  `--trace-event-file-pattern=${path.join(profileDir, 'trace', 'trace-parent-{pid}-{rotation}.log')}`,
  nxPath,
  ...nxArgs,
];

const nx = spawn('node', nodeArgs, {
  stdio: 'inherit',
  env: env,
  cwd: process.cwd(),
});

// Capture start time
const startTime = Date.now();

nx.on('exit', (code) => {
  const duration = Date.now() - startTime;

  // Stop heap profiling
  clearInterval(parentHeapInterval);
  takeParentHeapSnapshot('-end');

  console.log(
    `\n✅ Profiling session ${sessionId} completed in ${(duration / 1000).toFixed(2)}s`,
  );
  console.log(`📊 Exit code: ${code}`);

  // Count generated profiles
  const cpuParentFiles = fs.readdirSync(
    path.join(profileDir, 'cpu', 'parent'),
  ).length;
  const cpuWorkerFiles = fs.readdirSync(
    path.join(profileDir, 'cpu', 'workers'),
  ).length;
  const heapParentFiles = fs.readdirSync(
    path.join(profileDir, 'heap', 'parent'),
  ).length;
  const heapWorkerFiles = fs.readdirSync(
    path.join(profileDir, 'heap', 'workers'),
  ).length;

  console.log(`\n📊 Generated profiles:`);
  console.log(`   CPU: ${cpuParentFiles} parent + ${cpuWorkerFiles} workers`);
  console.log(
    `   Heap: ${heapParentFiles} parent + ${heapWorkerFiles} workers`,
  );

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
      cpu: { parent: cpuParentFiles, workers: cpuWorkerFiles },
      heap: { parent: heapParentFiles, workers: heapWorkerFiles },
    },
  };

  fs.writeFileSync(
    path.join(profileDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
  );

  // Cleanup temp files
  try {
    fs.unlinkSync(wrapperPath);
  } catch (e) {
    // Ignore cleanup errors
  }

  console.log(`\n📁 Profiles saved in: ${profileDir}`);
  console.log(`\nNext steps:`);
  console.log(
    `1. CPU Analysis: node profiling/analyze-profiles.js ${sessionId}`,
  );
  console.log(`2. Process Tree: node profiling/process-tree.js ${sessionId}`);
  console.log(`3. View CPU profiles in Chrome DevTools (chrome://inspect)`);
  console.log(`4. View heap snapshots in Chrome DevTools Memory tab`);
  console.log(`5. Compare heap snapshots to find memory leaks`);

  process.exit(code);
});

nx.on('error', (err) => {
  clearInterval(parentHeapInterval);
  console.error('Failed to start Nx:', err);
  process.exit(1);
});
