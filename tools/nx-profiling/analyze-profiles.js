#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProfileAnalyzer {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sessionDir = path.join(__dirname, 'sessions', sessionId);
    this.profiles = {
      parent: [],
      workers: []
    };
    this.metadata = null;
  }

  async analyze() {
    if (!fs.existsSync(this.sessionDir)) {
      console.error(`Session ${this.sessionId} not found!`);
      process.exit(1);
    }

    // Load metadata
    this.metadata = JSON.parse(
      fs.readFileSync(path.join(this.sessionDir, 'metadata.json'), 'utf8')
    );

    console.log(`📊 Analyzing profiling session: ${this.sessionId}`);
    console.log(`📝 Command: ${this.metadata.command}`);
    console.log(`⏱️  Duration: ${(this.metadata.duration/1000).toFixed(2)}s`);
    console.log(`📅 Started: ${this.metadata.startTime}\n`);

    // Load profiles
    await this.loadProfiles();

    // Analyze profiles
    const analysis = this.analyzeAllProfiles();

    // Generate report
    this.generateReport(analysis);
  }

  async loadProfiles() {
    // Load parent profiles
    const parentDir = path.join(this.sessionDir, 'cpu', 'parent');
    if (fs.existsSync(parentDir)) {
      const files = fs.readdirSync(parentDir).filter(f => f.endsWith('.cpuprofile'));
      for (const file of files) {
        try {
          const profile = JSON.parse(fs.readFileSync(path.join(parentDir, file), 'utf8'));
          this.profiles.parent.push({
            filename: file,
            profile,
            type: 'parent'
          });
        } catch (e) {
          console.warn(`⚠️  Failed to load profile ${file}:`, e.message);
        }
      }
    }

    // Load worker profiles
    const workerDir = path.join(this.sessionDir, 'cpu', 'workers');
    if (fs.existsSync(workerDir)) {
      const files = fs.readdirSync(workerDir).filter(f => f.endsWith('.cpuprofile'));
      for (const file of files) {
        try {
          const profile = JSON.parse(fs.readFileSync(path.join(workerDir, file), 'utf8'));
          const pid = this.extractPidFromFilename(file);
          this.profiles.workers.push({
            filename: file,
            pid,
            profile,
            type: 'worker'
          });
        } catch (e) {
          console.warn(`⚠️  Failed to load profile ${file}:`, e.message);
        }
      }
    }

    console.log(`📁 Loaded ${this.profiles.parent.length} parent and ${this.profiles.workers.length} worker profiles\n`);
  }

  extractPidFromFilename(filename) {
    const match = filename.match(/CPU\.(\d+)\./);
    return match ? match[1] : 'unknown';
  }

  analyzeAllProfiles() {
    const analysis = {
      summary: {
        parentProfiles: this.profiles.parent.length,
        workerProfiles: this.profiles.workers.length,
        totalSamples: 0,
        totalTime: 0
      },
      processes: {}
    };

    // Analyze parent process
    if (this.profiles.parent.length > 0) {
      console.log('🔍 Analyzing parent process...');
      analysis.processes.parent = this.analyzeProfile(this.profiles.parent[0].profile);
      analysis.summary.totalSamples += analysis.processes.parent.totalSamples;
    }

    // Analyze worker processes
    console.log(`🔍 Analyzing ${this.profiles.workers.length} worker processes...`);
    for (const worker of this.profiles.workers) {
      const workerAnalysis = this.analyzeProfile(worker.profile);
      analysis.processes[`worker-${worker.pid}`] = workerAnalysis;
      analysis.summary.totalSamples += workerAnalysis.totalSamples;
    }

    return analysis;
  }

  analyzeProfile(profile) {
    const nodes = profile.nodes || [];
    const samples = profile.samples || [];
    const timeDeltas = profile.timeDeltas || [];

    // Calculate total time
    const totalTime = timeDeltas.reduce((sum, delta) => sum + delta, 0);

    // Count samples per function
    const functionStats = new Map();

    for (let i = 0; i < samples.length; i++) {
      const nodeId = samples[i];
      const node = nodes.find(n => n.id === nodeId);
      
      if (node && node.callFrame) {
        const functionName = node.callFrame.functionName || '(anonymous)';
        const url = node.callFrame.url || '(unknown)';
        const key = `${functionName}@${url}:${node.callFrame.lineNumber}`;
        
        const stats = functionStats.get(key) || {
          functionName,
          url,
          lineNumber: node.callFrame.lineNumber,
          samples: 0,
          time: 0
        };
        
        stats.samples++;
        if (i < timeDeltas.length) {
          stats.time += timeDeltas[i];
        }
        
        functionStats.set(key, stats);
      }
    }

    // Convert to array and sort by samples
    const topFunctions = Array.from(functionStats.values())
      .sort((a, b) => b.samples - a.samples)
      .slice(0, 20)
      .map(func => ({
        ...func,
        percentage: ((func.samples / samples.length) * 100).toFixed(2),
        timeMs: (func.time / 1000).toFixed(2)
      }));

    return {
      totalSamples: samples.length,
      totalTimeUs: totalTime,
      totalTimeMs: (totalTime / 1000).toFixed(2),
      topFunctions
    };
  }

  generateReport(analysis) {
    // Save JSON report
    const reportPath = path.join(this.sessionDir, 'analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

    // Print summary
    console.log('\n📊 Profile Analysis Summary');
    console.log('═══════════════════════════════════════════\n');

    // Parent process
    if (analysis.processes.parent) {
      console.log('👑 Parent Process');
      console.log(`   Total samples: ${analysis.processes.parent.totalSamples}`);
      console.log(`   Total time: ${analysis.processes.parent.totalTimeMs}ms`);
      console.log('\n   Top 5 functions:');
      
      analysis.processes.parent.topFunctions.slice(0, 5).forEach((func, i) => {
        console.log(`   ${i + 1}. ${func.functionName} (${func.percentage}%)`);
        console.log(`      ${func.url}:${func.lineNumber}`);
      });
    }

    // Worker processes
    const workerKeys = Object.keys(analysis.processes).filter(k => k.startsWith('worker-'));
    if (workerKeys.length > 0) {
      console.log(`\n👷 Worker Processes (${workerKeys.length} workers)`);
      
      // Aggregate worker stats
      let totalWorkerSamples = 0;
      let totalWorkerTime = 0;
      const aggregatedFunctions = new Map();

      for (const workerKey of workerKeys) {
        const worker = analysis.processes[workerKey];
        totalWorkerSamples += worker.totalSamples;
        totalWorkerTime += parseFloat(worker.totalTimeMs);

        // Aggregate functions across workers
        worker.topFunctions.forEach(func => {
          const key = `${func.functionName}@${func.url}`;
          const existing = aggregatedFunctions.get(key) || {
            functionName: func.functionName,
            url: func.url,
            totalSamples: 0,
            workerCount: 0
          };
          existing.totalSamples += func.samples;
          existing.workerCount++;
          aggregatedFunctions.set(key, existing);
        });
      }

      console.log(`   Total samples (all workers): ${totalWorkerSamples}`);
      console.log(`   Total time (all workers): ${totalWorkerTime.toFixed(2)}ms`);
      console.log(`   Average per worker: ${(totalWorkerSamples / workerKeys.length).toFixed(0)} samples`);

      // Top functions across all workers
      const topWorkerFunctions = Array.from(aggregatedFunctions.values())
        .sort((a, b) => b.totalSamples - a.totalSamples)
        .slice(0, 5);

      console.log('\n   Top 5 functions across all workers:');
      topWorkerFunctions.forEach((func, i) => {
        console.log(`   ${i + 1}. ${func.functionName} (in ${func.workerCount} workers)`);
        console.log(`      ${func.url}`);
      });
    }

    // Performance insights
    console.log('\n💡 Performance Insights');
    console.log('═══════════════════════════════════════════\n');

    // Check for Nx-specific patterns
    this.generateNxInsights(analysis);

    console.log(`\n📁 Full analysis saved to: ${reportPath}`);
    console.log(`\n🔧 View CPU profiles in Chrome DevTools:`);
    console.log(`   1. Open chrome://inspect`);
    console.log(`   2. Click 'Open dedicated DevTools for Node'`);
    console.log(`   3. Go to 'Profiler' tab`);
    console.log(`   4. Load profile files from: ${this.sessionDir}/cpu/`);
  }

  generateNxInsights(analysis) {
    // Look for common Nx patterns
    const patterns = {
      typeScript: false,
      jest: false,
      webpack: false,
      serialization: false,
      fileIO: false
    };

    // Check all processes for patterns
    Object.values(analysis.processes).forEach(process => {
      process.topFunctions.forEach(func => {
        if (func.url.includes('typescript') || func.functionName.includes('transpile')) {
          patterns.typeScript = true;
        }
        if (func.url.includes('jest') || func.functionName.includes('test')) {
          patterns.jest = true;
        }
        if (func.url.includes('webpack')) {
          patterns.webpack = true;
        }
        if (func.functionName.includes('JSON.') || func.functionName.includes('serialize')) {
          patterns.serialization = true;
        }
        if (func.functionName.includes('readFile') || func.functionName.includes('writeFile')) {
          patterns.fileIO = true;
        }
      });
    });

    // Generate insights based on patterns
    if (patterns.typeScript) {
      console.log('• TypeScript compilation detected - Consider using persistent TypeScript workers');
    }
    if (patterns.jest) {
      console.log('• Jest testing detected - Consider --maxWorkers flag for optimal parallelization');
    }
    if (patterns.webpack) {
      console.log('• Webpack bundling detected - Check for duplicate work across projects');
    }
    if (patterns.serialization) {
      console.log('• Heavy serialization detected - Consider caching parsed results');
    }
    if (patterns.fileIO) {
      console.log('• Significant file I/O detected - Ensure Nx cache is enabled');
    }

    // Worker utilization
    const workerCount = Object.keys(analysis.processes).filter(k => k.startsWith('worker-')).length;
    if (workerCount > 0) {
      console.log(`• Running with ${workerCount} worker processes`);
      if (workerCount > require('os').cpus().length) {
        console.log(`  ⚠️  More workers than CPU cores - may cause contention`);
      }
    }
  }
}

// Main execution
const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node analyze-profiles.js <session-id>');
  console.error('\nAvailable sessions:');
  
  const sessionsDir = path.join(__dirname, 'sessions');
  if (fs.existsSync(sessionsDir)) {
    const sessions = fs.readdirSync(sessionsDir)
      .filter(f => fs.statSync(path.join(sessionsDir, f)).isDirectory())
      .sort((a, b) => b - a);
    
    sessions.slice(0, 10).forEach(session => {
      const metadataPath = path.join(sessionsDir, session, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log(`  ${session} - ${metadata.command} (${new Date(metadata.startTime).toLocaleString()})`);
      } else {
        console.log(`  ${session}`);
      }
    });
  }
  
  process.exit(1);
}

const analyzer = new ProfileAnalyzer(sessionId);
analyzer.analyze().catch(err => {
  console.error('Analysis failed:', err);
  process.exit(1);
});