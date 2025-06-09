import fs from 'node:fs/promises';
import path from 'node:path';
import { createConformanceRule, ProjectViolation } from '@nx/conformance';
import { formatFiles, readJsonFile, Tree, workspaceRoot } from '@nx/devkit';

type FixableProjectViolation = ProjectViolation & {
  fixGeneratorData: {
    fix: (tree: Tree) => void;
  };
};

export default createConformanceRule({
  name: 'no-project-json',
  category: 'consistency',
  description: 'Ensure Nx project configuratio is located in package.jsonn',
  reporter: 'project-reporter',
  implementation: async (context) => {
    const violations: FixableProjectViolation[] = [];
    for (const node of Object.values(context.projectGraph.nodes)) {
      const projectRoot = node.data.root;
      try {
        await fs.access(path.join(workspaceRoot, projectRoot, 'project.json'));
        violations.push({
          sourceProject: node.data.name ?? node.name,
          message: `project.json file found in ${projectRoot}. Use only package.json with an 'nx' property for configuration.`,
          fixGeneratorData: {
            fix: (tree: Tree) => {
              const projectJsonPath = path.join(projectRoot, 'project.json');
              const packageJsonPath = path.join(projectRoot, 'package.json');
              const packageJson = readJsonFile(packageJsonPath);
              // TODO: refine merge logic to avoid overwriting existing 'nx' property
              tree.write(
                packageJsonPath,
                JSON.stringify(
                  {
                    ...packageJson,
                    nx: {
                      ...readJsonFile(projectJsonPath),
                      ...packageJson.nx,
                    },
                  },
                  null,
                  2
                )
              );
              tree.delete(projectJsonPath);
            },
          },
        });
      } catch {
        // File does not exist, which is correct
      }
    }

    return {
      severity: 'low',
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
