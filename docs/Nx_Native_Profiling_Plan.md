# Native Node.js Profiling Plan for Nx Tasks
## With Parent-Child Process Correlation

### Executive Summary
This plan outlines how to use native Node.js profiling tools to capture and correlate performance data across Nx's parent process and worker processes.

---

## 1. Environment Setup for Process Correlation

### 1.1 Create Profiling Infrastructure
```bash
# Create directories for organized profile collection
mkdir -p profiling/{cpu,heap,trace}/{parent,workers}
mkdir -p profiling/reports
```

### 1.2 Environment Variables for Process Identification
```bash
# profiling-env.sh
export NODE_OPTIONS="--cpu-prof --cpu-prof-dir=./profiling/cpu"
export NX_PROFILE_NAME_PREFIX="nx-task"
export NX_PROFILE_SESSION=$(date +%s)
```

---

## 2. CPU Profiling with Process Correlation

### 2.1 Parent Process Profiling
```bash
# Create wrapper script: profile-nx.js
const { spawn } = require('child_process');
const path = require('path');

const sessionId = Date.now();
const parentPid = process.pid;

// Set up parent profiling
process.env.NODE_OPTIONS = `--cpu-prof --cpu-prof-name=parent-${parentPid}-${sessionId}.cpuprofile --cpu-prof-dir=./profiling/cpu/parent`;

// Inject session ID for child processes
process.env.NX_PROFILE_SESSION = sessionId;
process.env.NX_PARENT_PID = parentPid;

// Launch Nx with arguments
const nx = spawn('node', ['node_modules/.bin/nx', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    // Force child processes to also profile
    NODE_OPTIONS: `--cpu-prof --cpu-prof-dir=./profiling/cpu/workers`
  }
});

nx.on('exit', (code) => {
  console.log(`Profile session ${sessionId} completed`);
  process.exit(code);
});
```

### 2.2 Worker Process Identification
```bash
# Create Nx wrapper to inject profiling: nx-profile-wrapper.js
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  const module = originalRequire.apply(this, arguments);
  
  // Intercept worker creation
  if (id.includes('worker_threads') || id.includes('child_process')) {
    return wrapWorkerModule(module, id);
  }
  
  return module;
};

function wrapWorkerModule(module, moduleId) {
  if (moduleId.includes('child_process')) {
    const originalFork = module.fork;
    module.fork = function(modulePath, args, options) {
      const sessionId = process.env.NX_PROFILE_SESSION;
      const parentPid = process.env.NX_PARENT_PID || process.pid;
      
      options = options || {};
      options.env = {
        ...process.env,
        ...options.env,
        NODE_OPTIONS: `--cpu-prof --cpu-prof-name=worker-${process.pid}-parent${parentPid}-${sessionId}.cpuprofile --cpu-prof-dir=./profiling/cpu/workers`
      };
      
      return originalFork.call(this, modulePath, args, options);
    };
  }
  
  return module;
}
```

---

## 3. Trace Events for Process Timeline

### 3.1 Enable Trace Events
```bash
# Capture trace events with categories
NODE_OPTIONS="--trace-event-categories=node,node.async_hooks,v8,node.perf" \
node profile-nx.js affected --targets=build --parallel=4
```

### 3.2 Custom Trace Events for Nx Tasks
```javascript
// inject-trace-events.js
const { performance } = require('perf_hooks');
const fs = require('fs');

class NxTaskTracer {
  constructor() {
    this.events = [];
    this.sessionId = process.env.NX_PROFILE_SESSION;
    this.processType = process.pid === Number(process.env.NX_PARENT_PID) ? 'parent' : 'worker';
  }

  traceTaskStart(taskName, target) {
    const event = {
      name: `nx:${taskName}`,
      cat: 'nx.task',
      ph: 'B', // Begin
      pid: process.pid,
      tid: 1,
      ts: performance.now() * 1000,
      args: {
        target,
        sessionId: this.sessionId,
        parentPid: process.env.NX_PARENT_PID,
        processType: this.processType
      }
    };
    this.events.push(event);
  }

  traceTaskEnd(taskName) {
    const event = {
      name: `nx:${taskName}`,
      cat: 'nx.task',
      ph: 'E', // End
      pid: process.pid,
      tid: 1,
      ts: performance.now() * 1000
    };
    this.events.push(event);
  }

  save() {
    const filename = `./profiling/trace/${this.processType}/trace-${process.pid}-${this.sessionId}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.events));
  }
}
```

---

## 4. Memory Profiling with Heap Snapshots

### 4.1 Periodic Heap Snapshots
```javascript
// heap-profiler.js
const v8 = require('v8');
const fs = require('fs');

function setupHeapProfiling() {
  const sessionId = process.env.NX_PROFILE_SESSION;
  const processType = process.pid === Number(process.env.NX_PARENT_PID) ? 'parent' : 'worker';
  
  // Take heap snapshot at intervals
  let snapshotCount = 0;
  
  setInterval(() => {
    const filename = `./profiling/heap/${processType}/heap-${process.pid}-${sessionId}-${snapshotCount++}.heapsnapshot`;
    const stream = fs.createWriteStream(filename);
    v8.writeHeapSnapshot(stream);
  }, 30000); // Every 30 seconds

  // Take snapshot on exit
  process.on('beforeExit', () => {
    const filename = `./profiling/heap/${processType}/heap-${process.pid}-${sessionId}-final.heapsnapshot`;
    v8.writeHeapSnapshot(filename);
  });
}
```

---

## 5. Process Correlation Script

### 5.1 Merge and Correlate Profiles
```javascript
// correlate-profiles.js
const fs = require('fs');
const path = require('path');

class ProfileCorrelator {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.profiles = {
      parent: null,
      workers: []
    };
  }

  async loadProfiles() {
    // Load parent profile
    const parentDir = './profiling/cpu/parent';
    const parentFiles = fs.readdirSync(parentDir)
      .filter(f => f.includes(this.sessionId));
    
    if (parentFiles.length) {
      this.profiles.parent = JSON.parse(
        fs.readFileSync(path.join(parentDir, parentFiles[0]))
      );
    }

    // Load worker profiles
    const workerDir = './profiling/cpu/workers';
    const workerFiles = fs.readdirSync(workerDir)
      .filter(f => f.includes(this.sessionId));
    
    for (const file of workerFiles) {
      const profile = JSON.parse(
        fs.readFileSync(path.join(workerDir, file))
      );
      this.profiles.workers.push({
        filename: file,
        pid: this.extractPid(file),
        profile
      });
    }
  }

  extractPid(filename) {
    const match = filename.match(/worker-(\d+)-/);
    return match ? match[1] : 'unknown';
  }

  generateReport() {
    const report = {
      sessionId: this.sessionId,
      summary: {
        parentPid: this.profiles.parent?.pid,
        workerCount: this.profiles.workers.length,
        totalSamples: this.countTotalSamples(),
        timeRange: this.getTimeRange()
      },
      processes: this.analyzeProcesses()
    };

    return report;
  }

  analyzeProcesses() {
    const analysis = {};

    // Analyze parent
    if (this.profiles.parent) {
      analysis.parent = this.analyzeProfile(this.profiles.parent);
    }

    // Analyze workers
    analysis.workers = {};
    for (const worker of this.profiles.workers) {
      analysis.workers[worker.pid] = this.analyzeProfile(worker.profile);
    }

    return analysis;
  }

  analyzeProfile(profile) {
    // Extract hot functions and time spent
    const nodes = profile.nodes || [];
    const samples = profile.samples || [];
    
    // Count samples per function
    const functionCounts = {};
    for (const nodeId of samples) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const key = `${node.callFrame.functionName || 'anonymous'}@${node.callFrame.url}`;
        functionCounts[key] = (functionCounts[key] || 0) + 1;
      }
    }

    // Sort by sample count
    const topFunctions = Object.entries(functionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        samples: count,
        percentage: (count / samples.length * 100).toFixed(2)
      }));

    return {
      totalSamples: samples.length,
      topFunctions
    };
  }

  saveReport(outputPath) {
    const report = this.generateReport();
    fs.writeFileSync(
      outputPath,
      JSON.stringify(report, null, 2)
    );
  }
}

// Usage
const sessionId = process.argv[2];
const correlator = new ProfileCorrelator(sessionId);
correlator.loadProfiles().then(() => {
  correlator.saveReport(`./profiling/reports/report-${sessionId}.json`);
});
```

---

## 6. Practical Usage Examples

### 6.1 Profile a Full Build
```bash
# Run profiled build
node profile-nx.js build admin-dashboard --verbose

# Correlate results
node correlate-profiles.js $NX_PROFILE_SESSION
```

### 6.2 Profile Parallel Tasks
```bash
# Profile parallel execution
node profile-nx.js affected --targets=build,test,lint --parallel=4

# Generate timeline visualization
node generate-timeline.js $NX_PROFILE_SESSION
```

### 6.3 Profile Memory Usage
```bash
# Enable heap profiling
NODE_OPTIONS="--expose-gc" node profile-nx.js run-many --all -t build

# Analyze heap growth
node analyze-heap-growth.js $NX_PROFILE_SESSION
```

---

## 7. Visualization and Analysis

### 7.1 Chrome DevTools Integration
```bash
# Merge CPU profiles for Chrome DevTools
node merge-profiles.js $NX_PROFILE_SESSION > merged-$NX_PROFILE_SESSION.cpuprofile

# Open in Chrome DevTools
# chrome://inspect > Open dedicated DevTools for Node
# Load the merged profile
```

### 7.2 Trace Event Timeline
```bash
# Merge trace events
cat profiling/trace/**/*-$NX_PROFILE_SESSION.json | jq -s 'add' > timeline-$NX_PROFILE_SESSION.json

# View in Chrome Tracing
# chrome://tracing > Load timeline-$NX_PROFILE_SESSION.json
```

### 7.3 Generate HTML Report
```javascript
// generate-html-report.js
const fs = require('fs');

function generateHTMLReport(sessionId) {
  const report = JSON.parse(
    fs.readFileSync(`./profiling/reports/report-${sessionId}.json`)
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Nx Profile Report - Session ${sessionId}</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .process { border: 1px solid #ccc; margin: 10px 0; padding: 10px; }
    .worker { margin-left: 20px; }
  </style>
</head>
<body>
  <h1>Nx Profiling Report</h1>
  <h2>Session: ${sessionId}</h2>
  
  <div class="summary">
    <h3>Summary</h3>
    <p>Parent PID: ${report.summary.parentPid}</p>
    <p>Worker Processes: ${report.summary.workerCount}</p>
    <p>Total Samples: ${report.summary.totalSamples}</p>
  </div>

  <div id="timeline"></div>
  
  <h3>Process Analysis</h3>
  ${generateProcessHTML(report.processes)}
  
  <script>
    // Add interactive timeline visualization here
  </script>
</body>
</html>
  `;

  fs.writeFileSync(`./profiling/reports/report-${sessionId}.html`, html);
}
```

---

## 8. Best Practices

### 8.1 Profiling Strategy
1. **Baseline First**: Profile without any changes
2. **Isolate Variables**: Profile one change at a time
3. **Multiple Runs**: Average results across runs
4. **Clean Environment**: Clear Nx cache between runs

### 8.2 Performance Impact
- CPU profiling: ~5-10% overhead
- Heap snapshots: Causes GC pauses
- Trace events: Minimal overhead
- Combined: ~15-20% slower execution

### 8.3 Storage Management
```bash
# Cleanup old profiles
find ./profiling -name "*.cpuprofile" -mtime +7 -delete
find ./profiling -name "*.heapsnapshot" -mtime +7 -delete
```

---

## 9. Integration with Nx

### 9.1 Custom Nx Executor
```typescript
// tools/executors/profile/impl.ts
import { ExecutorContext } from '@nx/devkit';
import { spawn } from 'child_process';

export default async function profileExecutor(
  options: { target: string; args: string[] },
  context: ExecutorContext
) {
  const sessionId = Date.now();
  
  const child = spawn('node', [
    'profile-nx.js',
    options.target,
    ...options.args
  ], {
    env: {
      ...process.env,
      NX_PROFILE_SESSION: sessionId.toString()
    }
  });

  return new Promise((resolve) => {
    child.on('exit', (code) => {
      console.log(`Profile saved: ${sessionId}`);
      resolve({ success: code === 0, sessionId });
    });
  });
}
```

### 9.2 Usage in project.json
```json
{
  "targets": {
    "profile:build": {
      "executor": "./tools/executors/profile:profile",
      "options": {
        "target": "build",
        "args": ["--verbose"]
      }
    }
  }
}
```

---

## Conclusion

This native Node.js profiling approach provides:
- ✅ Complete process correlation via session IDs
- ✅ Parent-child relationship tracking
- ✅ No external dependencies
- ✅ Works with Nx's parallel execution
- ✅ Rich visualization options
- ✅ Scriptable and automatable

The key insight is using environment variables to propagate session and parent information to child processes, allowing post-processing correlation of all profiling data.