// Script to fix imports in TS files for ESM compatibility
// Adds .js extensions to local imports and node: prefix to Node.js built-in modules

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Node.js built-in modules to prefix with 'node:'
const nodeBuiltins = [
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
];

// File extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Files and directories to exclude
const excludes = ['node_modules', 'dist', '.git', 'tools'];

// Fix relative imports to add .js extension and add node: prefix to built-in modules
async function fixImportsInFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');

    // Fix relative imports by adding .js extension
    let updatedContent = content.replace(
      /from\s+['"](\..*?)['"]|import\s+['"](\..*?)['"]/g,
      (match, p1, p2) => {
        const importPath = p1 || p2;
        if (
          importPath.endsWith('.js') ||
          importPath.endsWith('.jsx') ||
          importPath.endsWith('.json') ||
          importPath.endsWith('.css') ||
          importPath.endsWith('.scss')
        ) {
          return match; // Already has extension
        }
        return match.replace(importPath, `${importPath}.js`);
      }
    );

    // Add node: prefix to Node.js built-in modules
    nodeBuiltins.forEach((mod) => {
      const regex = new RegExp(
        `from\\s+['"]${mod}['"]|import\\s+['"]${mod}['"]`,
        'g'
      );
      updatedContent = updatedContent.replace(regex, (match) => {
        return match
          .replace(`'${mod}'`, `'node:${mod}'`)
          .replace(`"${mod}"`, `"node:${mod}"`);
      });
    });

    // Only write the file if changes were made
    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent);
      console.log(`✅ Updated imports in ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

// Walk directory recursively and process files
async function walkDir(dir) {
  let filesUpdated = 0;

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip excluded directories
    if (excludes.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      filesUpdated += await walkDir(fullPath);
    } else if (
      entry.isFile() &&
      extensions.includes(path.extname(entry.name))
    ) {
      const updated = await fixImportsInFile(fullPath);
      if (updated) filesUpdated++;
    }
  }

  return filesUpdated;
}

// Main function
async function main() {
  console.log('🔍 Starting to fix imports...');

  try {
    const filesUpdated = await walkDir(rootDir);
    console.log(`✨ Done! Updated ${filesUpdated} files.`);
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

main();
