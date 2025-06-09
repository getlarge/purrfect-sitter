import { ProjectViolation, createConformanceRule } from '@nx/conformance';
import {
  ProjectConfiguration,
  TargetConfiguration,
  Tree,
  formatFiles,
  readJson,
  workspaceRoot,
  writeJson,
} from '@nx/devkit';
import { loadConfigFile } from '@nx/devkit/src/utils/config-utils.js';
import { removePropertyFromJestConfig } from '@nx/jest';
import { glob } from 'node:fs/promises';
import path from 'node:path';

type NoJestWorkersInCiOptions = {
  testTargetNames: string[];
};

type FixableProjectViolation = ProjectViolation & {
  fixGeneratorData: {
    fix: (tree: Tree) => void;
  };
};

type CheckResult = {
  projectJsonPath: string;
  ciConfig: TargetConfiguration['configurations']['ci'];
  hasOneMaxWorkerInCiConfig: boolean;
  jestConfigPath: string | null;
  hasMaxWorkersInJestConfig: boolean;
};

/**
 * Jest workers are doing more harm than good in CI environments, they consume more memory for very little gain and they make tasks distribution less predictable.
 * This rule ensures that Jest workers are not used in CI environments.
 * @see https://jestjs.io/docs/cli#--maxworkersnumstring
 */
export default createConformanceRule<NoJestWorkersInCiOptions>({
  name: 'no-jest-workers-in-ci',
  category: 'reliability',
  description: 'Ensure Jest workers are not used in CI',
  reporter: 'project-reporter',
  implementation: async (context) => {
    const violations: FixableProjectViolation[] = [];
    // TODO: check that "@nx/jest:jest" default targetconfiguration includes a ci config
    const { testTargetNames } = context.ruleOptions;
    for (const node of Object.values(context.projectGraph.nodes)) {
      const found = Object.entries(node.data.targets ?? {}).find(
        ([targetName, target]) =>
          testTargetNames.includes(targetName) &&
          target.executor === '@nx/jest:jest'
      );
      if (!found) {
        continue;
      }
      const [testTargetName, testTarget] = found;
      const checkResult = await checkJestConfigs(node.data.root, testTarget);
      const { hasOneMaxWorkerInCiConfig, hasMaxWorkersInJestConfig } =
        checkResult;
      if (hasOneMaxWorkerInCiConfig && !hasMaxWorkersInJestConfig) {
        continue;
      }
      violations.push({
        sourceProject: node.data.name ?? node.name,
        message:
          `Project '${node.name}' using Jest executor does not have proper worker configuration for CI:` +
          `${
            hasOneMaxWorkerInCiConfig
              ? ''
              : " Invalid 'maxWorkers' setting in CI configuration."
          }` +
          `${
            hasMaxWorkersInJestConfig
              ? " Found 'maxWorkers' in Jest config which may override CI settings."
              : ''
          }` +
          ` Please ensure CI configuration includes 'maxWorkers: 1' and remove 'maxWorkers' from Jest config.`,
        fixGeneratorData: {
          fix(tree: Tree) {
            fixJestConfigs(tree, checkResult, testTargetName);
          },
        },
      });
    }

    return {
      severity: 'medium',
      details: {
        violations,
      },
    };
  },
  async fixGenerator(tree, { violations }) {
    const fixableViolations = violations.filter(
      (v) => v.fixGeneratorData?.['fix']
    ) as FixableProjectViolation[];
    fixableViolations.forEach((v) => v.fixGeneratorData.fix(tree));
    await formatFiles(tree);
  },
});

/**
 * Find the Jest config file in the project directory
 */
async function findJestConfigFile(projectRoot: string): Promise<string | null> {
  for await (const file of glob(`**/jest.config.{js,ts,cjs,mjs}`, {
    cwd: projectRoot,
  })) {
    if (file) {
      return path.join(projectRoot, file);
    }
  }
  return null;
}

async function findMaxWorkersInJestConfig(
  projectRoot: string,
  jestConfigPath: string
): Promise<number | undefined> {
  try {
    const absConfigFilePath = path.join(workspaceRoot, jestConfigPath);
    const rawConfig = await loadConfigFile(absConfigFilePath);
    return rawConfig?.maxWorkers;
  } catch {
    // logger.warn(`Could not read Jest config file for project ${node.name}`);
    return undefined;
  }
}

async function checkJestConfigs(
  projectRoot: string,
  testTarget: TargetConfiguration
): Promise<CheckResult> {
  const projectJsonPath = path.join(projectRoot, 'project.json');
  const ciConfig = testTarget?.configurations?.['ci'];
  const hasOneMaxWorkerInCiConfig =
    ciConfig && typeof ciConfig === 'object' && ciConfig.maxWorkers === 1;
  const jestConfigPath = await findJestConfigFile(projectRoot);
  const maxWorkersInJestConfig = jestConfigPath
    ? await findMaxWorkersInJestConfig(projectRoot, jestConfigPath)
    : undefined;
  const hasMaxWorkersInJestConfig =
    maxWorkersInJestConfig !== undefined && maxWorkersInJestConfig !== 1;
  return {
    projectJsonPath,
    ciConfig,
    hasOneMaxWorkerInCiConfig,
    jestConfigPath,
    hasMaxWorkersInJestConfig,
  };
}

function fixJestConfigs(
  tree: Tree,
  checkResult: CheckResult,
  testTargetName: string
) {
  const {
    projectJsonPath,
    hasOneMaxWorkerInCiConfig,
    hasMaxWorkersInJestConfig,
    jestConfigPath,
  } = checkResult;
  if (
    jestConfigPath &&
    hasMaxWorkersInJestConfig &&
    tree.exists(jestConfigPath)
  ) {
    removePropertyFromJestConfig(tree, jestConfigPath, 'maxWorkers');
  }

  if (!hasOneMaxWorkerInCiConfig) {
    const project = readJson<ProjectConfiguration>(tree, projectJsonPath);
    const ciConfiguration =
      project.targets?.[testTargetName]?.configurations?.['ci'] ?? {};
    if (ciConfiguration) {
      delete ciConfiguration.maxWorkers;
    }

    writeJson(tree, projectJsonPath, project);
  }
}
