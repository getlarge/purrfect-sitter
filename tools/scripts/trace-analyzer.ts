import axios, { isAxiosError } from 'axios';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { BENCHMARK_SCENARIOS, getScenarioById } from './benchmark-scenarios.ts';
import { inspect } from 'node:util';
import { setTimeout } from 'node:timers/promises';
import { URL } from 'node:url';

const ZIPKIN_URL = process.env.ZIPKIN_URL || 'http://localhost:9411';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './benchmark-results';
const TRACE_LOOKBACK = process.env.TRACE_LOOKBACK
  ? parseInt(process.env.TRACE_LOOKBACK)
  : 7200000; // Default 120 minutes
const TRACE_LIMIT = process.env.TRACE_LIMIT
  ? parseInt(process.env.TRACE_LIMIT)
  : 1000;
const RUN_ID = process.env.BENCHMARK_RUN_ID;
const ITERATIONS = process.env.ITERATIONS ? +process.env.ITERATIONS : 5;

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
  scenario?: string,
  iteration?: number,
  lookback = TRACE_LOOKBACK
): Promise<Trace[]> {
  const tagQueryParams = [
    `http.request.header.x_benchmark_run_id=["${RUN_ID}"]`,
  ];
  if (scenario) {
    tagQueryParams.push(
      `http.request.header.x_benchmark_scenario=["${scenario}"]`
    );
  }

  if (iteration !== undefined) {
    tagQueryParams.push(
      `http.request.header.x_benchmark_iteration=["${iteration}"]`
    );
  }

  const tagQuery = tagQueryParams.join(' and ');
  const endTs = Date.now();

  const url = new URL('/api/v2/traces', ZIPKIN_URL);
  url.searchParams.append('serviceName', serviceName);
  url.searchParams.append('limit', TRACE_LIMIT.toString());
  url.searchParams.append('endTs', endTs.toString());
  url.searchParams.append('tagQuery', tagQuery);
  url.searchParams.append('lookback', lookback.toString());

  console.debug('Fetching traces params:', {
    serviceName,
    limit: TRACE_LIMIT,
    lookback,
    last: `last ${lookback / 1000} seconds`,
    endTs,
    tagQuery,
  });
  console.debug('Fetching traces URL:', url.toString());
  try {
    const response = await axios.get<ZipkinTrace[][]>(url.toString());
    if (
      !response.data ||
      !Array.isArray(response.data) ||
      response.data.length === 0
    ) {
      console.warn('No traces found');
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

    console.debug(
      `Found ${traces.length} spans across ${response.data.length} traces`
    );
    return traces;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error(inspect(error.cause));
    }
    return [];
  }
}

interface TraceInfo {
  traceId: string;
  spanCount: number;
  duration: number;
}

function groupTracesByTraceId(traces: Trace[]): Record<string, Trace[]> {
  return traces.reduce((grouped, trace) => {
    grouped[trace.traceId] ??= [];
    grouped[trace.traceId].push(trace);
    return grouped;
  }, {} as Record<string, Trace[]>);
}

function calculateTraceMetrics(traces: Trace[]): TraceInfo[] {
  const tracesByTraceId = groupTracesByTraceId(traces);

  return Object.entries(tracesByTraceId).map(([traceId, spans]) => {
    const totalDuration = spans.reduce((sum, span) => sum + span.duration, 0);
    return {
      traceId,
      spanCount: spans.length,
      duration: totalDuration,
    };
  });
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
  const rawValue = trace.tags['http.request.header.x_benchmark_run_id'];
  return parseArrayValue(rawValue);
}

function getScenarioName(trace: Trace): string | null {
  const rawValue = trace.tags['http.request.header.x_benchmark_scenario'];
  return parseArrayValue(rawValue);
}

function getIterationNumber(trace: Trace): number | null {
  const rawValue = trace.tags['http.request.header.x_benchmark_iteration'];
  const parsedValue = parseArrayValue(rawValue);
  return parsedValue ? Number(parsedValue) : null;
}

function getExpectedStatusCode(trace: Trace): number | null {
  const rawValue =
    trace.tags['http.request.header.x_benchmark_expected_status'];
  const parsedValue = parseArrayValue(rawValue);
  return parsedValue ? Number(parsedValue) : null;
}

function getActualStatusCode(trace: Trace): number | null {
  const statusCode = trace.tags['http.status_code'];
  return statusCode ? Number(statusCode) : null;
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
    console.log(`Processing scenario: ${scenario}`);
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

      // Calculate trace metrics including spans
      const dbTraceMetrics = calculateTraceMetrics(dbTraces);
      const openfgaTraceMetrics = calculateTraceMetrics(openfgaTraces);

      const totalDbTime =
        dbTraceMetrics.reduce((sum, trace) => sum + trace.duration, 0) / 1000;
      const totalOpenfgaTime =
        openfgaTraceMetrics.reduce((sum, trace) => sum + trace.duration, 0) /
        1000;

      // Count total spans rather than just unique trace IDs
      const dbOperationCount = dbTraceMetrics.reduce(
        (sum, trace) => sum + trace.spanCount,
        0
      );
      const openfgaOperationCount = openfgaTraceMetrics.reduce(
        (sum, trace) => sum + trace.spanCount,
        0
      );
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
    // Remove iteration and avg markers
    const basicClean = scenario
      .replace(/\[|\]|"/g, '')
      .replace(/ \(avg of \d+ iterations\)/, '')
      .replace(/-\d+$/, ''); // Remove iteration number suffix

    // Try to find the scenario in our predefined list for a friendlier name
    const scenarioInfo = getScenarioById(basicClean);
    if (scenarioInfo) {
      return scenarioInfo.name;
    }

    return basicClean;
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
  theme: mc
  gantt:
    fontSize: 12
    sectionFontSize: 15
    barHeight: 20
    barGap: 8
    gridLineStartPadding: 50
    leftPadding: 200
---
gantt
    title Performance Comparison: DB vs OpenFGA - Total Time (ms) (lower is better)
    axisFormat %L

${results
  .map(
    (r, i) => `
    section ${i}. ${cleanScenarioName(r.scenario)}
    DB (${r.totalTime.db.toFixed(2)} ms) :crit, db${i}, 0, ${(
      r.totalTime.db * 100
    ).toFixed(0)}ms
    OpenFGA (${r.totalTime.openfga.toFixed(2)} ms) :active, fga${i}, 0, ${(
      r.totalTime.openfga * 100
    ).toFixed(0)}ms
`
  )
  .join('')}
\`\`\`

### Scenario Details
${results
  .map((r, i) => {
    const scenarioId = r.scenario
      .replace(/-\d+$/, '')
      .replace(/ \(avg of \d+ iterations\)/, '');
    const scenarioInfo = getScenarioById(scenarioId);
    const description = scenarioInfo?.description || '';
    return `${i}. **${cleanScenarioName(r.scenario)}**: ${description}`;
  })
  .join('\n')}
`;

  const operationsCountChart = `
\`\`\`mermaid
gantt
    title Performance Comparison: DB vs OpenFGA - Span Counts
    dateFormat  X
    axisFormat %s spans

    section Legend
    DB Strategy (blue) :crit, db, 0, 1
    OpenFGA Strategy (red) :active, fga, 0, 1

${results
  .map((r, i) => {
    // Find scenario details if available
    const scenarioId = r.scenario
      .replace(/-\d+$/, '')
      .replace(/ \(avg of \d+ iterations\)/, '');
    const scenarioInfo = getScenarioById(scenarioId);
    const description = scenarioInfo?.description
      ? ` (${scenarioInfo.description})`
      : '';

    return `
    section ${i}. ${cleanScenarioName(r.scenario)}
    DB (${r.operationCount.db.toFixed(
      0
    )} spans) :crit, dbops${i}, 0, ${r.operationCount.db.toFixed(0)}
    OpenFGA (${r.operationCount.openfga.toFixed(
      0
    )} spans) :active, fgaops${i}, 0, ${r.operationCount.openfga.toFixed(0)}
`;
  })
  .join('')}
\`\`\`

### Scenario Details
${results
  .map((r, i) => {
    const scenarioId = r.scenario
      .replace(/-\d+$/, '')
      .replace(/ \(avg of \d+ iterations\)/, '');
    const scenarioInfo = getScenarioById(scenarioId);
    const description = scenarioInfo?.description || '';
    return `${i}. **${cleanScenarioName(r.scenario)}**: ${description}`;
  })
  .join('\n')}
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

### Scenario Details
${results
  .map((r, i) => {
    const scenarioId = r.scenario
      .replace(/-\d+$/, '')
      .replace(/ \(avg of \d+ iterations\)/, '');
    const scenarioInfo = getScenarioById(scenarioId);
    const description = scenarioInfo?.description || '';
    return `${i}. **${cleanScenarioName(r.scenario)}**: ${description}`;
  })
  .join('\n')}
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

async function* getAllTraces(): AsyncGenerator<{
  openfgaTraces: Trace[];
  dbTraces: Trace[];
  scenario: (typeof BENCHMARK_SCENARIOS)[number]['id'];
  iteration: number;
}> {
  for (const scenario of BENCHMARK_SCENARIOS) {
    let count = 0;
    while (count < ITERATIONS) {
      count++;
      const iteration = count;
      const openfgaTraces = await fetchTraces(
        'purrfect-sitter-openfga',
        scenario.id,
        iteration
      );
      const dbTraces = await fetchTraces(
        'purrfect-sitter-db',
        scenario.id,
        iteration
      );
      yield { openfgaTraces, dbTraces, scenario: scenario.id, iteration };
    }
  }
}

async function main() {
  console.log('Starting trace analysis...');
  console.log('Using benchmark scenarios:');
  BENCHMARK_SCENARIOS.forEach((scenario) => {
    console.log(
      `  - ${scenario.id}: ${scenario.name} (Expected: ${
        scenario.expectedStatus || 'any'
      })`
    );
  });

  const preResults: Partial<
    Record<
      (typeof BENCHMARK_SCENARIOS)[number]['id'],
      Record<
        number,
        {
          totalDbTime: number;
          totalOpenfgaTime: number;
          timeRatio: number;
          operationCountRatio: number;
          statusCodes: Record<string, number[]>;
        }
      >
    >
  > = {};
  for await (const {
    openfgaTraces,
    dbTraces,
    scenario,
    iteration,
  } of getAllTraces()) {
    await setTimeout(100);
    // console.log(
    //   `Fetched ${openfgaTraces.length} OpenFGA traces and ${dbTraces.length} DB traces for scenario ${scenario}, iteration ${iteration}`
    // );

    // Calculate trace metrics including spans
    const dbTraceMetrics = calculateTraceMetrics(dbTraces);
    const openfgaTraceMetrics = calculateTraceMetrics(openfgaTraces);
    const totalDbTime =
      dbTraceMetrics.reduce((sum, trace) => sum + trace.duration, 0) / 1000;
    const totalOpenfgaTime =
      openfgaTraceMetrics.reduce((sum, trace) => sum + trace.duration, 0) /
      1000;

    // Count total spans rather than just unique trace IDs
    const dbOperationCount = dbTraceMetrics.reduce(
      (sum, trace) => sum + trace.spanCount,
      0
    );
    const openfgaOperationCount = openfgaTraceMetrics.reduce(
      (sum, trace) => sum + trace.spanCount,
      0
    );
    const timeRatio = totalOpenfgaTime > 0 ? totalDbTime / totalOpenfgaTime : 0;
    const operationCountRatio =
      openfgaOperationCount > 0 ? dbOperationCount / openfgaOperationCount : 0;

    const statusCodes: Record<string, number[]> = {};
    const allTraces = [...dbTraces, ...openfgaTraces];

    for (const trace of allTraces) {
      const expectedStatus = getExpectedStatusCode(trace);
      const actualStatus = getActualStatusCode(trace);
      if (expectedStatus && actualStatus) {
        const key = `${expectedStatus}`;
        statusCodes[key] ??= [];
        statusCodes[key].push(actualStatus);
      }
    }

    preResults[scenario] ??= {
      [iteration]: {
        totalDbTime,
        totalOpenfgaTime,
        timeRatio,
        operationCountRatio,
        runId: RUN_ID,
        statusCodes:
          Object.keys(statusCodes).length > 0 ? statusCodes : undefined,
      },
    };
  }

  console.log(inspect(preResults, { colors: true, depth: 10 }));

  // console.table(
  //   Object.entries(scenarioTraces).map(([scenario, iterations]) => {
  //     const iterationResults = Object.entries(iterations).map(
  //       ([
  //         iteration,
  //         { totalDbTime, totalOpenfgaTime, timeRatio, operationCountRatio },
  //       ]) => ({
  //         scenario,
  //         iteration: Number(iteration),
  //         totalDbTime,
  //         totalOpenfgaTime,
  //         timeRatio,
  //         operationCountRatio,
  //       })
  //     );
  //     return {
  //       scenario,
  //       iterations: iterationResults,
  //       avgDbTime:
  //         iterationResults.reduce((sum, it) => sum + it.totalDbTime, 0) /
  //         iterationResults.length,
  //       avgOpenfgaTime:
  //         iterationResults.reduce((sum, it) => sum + it.totalOpenfgaTime, 0) /
  //         iterationResults.length,
  //       avgTimeRatio:
  //         iterationResults.reduce((sum, it) => sum + it.timeRatio, 0) /
  //         iterationResults.length,
  //       avgOperationCountRatio:
  //         iterationResults.reduce(
  //           (sum, it) => sum + it.operationCountRatio,
  //           0
  //         ) / iterationResults.length,
  //     };
  //   })
  // );

  // const { dbTraces, openfgaTraces } = await getAuthorizationTraces();
  // console.log(
  //   `Found ${dbTraces.length} DB traces and ${openfgaTraces.length} OpenFGA traces`
  // );
  // if (dbTraces.length === 0 && openfgaTraces.length === 0) {
  //   console.log(
  //     'No traces found for analysis. Please run the benchmark first.'
  //   );
  //   return;
  // }

  // const dbScenarios = groupTracesByScenarioAndIteration(dbTraces);
  // const openfgaScenarios = groupTracesByScenarioAndIteration(openfgaTraces);

  // const iterationResults = calculateIterationMetrics(
  //   dbScenarios,
  //   openfgaScenarios
  // );
  // const aggregatedResults = aggregateScenarioIterations(iterationResults);
  // console.log('\nAggregated Results:');
  // console.table(aggregatedResults);

  // const allIterationResults = Object.values(iterationResults).flat();

  // console.log('\nDetailed Results by Iteration:');
  // console.table(allIterationResults);

  // const timestamp = new Date().toISOString().replace(/:/g, '-');

  // await Promise.all([
  //   generateCSVReport(
  //     aggregatedResults,
  //     `${OUTPUT_DIR}/auth-comparison-${timestamp}.csv`
  //   ),
  //   generateJsonReport(
  //     aggregatedResults,
  //     `${OUTPUT_DIR}/auth-comparison-${timestamp}.json`
  //   ),
  //   generateCSVReport(
  //     allIterationResults,
  //     `${OUTPUT_DIR}/auth-comparison-detailed-${timestamp}.csv`
  //   ),
  //   generateJsonReport(
  //     allIterationResults,
  //     `${OUTPUT_DIR}/auth-comparison-detailed-${timestamp}.json`
  //   ),
  //   generateMermaidCharts(
  //     aggregatedResults,
  //     `${OUTPUT_DIR}/auth-comparison-charts-${timestamp}.md`
  //   ),
  // ]);

  console.log('Analysis complete!');
}

main().catch(console.error);
