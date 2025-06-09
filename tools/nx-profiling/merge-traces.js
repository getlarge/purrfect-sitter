#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TraceMerger {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sessionDir = path.join(__dirname, 'sessions', sessionId);
    this.events = [];
  }

  merge() {
    console.log(`🔄 Merging trace events for session: ${this.sessionId}`);

    const traceDir = path.join(this.sessionDir, 'trace');
    if (!fs.existsSync(traceDir)) {
      console.error('No trace directory found!');
      return;
    }

    // Load all trace files
    const traceFiles = fs.readdirSync(traceDir).filter(f => f.endsWith('.log'));
    console.log(`📁 Found ${traceFiles.length} trace files`);

    for (const file of traceFiles) {
      try {
        const content = fs.readFileSync(path.join(traceDir, file), 'utf8');
        // Trace events are in JSON format, one per line
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            // Add session metadata
            if (event.args) {
              event.args.sessionId = this.sessionId;
            }
            this.events.push(event);
          } catch (e) {
            // Skip malformed lines
          }
        }
      } catch (e) {
        console.warn(`⚠️  Failed to load trace file ${file}:`, e.message);
      }
    }

    console.log(`📊 Loaded ${this.events.length} trace events`);

    // Sort events by timestamp
    this.events.sort((a, b) => (a.ts || 0) - (b.ts || 0));

    // Create Chrome-compatible trace format
    const trace = {
      traceEvents: this.events,
      metadata: {
        'command-line': `nx profiling session ${this.sessionId}`,
        'cpu-count': require('os').cpus().length
      }
    };

    // Save merged trace
    const outputPath = path.join(this.sessionDir, `merged-trace-${this.sessionId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(trace));

    console.log(`✅ Merged trace saved to: ${outputPath}`);
    console.log(`\n📊 View in Chrome Tracing:`);
    console.log(`   1. Open chrome://tracing`);
    console.log(`   2. Click 'Load' and select the file above`);

    // Generate summary
    this.generateSummary();
  }

  generateSummary() {
    const summary = {
      totalEvents: this.events.length,
      eventTypes: {},
      processes: new Set(),
      threads: new Set(),
      categories: new Set(),
      timeRange: {
        start: Infinity,
        end: -Infinity
      }
    };

    for (const event of this.events) {
      // Count event types
      const type = event.ph || 'unknown';
      summary.eventTypes[type] = (summary.eventTypes[type] || 0) + 1;

      // Track processes and threads
      if (event.pid) summary.processes.add(event.pid);
      if (event.tid) summary.threads.add(event.tid);
      if (event.cat) summary.categories.add(event.cat);

      // Track time range
      if (event.ts) {
        summary.timeRange.start = Math.min(summary.timeRange.start, event.ts);
        summary.timeRange.end = Math.max(summary.timeRange.end, event.ts);
      }
    }

    const duration = (summary.timeRange.end - summary.timeRange.start) / 1000000; // Convert to seconds

    console.log(`\n📈 Trace Summary:`);
    console.log(`   Duration: ${duration.toFixed(2)}s`);
    console.log(`   Processes: ${summary.processes.size}`);
    console.log(`   Threads: ${summary.threads.size}`);
    console.log(`   Event types: ${Object.keys(summary.eventTypes).join(', ')}`);
    console.log(`   Categories: ${Array.from(summary.categories).join(', ')}`);
  }
}

// Main execution
const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node merge-traces.js <session-id>');
  process.exit(1);
}

const merger = new TraceMerger(sessionId);
merger.merge();