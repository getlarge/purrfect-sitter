#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProcessTreeVisualizer {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sessionDir = path.join(__dirname, 'sessions', sessionId);
    this.processes = new Map();
  }

  analyze() {
    console.log(`🌳 Analyzing process tree for session: ${this.sessionId}`);

    // Load metadata
    const metadata = JSON.parse(
      fs.readFileSync(path.join(this.sessionDir, 'metadata.json'), 'utf8'),
    );

    console.log(`📝 Command: ${metadata.command}`);
    console.log(`👑 Parent PID: ${metadata.parentPid}`);
    console.log(`⏱️  Duration: ${(metadata.duration / 1000).toFixed(2)}s\n`);

    // Scan worker profiles to extract PIDs and timings
    this.scanWorkerProfiles();

    // Generate process tree
    this.generateTree(metadata.parentPid);

    // Generate timeline
    this.generateTimeline();
  }

  scanWorkerProfiles() {
    const workerDir = path.join(this.sessionDir, 'cpu', 'workers');
    if (!fs.existsSync(workerDir)) return;

    const files = fs
      .readdirSync(workerDir)
      .filter((f) => f.endsWith('.cpuprofile'));
    console.log(`📁 Found ${files.length} worker profiles\n`);

    for (const file of files) {
      // Extract PID and timestamp from filename: CPU.20250609.171815.6528.0.001.cpuprofile
      const match = file.match(
        /CPU\.(\d{8})\.(\d{6})\.(\d+)\.(\d+)\.(\d{3})\.cpuprofile/,
      );
      if (match) {
        const [, date, time, pid, sequence, rotation] = match;
        const timestamp = this.parseTimestamp(date, time);

        // Load profile to get duration
        try {
          const profilePath = path.join(workerDir, file);
          const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

          const samples = profile.samples?.length || 0;
          const timeDeltas = profile.timeDeltas || [];
          const duration =
            timeDeltas.reduce((sum, delta) => sum + delta, 0) / 1000; // Convert to ms

          this.processes.set(pid, {
            pid,
            startTime: timestamp,
            duration,
            samples,
            filename: file,
            type: 'worker',
          });
        } catch (e) {
          console.warn(`⚠️  Failed to parse ${file}`);
        }
      }
    }
  }

  parseTimestamp(date, time) {
    // Convert YYYYMMDD HHMMSS to timestamp
    const year = date.substring(0, 4);
    const month = date.substring(4, 6);
    const day = date.substring(6, 8);
    const hour = time.substring(0, 2);
    const minute = time.substring(2, 4);
    const second = time.substring(4, 6);

    return new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}`,
    ).getTime();
  }

  generateTree(parentPid) {
    console.log('🌳 Process Tree:');
    console.log('═══════════════════════════════════════════\n');

    console.log(`👑 Parent Process (PID: ${parentPid})`);
    console.log(`   └─ Nx Main Process`);

    // Sort workers by start time
    const workers = Array.from(this.processes.values()).sort(
      (a, b) => a.startTime - b.startTime,
    );

    // Group workers by start time (within 100ms = same batch)
    const batches = [];
    let currentBatch = [];
    let lastTime = 0;

    for (const worker of workers) {
      if (worker.startTime - lastTime > 100) {
        if (currentBatch.length > 0) {
          batches.push([...currentBatch]);
        }
        currentBatch = [worker];
      } else {
        currentBatch.push(worker);
      }
      lastTime = worker.startTime;
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    console.log(
      `\n📦 Worker Batches: ${batches.length} batches, ${workers.length} total workers\n`,
    );

    batches.forEach((batch, batchIndex) => {
      const batchTime = new Date(batch[0].startTime).toLocaleTimeString();
      console.log(
        `   ├─ Batch ${batchIndex + 1} (${batchTime}) - ${batch.length} workers`,
      );

      // Show top 5 workers per batch
      const topWorkers = batch
        .sort((a, b) => b.samples - a.samples)
        .slice(0, 5);

      topWorkers.forEach((worker, i) => {
        const isLast =
          i === topWorkers.length - 1 && batchIndex === batches.length - 1;
        const prefix = isLast ? '   │  └─' : '   │  ├─';
        console.log(
          `${prefix} Worker ${worker.pid} (${worker.samples} samples, ${worker.duration.toFixed(1)}ms)`,
        );
      });

      if (batch.length > 5) {
        console.log(`   │  └─ ... and ${batch.length - 5} more workers`);
      }
    });
  }

  generateTimeline() {
    console.log('\n⏰ Process Timeline:');
    console.log('═══════════════════════════════════════════\n');

    const workers = Array.from(this.processes.values()).sort(
      (a, b) => a.startTime - b.startTime,
    );
    if (workers.length === 0) return;

    const firstStart = workers[0].startTime;
    const lastEnd = Math.max(...workers.map((w) => w.startTime + w.duration));
    const totalDuration = lastEnd - firstStart;

    console.log(`📊 Timeline Overview:`);
    console.log(
      `   First worker: ${new Date(firstStart).toLocaleTimeString()}`,
    );
    console.log(`   Last worker: ${new Date(lastEnd).toLocaleTimeString()}`);
    console.log(`   Total span: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(
      `   Parallelism: Up to ${this.calculateMaxParallelism(workers)} concurrent workers\n`,
    );

    // Show timeline in 10-second buckets
    const bucketSize = 2000; // 2 seconds
    const buckets = Math.ceil(totalDuration / bucketSize);

    console.log(
      `📈 Worker Activity Timeline (${bucketSize / 1000}s intervals):`,
    );
    console.log('   Time     | Active Workers | Activity');
    console.log('   ---------|---------------|' + '-'.repeat(50));

    for (let i = 0; i < buckets; i++) {
      const bucketStart = firstStart + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;

      const activeWorkers = workers.filter(
        (w) =>
          w.startTime < bucketEnd && w.startTime + w.duration > bucketStart,
      ).length;

      // const time = new Date(bucketStart).toLocaleTimeString().substring(3, 8); // MM:SS
      const time = new Date(bucketStart).toLocaleTimeString();
      const bar = '█'.repeat(Math.min(50, Math.round(activeWorkers / 2)));

      console.log(
        `   ${time}    | ${activeWorkers.toString().padStart(13)} | ${bar}`,
      );
    }
  }

  calculateMaxParallelism(workers) {
    // Find maximum concurrent workers at any point in time
    const events = [];

    workers.forEach((worker) => {
      events.push({ time: worker.startTime, type: 'start' });
      events.push({ time: worker.startTime + worker.duration, type: 'end' });
    });

    events.sort((a, b) => a.time - b.time);

    let current = 0;
    let max = 0;

    events.forEach((event) => {
      if (event.type === 'start') {
        current++;
        max = Math.max(max, current);
      } else {
        current--;
      }
    });

    return max;
  }
}

// Main execution
const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node process-tree.js <session-id>');
  process.exit(1);
}

const visualizer = new ProcessTreeVisualizer(sessionId);
visualizer.analyze();
