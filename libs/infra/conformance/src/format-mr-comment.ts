import type {
  ConformanceRuleResultWithRuleAndRunnerData,
  NonProjectFilesViolation,
  ProjectFilesViolation,
  ProjectViolation,
  ValidReporter,
} from '@nx/conformance';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Violation =
  | ProjectViolation
  | ProjectFilesViolation
  | NonProjectFilesViolation;

type Summary = {
  violationCount: number;
  hasViolations: boolean;
};

const createSummary = (
  ruleResults: ConformanceRuleResultWithRuleAndRunnerData<ValidReporter>[]
): Summary => {
  const violationCount = ruleResults.reduce(
    (count, rule) => count + (rule.details.violations?.length || 0),
    0
  );

  return {
    violationCount,
    hasViolations: violationCount > 0,
  };
};

const generateHeader = (summary: Summary) => {
  const { violationCount, hasViolations } = summary;

  if (!hasViolations) {
    return [
      '# Cloud Conformance Rules Check',
      '### ✅ All checks passed',
      'No violations were found. Great job!',
    ];
  }

  return [
    '# Cloud Conformance Rules Check',
    `### ❌ Found ${violationCount} violation${
      violationCount === 1 ? '' : 's'
    }`,
  ];
};

const groupViolationsByPattern = (violations: Violation[]) =>
  violations.reduce((acc, violation) => {
    if (!('sourceProject' in violation)) {
      // Skip violations without a source project
      return acc;
    }
    const projectName = violation.sourceProject;
    const genericMessage = violation.message
      .replace(projectName, '{project}')
      .replace(/Angular application '.*?' has/, 'Angular applications have');

    acc[genericMessage] ??= [];
    acc[genericMessage].push(projectName);
    return acc;
  }, {} as Record<string, string[]>);

const formatIssuesSection = (violations: Violation[]) => {
  const lines = ['### Issues'];
  const projectsByPattern = groupViolationsByPattern(violations);

  Object.entries(projectsByPattern).forEach(([genericMessage, projects]) => {
    lines.push(
      `**Issue:** ${genericMessage}`,
      '<details>',
      `<summary>Show all ${projects.length} affected projects</summary>`,
      ''
    );

    // Sort the projects for consistent display
    const sortedProjects = [...projects].sort();
    const projectsList = sortedProjects
      .map((project) => `- \`${project}\``)
      .join('\n');
    lines.push(projectsList, '</details>');
  });

  return lines;
};

const formatRule = (
  rule: ConformanceRuleResultWithRuleAndRunnerData<ValidReporter>
) => {
  const { name, category, description } = rule.ruleData;
  const { violations } = rule.details;
  const severity = rule.severity.toUpperCase();

  return [
    '<details>',
    `<summary><strong>${name}</strong> (${severity} severity) - ${violations.length} violations</summary>`,
    '',
    `**Category:** ${category}`,
    `**Description:** ${description}`,
    ...formatIssuesSection(violations),
    '</details>',
  ];
};

export const formatConformanceResultsToMarkdown = (results: {
  ruleResults: ConformanceRuleResultWithRuleAndRunnerData<ValidReporter>[];
}) => {
  if (!results?.ruleResults?.length) {
    return '### ❌ Conformance check failed\nNo valid results found.';
  }

  const summary = createSummary(results.ruleResults);
  const header = generateHeader(summary);

  if (!summary.hasViolations) {
    return header.join('\n\n');
  }

  const rulesWithViolations = results.ruleResults.filter(
    (rule) => rule.details.violations?.length > 0
  );
  const formattedRules = rulesWithViolations.map(formatRule);
  const allLines = [...header, ...formattedRules.flat()];

  return allLines.join('\n\n');
};

const main = async () => {
  try {
    const args = process.argv.slice(2);
    const inputPath = args[0] || path.resolve('dist/conformance-result.json');
    const outputPath = args[1] || path.resolve('dist/conformance-result.md');

    const rawData = await fs.readFile(inputPath, 'utf8');
    const results = JSON.parse(rawData);

    const markdown = formatConformanceResultsToMarkdown(results);
    await fs.writeFile(outputPath, markdown, 'utf8');

    console.info(`✅ Markdown output written to ${outputPath}`);
  } catch (error) {
    console.error('❌ Error processing conformance results:', error);
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
