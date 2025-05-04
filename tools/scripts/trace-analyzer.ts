import axios from 'axios';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const ZIPKIN_URL = process.env.ZIPKIN_URL || 'http://localhost:9411';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './benchmark-results';
const TRACE_LOOKBACK = process.env.TRACE_LOOKBACK
  ? parseInt(process.env.TRACE_LOOKBACK)
  : 900000; // Default 15 minutes
const TRACE_LIMIT = process.env.TRACE_LIMIT
  ? parseInt(process.env.TRACE_LIMIT)
  : 10000;
const RUN_ID = process.env.BENCHMARK_RUN_ID;

interface Trace {
  traceId: string;
  parentId: string | null;
  id: string;
  name: string;
  timestamp: number;
  duration: number;
  tags: Record<string, string>;
  serviceName: string;
}

interface StrategyComparisonResult {
  scenario: string;
  totalTime: {
    db: number;
    openfga: number;
  };
  operationCount: {
    db: number;
    openfga: number;
  };
  timeRatio: number;
  operationCountRatio: number;
  iterations: number;
  runId: string;
  statusCodes?: Record<string, number[]>;
}

type ZipkinTrace = {
  traceId: string;
  parentId: string | null;
  id: string;
  name: string;
  timestamp: number;
  duration: number;
  localEndpoint?: {
    serviceName: string;
  };
  tags?: Record<string, string>;
};

async function fetchTraces(
  serviceName: string,
  lookback = TRACE_LOOKBACK
): Promise<Trace[]> {
  console.log(
    `Fetching traces for service ${serviceName} (lookback: ${lookback}ms, limit: ${TRACE_LIMIT})`
  );

  try {
    const endTs = Date.now();
    console.log(`Using endTs: ${endTs}, lookback: ${lookback}ms`);

    const response = await axios.get<ZipkinTrace[][]>(
      `${ZIPKIN_URL}/api/v2/traces`,
      {
        params: {
          serviceName,
          lookback,
          limit: TRACE_LIMIT,
          endTs,
        },
      }
    );

    if (
      !response.data ||
      !Array.isArray(response.data) ||
      response.data.length === 0
    ) {
      console.log('No traces found');
      return [];
    }

    const traces = response.data.flatMap((traceArray) =>
      traceArray.map((span) => ({
        traceId: span.traceId,
        parentId: span.parentId || null,
        id: span.id,
        name: span.name,
        timestamp: span.timestamp,
        duration: span.duration,
        tags: span.tags || {},
        serviceName: span.localEndpoint?.serviceName || 'unknown',
      }))
    );

    console.log(`Found ${traces.length} spans`);
    return traces;
  } catch (error) {
    console.error('Error fetching traces:', error.message);
    return [];
  }
}

async function getAuthorizationTraces(): Promise<{
  dbTraces: Trace[];
  openfgaTraces: Trace[];
}> {
  const dbTraces = await fetchTraces('purrfect-sitter-db');
  const purrfectSitterOpenfgaTraces = await fetchTraces(
    'purrfect-sitter-openfga'
  );
  const openfgaServiceTraces = await fetchTraces('openfga');

  console.log(
    `Retrieved ${purrfectSitterOpenfgaTraces.length} purrfect-sitter-openfga traces`
  );
  console.log(
    `Retrieved ${openfgaServiceTraces.length} openfga service traces`
  );

  const validOpenfgaTraces = [
    ...purrfectSitterOpenfgaTraces,
    ...openfgaServiceTraces.filter(
      (trace) =>
        trace.tags['object'] || trace.tags['relation'] || trace.tags['user']
    ),
  ];

  console.log(`Using ${dbTraces.length} DB traces`);
  console.log(`Using ${validOpenfgaTraces.length} OpenFGA traces`);

  return {
    dbTraces,
    openfgaTraces: validOpenfgaTraces,
  };
}

function groupTracesByTraceId(traces: Trace[]): Record<string, Trace[]> {
  return traces.reduce((grouped, trace) => {
    if (!grouped[trace.traceId]) {
      grouped[trace.traceId] = [];
    }
    grouped[trace.traceId].push(trace);
    return grouped;
  }, {} as Record<string, Trace[]>);
}

function parseArrayValue(value: string | undefined): string | null {
  if (!value) return null;

  try {
    if (value.startsWith('[') && value.endsWith(']')) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
    }
  } catch (e) {
    // If parsing fails, continue with normal handling
  }

  return value;
}

function getRunId(trace: Trace): string | null {
  const rawValue =
    trace.tags['X-Benchmark-Run-ID'] ||
    trace.tags['x-benchmark-run-id'] ||
    trace.tags['http.request.header.x_benchmark_run_id'];

  return parseArrayValue(rawValue);
}

function getScenarioName(trace: Trace): string | null {
  const rawValue =
    trace.tags['X-Benchmark-Scenario'] ||
    trace.tags['x-benchmark-scenario'] ||
    trace.tags['http.request.header.x_benchmark_scenario'];

  return parseArrayValue(rawValue);
}

function getIterationNumber(trace: Trace): number | null {
  const rawValue =
    trace.tags['X-Benchmark-Iteration'] ||
    trace.tags['x-benchmark-iteration'] ||
    trace.tags['http.request.header.x_benchmark_iteration'];

  const parsedValue = parseArrayValue(rawValue);
  return parsedValue ? Number(parsedValue) : null;
}

function getExpectedStatusCode(trace: Trace): number | null {
  const rawValue =
    trace.tags['X-Benchmark-Expected-Status'] ||
    trace.tags['x-benchmark-expected-status'] ||
    trace.tags['http.request.header.x_benchmark_expected_status'];

  const parsedValue = parseArrayValue(rawValue);
  return parsedValue ? Number(parsedValue) : null;
}

function getActualStatusCode(trace: Trace): number | null {
  const statusCode = trace.tags['http.status_code'];
  return statusCode ? Number(statusCode) : null;
}

function findRunIds(traces: Trace[]): string[] {
  const runIds = new Set<string>();

  for (const trace of traces) {
    const runId = getRunId(trace);
    if (runId) {
      runIds.add(runId);
    }
  }

  return Array.from(runIds);
}

function filterTracesByRunId(traces: Trace[], runId: string): Trace[] {
  return traces.filter((trace) => {
    const traceRunId = getRunId(trace);
    return traceRunId === runId;
  });
}

function groupTracesByScenarioAndIteration(
  traces: Trace[]
): Record<string, Record<number, Trace[]>> {
  const scenarios: Record<string, Record<number, Trace[]>> = {};
  const tracesByTraceId = groupTracesByTraceId(traces);

  if (traces.length > 0) {
    const sample = traces[0];
    console.log('Sample trace tags:');
    console.log(`Trace ID: ${sample.traceId}, Service: ${sample.serviceName}`);
    console.log('Tags:', JSON.stringify(sample.tags, null, 2));
  }

  for (const trace of traces) {
    const scenarioName = getScenarioName(trace);
    const iteration = getIterationNumber(trace);

    if (scenarioName && iteration !== null) {
      scenarios[scenarioName] = scenarios[scenarioName] || {};
      scenarios[scenarioName][iteration] =
        scenarios[scenarioName][iteration] || [];

      scenarios[scenarioName][iteration].push(trace);

      const relatedTraces = tracesByTraceId[trace.traceId] || [];
      for (const relatedTrace of relatedTraces) {
        if (
          relatedTrace !== trace &&
          !scenarios[scenarioName][iteration].some(
            (t) => t.id === relatedTrace.id
          )
        ) {
          scenarios[scenarioName][iteration].push(relatedTrace);
        }
      }
    }
  }

  console.log('Traces grouped by scenario and iteration:');
  Object.entries(scenarios).forEach(([scenario, iterations]) => {
    console.log(`  ${scenario}:`);
    Object.entries(iterations).forEach(([iteration, iterationTraces]) => {
      console.log(
        `    Iteration ${iteration}: ${iterationTraces.length} traces`
      );
    });
  });

  return scenarios;
}

function calculateRootSpanDurations(traces: Trace[]): number[] {
  const tracesByTraceId = groupTracesByTraceId(traces);

  return Object.values(tracesByTraceId).map((tracesGroup) => {
    const longestSpan = tracesGroup.reduce(
      (longest, current) =>
        current.duration > longest.duration ? current : longest,
      tracesGroup[0]
    );
    return longestSpan.duration;
  });
}

function calculateIterationMetrics(
  dbScenarios: Record<string, Record<number, Trace[]>>,
  openfgaScenarios: Record<string, Record<number, Trace[]>>
): Record<string, StrategyComparisonResult[]> {
  const results: Record<string, StrategyComparisonResult[]> = {};
  const allScenarios = new Set([
    ...Object.keys(dbScenarios),
    ...Object.keys(openfgaScenarios),
  ]);

  for (const scenario of allScenarios) {
    results[scenario] = [];

    const dbIterations = dbScenarios[scenario]
      ? Object.keys(dbScenarios[scenario]).map(Number)
      : [];
    const openfgaIterations = openfgaScenarios[scenario]
      ? Object.keys(openfgaScenarios[scenario]).map(Number)
      : [];
    const allIterations = [...new Set([...dbIterations, ...openfgaIterations])];

    for (const iteration of allIterations) {
      const dbTraces =
        (dbScenarios[scenario] && dbScenarios[scenario][iteration]) || [];
      const openfgaTraces =
        (openfgaScenarios[scenario] && openfgaScenarios[scenario][iteration]) ||
        [];

      if (dbTraces.length === 0 && openfgaTraces.length === 0) {
        continue;
      }

      const runId = getRunId(dbTraces[0] || openfgaTraces[0]) || 'unknown';

      const totalDbTime =
        dbTraces.reduce((sum, trace) => sum + trace.duration, 0) / 1000;
      const totalOpenfgaTime =
        openfgaTraces.reduce((sum, trace) => sum + trace.duration, 0) / 1000;
      const dbOperationCount = dbTraces.length;
      const openfgaOperationCount = openfgaTraces.length;
      const timeRatio =
        totalOpenfgaTime > 0 ? totalDbTime / totalOpenfgaTime : 0;
      const operationCountRatio =
        openfgaOperationCount > 0
          ? dbOperationCount / openfgaOperationCount
          : 0;

      const statusCodes: Record<string, number[]> = {};
      const allTraces = [...dbTraces, ...openfgaTraces];

      for (const trace of allTraces) {
        const expectedStatus = getExpectedStatusCode(trace);
        const actualStatus = getActualStatusCode(trace);

        if (expectedStatus && actualStatus) {
          const key = `${expectedStatus}`;
          if (!statusCodes[key]) {
            statusCodes[key] = [];
          }
          statusCodes[key].push(actualStatus);
        }
      }

      results[scenario].push({
        scenario: `${scenario}-${iteration}`,
        totalTime: {
          db: totalDbTime,
          openfga: totalOpenfgaTime,
        },
        operationCount: {
          db: dbOperationCount,
          openfga: openfgaOperationCount,
        },
        timeRatio,
        operationCountRatio,
        iterations: 1,
        runId,
        statusCodes:
          Object.keys(statusCodes).length > 0 ? statusCodes : undefined,
      });
    }
  }

  return results;
}

function aggregateScenarioIterations(
  iterationResults: Record<string, StrategyComparisonResult[]>
): StrategyComparisonResult[] {
  const aggregatedResults: StrategyComparisonResult[] = [];

  for (const [scenarioName, iterations] of Object.entries(iterationResults)) {
    if (iterations.length === 0) continue;

    const iterationsByRunId: Record<string, StrategyComparisonResult[]> = {};

    for (const iteration of iterations) {
      if (!iterationsByRunId[iteration.runId]) {
        iterationsByRunId[iteration.runId] = [];
      }
      iterationsByRunId[iteration.runId].push(iteration);
    }

    for (const [runId, runIterations] of Object.entries(iterationsByRunId)) {
      const iterationCount = runIterations.length;

      const avg = (values: number[]) =>
        values.reduce((sum, val) => sum + val, 0) / values.length;

      const avgDbTime = avg(runIterations.map((it) => it.totalTime.db));
      const avgOpenfgaTime = avg(
        runIterations.map((it) => it.totalTime.openfga)
      );
      const avgDbOpCount = avg(runIterations.map((it) => it.operationCount.db));
      const avgOpenfgaOpCount = avg(
        runIterations.map((it) => it.operationCount.openfga)
      );
      const avgTimeRatio = avg(runIterations.map((it) => it.timeRatio));
      const avgOpCountRatio = avg(
        runIterations.map((it) => it.operationCountRatio)
      );

      const mergedStatusCodes: Record<string, number[]> = {};
      for (const iteration of runIterations) {
        if (iteration.statusCodes) {
          for (const [expected, actual] of Object.entries(
            iteration.statusCodes
          )) {
            if (!mergedStatusCodes[expected]) {
              mergedStatusCodes[expected] = [];
            }
            mergedStatusCodes[expected].push(...actual);
          }
        }
      }

      aggregatedResults.push({
        scenario: `${scenarioName} (avg of ${iterationCount} iterations)`,
        totalTime: {
          db: avgDbTime,
          openfga: avgOpenfgaTime,
        },
        operationCount: {
          db: avgDbOpCount,
          openfga: avgOpenfgaOpCount,
        },
        timeRatio: avgTimeRatio,
        operationCountRatio: avgOpCountRatio,
        iterations: iterationCount,
        runId,
        statusCodes:
          Object.keys(mergedStatusCodes).length > 0
            ? mergedStatusCodes
            : undefined,
      });
    }
  }

  return aggregatedResults;
}

async function ensureDirectoryExists(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function generateJsonReport(
  results: StrategyComparisonResult[],
  filePath: string
): Promise<void> {
  await ensureDirectoryExists(filePath);
  await writeFile(filePath, JSON.stringify(results, null, 2));
  console.log(`JSON report written to ${filePath}`);
}

async function generateMermaidCharts(
  results: StrategyComparisonResult[],
  filePath: string
): Promise<void> {
  await ensureDirectoryExists(filePath);

  const cleanScenarioName = (scenario: string) => {
    return scenario
      .replace(/\[|\]|"/g, '')
      .replace(/ \(avg of \d+ iterations\)/, '');
  };

  const createMarkdownTable = (results: StrategyComparisonResult[]) => {
    let table =
      '| # | Scenario | DB Time (ms) | OpenFGA Time (ms) | DB Operations | OpenFGA Operations | Time Ratio (DB/OpenFGA) | Iterations | Run ID |\n';
    table +=
      '|---|----------|--------------|------------------|---------------|-------------------|-------------------------|------------|--------|\n';

    results.forEach((result, i) => {
      table += `| ${i} | ${cleanScenarioName(
        result.scenario
      )} | ${result.totalTime.db.toFixed(
        2
      )} | ${result.totalTime.openfga.toFixed(
        2
      )} | ${result.operationCount.db.toFixed(
        2
      )} | ${result.operationCount.openfga.toFixed(
        2
      )} | ${result.timeRatio.toFixed(3)} | ${result.iterations} | ${
        result.runId
      } |\n`;
    });

    let statusTable = '';
    const hasStatusInfo = results.some(
      (r) => r.statusCodes && Object.keys(r.statusCodes).length > 0
    );

    if (hasStatusInfo) {
      statusTable = '\n\n### Status Code Validation\n';
      statusTable += '| Scenario | Expected Status | Actual Status | Valid |\n';
      statusTable += '|----------|----------------|---------------|-------|\n';

      results.forEach((result) => {
        if (result.statusCodes) {
          Object.entries(result.statusCodes).forEach(([expected, actuals]) => {
            const statusCounts = actuals.reduce((counts, status) => {
              counts[status] = (counts[status] || 0) + 1;
              return counts;
            }, {} as Record<number, number>);

            const actualStatusList = Object.entries(statusCounts)
              .map(([status, count]) => `${status} (${count} times)`)
              .join(', ');

            const allMatch = actuals.every((s) => s === Number(expected));

            statusTable += `| ${cleanScenarioName(
              result.scenario
            )} | ${expected} | ${actualStatusList} | ${
              allMatch ? '✅' : '❌'
            } |\n`;
          });
        }
      });
    }

    return table + statusTable;
  };

  const scenarioTimesChart = `
\`\`\`mermaid
---
config:
  xyChart:
    width: 900
    height: 600
    titleFontSize: 18
    labelFontSize: 14
    titlePadding: 20
  themeVariables:
    xyChart:
      titleColor: "#333333"
      axisLabelColor: "#555555"
      xAxisLabelColor: "#555555"
      yAxisLabelColor: "#555555"
      plotColorPalette: "#4285F4, #EA4335"
---
xychart-beta
    title "Performance Comparison: DB vs OpenFGA - Total Time (ms) (lower is better)"
    x-axis [${results.map((_, i) => i).join(',')}]
    y-axis "Time (ms)" 0 --> ${Math.ceil(
      Math.max(
        ...results.map((r) => Math.max(r.totalTime.db, r.totalTime.openfga))
      ) * 1.2
    )}
    bar [${results.map((r) => r.totalTime.db.toFixed(2)).join(',')}]
    bar [${results.map((r) => r.totalTime.openfga.toFixed(2)).join(',')}]
\`\`\`

### Legend
- First bar (blue): DB Strategy
- Second bar (red): OpenFGA Strategy

### Scenario Names for Chart Reference
${results.map((r, i) => `${i}. ${cleanScenarioName(r.scenario)}`).join('\n')}
`;

  const operationsCountChart = `
\`\`\`mermaid
---
config:
  xyChart:
    width: 900
    height: 600
    titleFontSize: 18
    labelFontSize: 14
    titlePadding: 20
  themeVariables:
    xyChart:
      titleColor: "#333333"
      axisLabelColor: "#555555"
      xAxisLabelColor: "#555555"
      yAxisLabelColor: "#555555"
      plotColorPalette: "#4285F4, #EA4335"
---
xychart-beta
    title "Performance Comparison: DB vs OpenFGA - Operation Counts"
    x-axis [${results.map((_, i) => i).join(',')}]
    y-axis "Operation Count" 0 --> ${Math.ceil(
      Math.max(
        ...results.map((r) =>
          Math.max(r.operationCount.db, r.operationCount.openfga)
        )
      ) * 1.2
    )}
    bar [${results.map((r) => r.operationCount.db.toFixed(0)).join(',')}]
    bar [${results.map((r) => r.operationCount.openfga.toFixed(0)).join(',')}]
\`\`\`

### Legend
- First bar (blue): DB Strategy
- Second bar (red): OpenFGA Strategy

### Scenario Names for Chart Reference
${results.map((r, i) => `${i}. ${cleanScenarioName(r.scenario)}`).join('\n')}
`;

  const timeRatioChart = `
\`\`\`mermaid
---
config:
  xyChart:
    width: 900
    height: 400
    titleFontSize: 18
    labelFontSize: 14
    titlePadding: 20
  themeVariables:
    xyChart:
      titleColor: "#333333"
      axisLabelColor: "#555555"
      xAxisLabelColor: "#555555"
      yAxisLabelColor: "#555555"
      plotColorPalette: "#34A853, #EA4335"
---
xychart-beta
    title "Performance Comparison: DB vs OpenFGA - Time Ratio (values > 1 mean DB is slower)"
    x-axis [${results.map((_, i) => i).join(',')}]
    y-axis "Ratio (DB/OpenFGA)" 0 --> ${Math.ceil(
      Math.max(...results.map((r) => r.timeRatio)) * 1.2
    )}
    line [${results.map((r) => r.timeRatio.toFixed(2)).join(',')}]
    line [${results.map(() => '1').join(',')}]
\`\`\`

### Legend
- First line (green): DB/OpenFGA Time Ratio
- Second line (red): Break-even (1.0)

### Scenario Names for Chart Reference
${results.map((r, i) => `${i}. ${cleanScenarioName(r.scenario)}`).join('\n')}
`;

  const dataTable = createMarkdownTable(results);

  const fullReport = `# Authorization Strategy Performance Comparison

## Summary

This report compares the performance of two authorization strategies:
- **Database (DB) strategy**: Direct database queries for permission checks
- **OpenFGA strategy**: Delegated authorization checks using OpenFGA

## Total Execution Time
${scenarioTimesChart}

## Operation Counts
${operationsCountChart}

## Time Ratio (DB/OpenFGA)
${timeRatioChart}

## Data Table
${dataTable}

## Raw Data
\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`
`;

  await writeFile(filePath, fullReport);
  console.log(`Mermaid charts written to ${filePath}`);
}

async function generateCSVReport(
  results: StrategyComparisonResult[],
  filePath: string
): Promise<void> {
  await ensureDirectoryExists(filePath);

  const header =
    'Scenario,DB Time (ms),OpenFGA Time (ms),DB Operations,OpenFGA Operations,Time Ratio (DB/OpenFGA),Operation Count Ratio (DB/OpenFGA),Iterations,Run ID\n';
  const rows = results
    .map((result) =>
      [
        result.scenario,
        result.totalTime.db.toFixed(2),
        result.totalTime.openfga.toFixed(2),
        result.operationCount.db.toFixed(2),
        result.operationCount.openfga.toFixed(2),
        result.timeRatio.toFixed(2),
        result.operationCountRatio.toFixed(2),
        result.iterations,
        result.runId,
      ].join(',')
    )
    .join('\n');

  await writeFile(filePath, header + rows);
  console.log(`CSV report written to ${filePath}`);
}

async function main() {
  console.log('Starting trace analysis...');

  const { dbTraces, openfgaTraces } = await getAuthorizationTraces();
  console.log(
    `Found ${dbTraces.length} DB traces and ${openfgaTraces.length} OpenFGA traces`
  );

  if (dbTraces.length === 0 && openfgaTraces.length === 0) {
    console.log(
      'No traces found for analysis. Please run the benchmark first.'
    );
    return;
  }

  const availableRunIds = findRunIds([...dbTraces, ...openfgaTraces]);
  console.log(
    `Found ${availableRunIds.length} unique benchmark runs:`,
    availableRunIds
  );

  const runIdToAnalyze = RUN_ID || availableRunIds[availableRunIds.length - 1];
  console.log(`Analyzing run ID: ${runIdToAnalyze}`);

  const filteredDbTraces = runIdToAnalyze
    ? filterTracesByRunId(dbTraces, runIdToAnalyze)
    : dbTraces;
  const filteredOpenfgaTraces = runIdToAnalyze
    ? filterTracesByRunId(openfgaTraces, runIdToAnalyze)
    : openfgaTraces;

  console.log(
    `Using ${filteredDbTraces.length} DB traces and ${filteredOpenfgaTraces.length} OpenFGA traces for run ${runIdToAnalyze}`
  );

  const dbScenarios = groupTracesByScenarioAndIteration(filteredDbTraces);
  const openfgaScenarios = groupTracesByScenarioAndIteration(
    filteredOpenfgaTraces
  );

  const iterationResults = calculateIterationMetrics(
    dbScenarios,
    openfgaScenarios
  );
  const aggregatedResults = aggregateScenarioIterations(iterationResults);

  console.log('\nAggregated Results:');
  console.table(aggregatedResults);

  const allIterationResults = Object.values(iterationResults).flat();

  console.log('\nDetailed Results by Iteration:');
  console.table(allIterationResults);

  const timestamp = new Date().toISOString().replace(/:/g, '-');

  await Promise.all([
    generateCSVReport(
      aggregatedResults,
      `${OUTPUT_DIR}/auth-comparison-${timestamp}.csv`
    ),
    generateJsonReport(
      aggregatedResults,
      `${OUTPUT_DIR}/auth-comparison-${timestamp}.json`
    ),
    generateCSVReport(
      allIterationResults,
      `${OUTPUT_DIR}/auth-comparison-detailed-${timestamp}.csv`
    ),
    generateJsonReport(
      allIterationResults,
      `${OUTPUT_DIR}/auth-comparison-detailed-${timestamp}.json`
    ),
    generateMermaidCharts(
      aggregatedResults,
      `${OUTPUT_DIR}/auth-comparison-charts-${timestamp}.md`
    ),
  ]);

  console.log('Analysis complete!');
}

main().catch(console.error);
