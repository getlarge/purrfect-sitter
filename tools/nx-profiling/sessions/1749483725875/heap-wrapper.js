
const v8 = require('v8');
const fs = require('fs');
const path = require('path');

// Set up heap profiling for this worker
const sessionId = process.env.NX_PROFILE_SESSION;
const heapDir = path.join(process.env.NX_PROFILE_DIR, 'heap', 'workers');
let snapshotCount = 0;

function takeHeapSnapshot(suffix = '') {
  try {
    const filename = path.join(heapDir, `heap-${process.pid}-${sessionId}${suffix}.heapsnapshot`);
    v8.writeHeapSnapshot(filename);
  } catch (e) {
    // Silently ignore heap snapshot errors to avoid spam
  }
}

// Take initial snapshot
takeHeapSnapshot('-start');

// Take snapshots every 5 seconds
const heapInterval = setInterval(() => {
  takeHeapSnapshot(`-${snapshotCount++}`);
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
