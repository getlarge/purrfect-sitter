import { join } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import {
  createProjectGraphAsync,
  detectPackageManager,
  readJsonFile,
  workspaceRoot,
} from '@nx/devkit';
import {
  createLockFile,
  getLockFileName,
} from 'nx/src/plugins/js/lock-file/lock-file.js';

const projectPath = process.argv[2];

if (!projectPath) throw new Error('Provide a project path');

const packageJsonPath = join(workspaceRoot, projectPath, 'package.json');
if (!existsSync(packageJsonPath))
  throw new Error(`${packageJsonPath} does not exist`);

const packageJson = readJsonFile(packageJsonPath);

const graph = await createProjectGraphAsync();
const pm = detectPackageManager(workspaceRoot);
const lockfileName = getLockFileName(pm);

const lockfile = createLockFile(packageJson, graph, pm);
writeFileSync(join(workspaceRoot, projectPath, lockfileName), lockfile);

process.exit();
