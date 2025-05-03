import axios from 'axios';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const ZIPKIN_URL = process.env.ZIPKIN_URL || 'http://localhost:9411';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './benchmark-results';
const TRACE_LOOKBACK = process.env.TRACE_LOOKBACK
  ? parseInt(process.env.TRACE_LOOKBACK)
  : 3600000;

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
  totalDbTime: number;
  totalOpenfgaTime: number;
  dbOperationCount: number;
  openfgaOperationCount: number;
  timeRatio: number;
  operationCountRatio: number;
  totalScenarioTime: number;
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

const fetchTraces = async (
  serviceName: string,
  lookback = TRACE_LOOKBACK
): Promise<Trace[]> => {
  console.log(`Fetching traces for service ${serviceName} (lookback: ${lookback}ms)`);
  
  try {
    const endTs = Date.now();
    console.log(`Using endTs: ${endTs}, lookback: ${lookback}ms`);
    
    const response = await axios.get<ZipkinTrace[][]>(`${ZIPKIN_URL}/api/v2/traces`, {
      params: {
        serviceName,
        lookback,
        limit: 1000,
        endTs,
      },
    });

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      console.log('No traces found');
      return [];
    }

    const traces = response.data.flatMap(traceArray =>
      traceArray.map(span => ({
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
};

const getAuthorizationTraces = async (): Promise<{
  dbTraces: Trace[];
  openfgaTraces: Trace[];
}> => {
  const dbTraces = await fetchTraces('purrfect-sitter-db');
  const purrfectSitterOpenfgaTraces = await fetchTraces('purrfect-sitter-openfga');
  const openfgaServiceTraces = await fetchTraces('openfga');

  console.log(`Retrieved ${purrfectSitterOpenfgaTraces.length} purrfect-sitter-openfga traces`);
  console.log(`Retrieved ${openfgaServiceTraces.length} openfga service traces`);

  const validOpenfgaTraces = [
    ...purrfectSitterOpenfgaTraces,
    ...openfgaServiceTraces.filter(trace => 
      trace.tags['object'] || trace.tags['relation'] || trace.tags['user']
    ),
  ];

  console.log(`Using ${dbTraces.length} DB traces`);
  console.log(`Using ${validOpenfgaTraces.length} OpenFGA traces`);

  return {
    dbTraces,
    openfgaTraces: validOpenfgaTraces,
  };
};

const groupTracesByTraceId = (traces: Trace[]): Record<string, Trace[]> => {
  return traces.reduce((grouped, trace) => {
    if (!grouped[trace.traceId]) {
      grouped[trace.traceId] = [];
    }
    grouped[trace.traceId].push(trace);
    return grouped;
  }, {} as Record<string, Trace[]>);
};

const groupTracesByScenario = (traces: Trace[]): Record<string, Trace[]> => {
  const scenarios: Record<string, Trace[]> = {};
  const tracesByTraceId = groupTracesByTraceId(traces);

  if (traces.length > 0) {
    const sample = traces[0];
    console.log('Sample trace tags:');
    console.log(`Trace ID: ${sample.traceId}, Service: ${sample.serviceName}`);
    console.log('Tags:', JSON.stringify(sample.tags, null, 2));
  }
  
  for (const trace of traces) {
    const scenarioTag =
      trace.tags['X-Benchmark-Scenario'] ||
      trace.tags['x-benchmark-scenario'] ||
      trace.tags['http.request.header.x_benchmark_scenario'];
    
    if (!scenarioTag && Object.keys(scenarios).length === 0) {
      const defaultScenario = 'authorization-benchmark';
      scenarios[defaultScenario] = scenarios[defaultScenario] || [];
      scenarios[defaultScenario].push(trace);
    } else if (scenarioTag) {
      scenarios[scenarioTag] = scenarios[scenarioTag] || [];
      scenarios[scenarioTag].push(trace);
      
      const relatedTraces = tracesByTraceId[trace.traceId] || [];
      for (const relatedTrace of relatedTraces) {
        if (relatedTrace !== trace && 
            !scenarios[scenarioTag].some(t => t.id === relatedTrace.id)) {
          scenarios[scenarioTag].push(relatedTrace);
        }
      }
    }
  }

  console.log('Traces grouped by scenario:');
  Object.entries(scenarios).forEach(([scenario, scenarioTraces]) => {
    console.log(`  ${scenario}: ${scenarioTraces.length} traces`);
  });

  return scenarios;
};

const calculateRootSpanDurations = (traces: Trace[]): number[] => {
  const tracesByTraceId = groupTracesByTraceId(traces);
  
  return Object.values(tracesByTraceId).map(tracesGroup => {
    const longestSpan = tracesGroup.reduce(
      (longest, current) => current.duration > longest.duration ? current : longest,
      tracesGroup[0]
    );
    return longestSpan.duration;
  });
};

const calculateMetrics = (
  dbScenarios: Record<string, Trace[]>,
  openfgaScenarios: Record<string, Trace[]>
): StrategyComparisonResult[] => {
  const results: StrategyComparisonResult[] = [];
  const allScenarios = new Set([
    ...Object.keys(dbScenarios),
    ...Object.keys(openfgaScenarios),
  ]);

  for (const scenario of allScenarios) {
    const dbTraces = dbScenarios[scenario] || [];
    const openfgaTraces = openfgaScenarios[scenario] || [];

    if (dbTraces.length === 0 && openfgaTraces.length === 0) {
      continue;
    }

    const totalDbTime = dbTraces.reduce((sum, trace) => sum + trace.duration, 0) / 1000;
    const totalOpenfgaTime = openfgaTraces.reduce((sum, trace) => sum + trace.duration, 0) / 1000;
    const dbOperationCount = dbTraces.length;
    const openfgaOperationCount = openfgaTraces.length;
    const timeRatio = totalOpenfgaTime > 0 ? totalDbTime / totalOpenfgaTime : 0;
    const operationCountRatio = openfgaOperationCount > 0 ? dbOperationCount / openfgaOperationCount : 0;

    const allScenarioTraces = [...dbTraces, ...openfgaTraces];
    const totalScenarioTime = allScenarioTraces.length > 0
      ? calculateRootSpanDurations(allScenarioTraces).reduce((sum, duration) => sum + duration, 0) / 1000
      : 0;

    results.push({
      scenario,
      totalDbTime,
      totalOpenfgaTime,
      dbOperationCount,
      openfgaOperationCount,
      timeRatio,
      operationCountRatio,
      totalScenarioTime,
    });
  }

  return results;
};

const aggregateScenariosByType = (results: StrategyComparisonResult[]): StrategyComparisonResult[] => {
  const scenariosByType: Record<string, StrategyComparisonResult[]> = {};
  
  for (const result of results) {
    const scenarioMatch = result.scenario.match(/\["([^-]+-[^-]+-[^-]+(?:-[^-]+)*)-(\d+)"\]/);
    
    if (scenarioMatch) {
      const [, scenarioType] = scenarioMatch;
      scenariosByType[scenarioType] = scenariosByType[scenarioType] || [];
      scenariosByType[scenarioType].push(result);
    } else {
      scenariosByType[result.scenario] = scenariosByType[result.scenario] || [];
      scenariosByType[result.scenario].push(result);
    }
  }

  const aggregatedResults: StrategyComparisonResult[] = [];
  
  for (const [scenarioType, scenarios] of Object.entries(scenariosByType)) {
    if (scenarios.length <= 1) {
      aggregatedResults.push(...scenarios);
      continue;
    }

    const avgDbTime = scenarios.reduce((sum, s) => sum + s.totalDbTime, 0) / scenarios.length;
    const avgOpenfgaTime = scenarios.reduce((sum, s) => sum + s.totalOpenfgaTime, 0) / scenarios.length;
    const avgDbOpCount = scenarios.reduce((sum, s) => sum + s.dbOperationCount, 0) / scenarios.length;
    const avgOpenfgaOpCount = scenarios.reduce((sum, s) => sum + s.openfgaOperationCount, 0) / scenarios.length;
    const avgTimeRatio = scenarios.reduce((sum, s) => sum + s.timeRatio, 0) / scenarios.length;
    const avgOpCountRatio = scenarios.reduce((sum, s) => sum + s.operationCountRatio, 0) / scenarios.length;
    const avgScenarioTime = scenarios.reduce((sum, s) => sum + s.totalScenarioTime, 0) / scenarios.length;

    aggregatedResults.push({
      scenario: `${scenarioType} (avg of ${scenarios.length} iterations)`,
      totalDbTime: avgDbTime,
      totalOpenfgaTime: avgOpenfgaTime,
      dbOperationCount: avgDbOpCount,
      openfgaOperationCount: avgOpenfgaOpCount,
      timeRatio: avgTimeRatio,
      operationCountRatio: avgOpCountRatio,
      totalScenarioTime: avgScenarioTime,
    });
  }
  
  return aggregatedResults;
};

const ensureDirectoryExists = async (filePath: string): Promise<void> => {
  const dir = dirname(filePath);
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

const generateJsonReport = async (
  results: StrategyComparisonResult[],
  filePath: string
): Promise<void> => {
  await ensureDirectoryExists(filePath);
  await writeFile(filePath, JSON.stringify(results, null, 2));
  console.log(`JSON report written to ${filePath}`);
};

const generateCSVReport = async (
  results: StrategyComparisonResult[],
  filePath: string
): Promise<void> => {
  await ensureDirectoryExists(filePath);

  const header = 'Scenario,DB Time (µs),OpenFGA Time (µs),DB Operations,OpenFGA Operations,Time Ratio (DB/OpenFGA),Operation Count Ratio (DB/OpenFGA),Total Scenario Time (µs)\n';
  const rows = results
    .map(result => [
      result.scenario,
      result.totalDbTime.toFixed(2),
      result.totalOpenfgaTime.toFixed(2),
      result.dbOperationCount,
      result.openfgaOperationCount,
      result.timeRatio.toFixed(2),
      result.operationCountRatio.toFixed(2),
      result.totalScenarioTime.toFixed(2),
    ].join(','))
    .join('\n');

  await writeFile(filePath, header + rows);
  console.log(`CSV report written to ${filePath}`);
};

const main = async () => {
  console.log('Starting trace analysis...');

  const { dbTraces, openfgaTraces } = await getAuthorizationTraces();
  console.log(`Found ${dbTraces.length} DB traces and ${openfgaTraces.length} OpenFGA traces`);

  if (dbTraces.length === 0 && openfgaTraces.length === 0) {
    console.log('No traces found for analysis. Please run the benchmark first.');
    return;
  }

  const dbScenarios = groupTracesByScenario(dbTraces);
  const openfgaScenarios = groupTracesByScenario(openfgaTraces);
  const detailedResults = calculateMetrics(dbScenarios, openfgaScenarios);

  console.log('\nDetailed Results:');
  console.table(detailedResults);

  const aggregatedResults = aggregateScenariosByType(detailedResults);
  
  console.log('\nAggregated Results:');
  console.table(aggregatedResults);

  const timestamp = new Date().toISOString().replace(/:/g, '-');
  
  await Promise.all([
    generateCSVReport(aggregatedResults, `${OUTPUT_DIR}/auth-comparison-${timestamp}.csv`),
    generateJsonReport(aggregatedResults, `${OUTPUT_DIR}/auth-comparison-${timestamp}.json`),
    generateCSVReport(detailedResults, `${OUTPUT_DIR}/auth-comparison-detailed-${timestamp}.csv`),
    generateJsonReport(detailedResults, `${OUTPUT_DIR}/auth-comparison-detailed-${timestamp}.json`)
  ]);

  console.log('Analysis complete!');
};

main().catch(console.error);