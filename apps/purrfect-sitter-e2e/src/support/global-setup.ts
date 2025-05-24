/* eslint-disable */
import { exec } from 'node:child_process';
import { inspect, promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { transformer } from '@openfga/syntax-transformer';
import { openfgaClient } from './test-utils.ts';

var __TEARDOWN_MESSAGE__: string;
var __TEST_VARIABLES__: {
  FGA_STORE_ID?: string;
};
globalThis.__TEST_VARIABLES__ ??= {};
process.env.AUTH_STRATEGY ??= 'openfga';
process.env.DATABASE_URL ??=
  'postgres://dbuser:secret@localhost:5432/purrfect-sitter-test?sslmode=disable';
// Dummy store ID for OpenFGA to avoid purrfect-sitter-api crashing
process.env.FGA_STORE_ID = 'dummy-store-id';

globalThis.__TEST_VARIABLES__ = {
  ...(globalThis.__TEST_VARIABLES__ || {}),
  FGA_STORE_ID: process.env.FGA_STORE_ID,
  AUTH_STRATEGY: process.env.AUTH_STRATEGY,
  DATABASE_URL: process.env.DATABASE_URL,
};

const execAsync = promisify(exec);

async function setupOpenFGA() {
  console.log('Setting up OpenFGA...');
  try {
    const store = await openfgaClient.createStore({
      name: 'purrfect-sitter-test',
    });

    console.log(`Created OpenFGA store with ID: ${store.id}`);
    const modelPath = path.join(process.cwd(), 'purrfect-sitter-model.fga');
    const dslString = readFileSync(modelPath, 'utf8');
    const modelJson = transformer.transformDSLToJSONObject(dslString);
    console.debug(inspect(modelJson, { depth: null, colors: true }));

    console.log('Uploading OpenFGA authorization model...');
    await openfgaClient.writeAuthorizationModel(store.id, modelJson);

    console.log('OpenFGA authorization model uploaded successfully');

    return store.id;
  } catch (error) {
    console.error('Error setting up OpenFGA:', error);
    throw error;
  }
}

module.exports = async function () {
  console.log('\nSetting up E2E test environment...\n');
  // TODO: check env variables presence, DATABASE_URL, AUTH_STRATEGY, etc.
  try {
    await execAsync('docker compose -f docker-compose-ci.yml up -d --wait');
    await execAsync('npx nx run database:migrate');

    const openfgaStoreId = await setupOpenFGA();
    globalThis.__TEST_VARIABLES__.FGA_STORE_ID = openfgaStoreId;
    process.env.FGA_STORE_ID = openfgaStoreId;
    await execAsync(
      'docker compose -f docker-compose-ci.yml up -d --wait purrfect-sitter-api'
    );
    console.log('Starting API server with test configuration...');

    globalThis.__TEARDOWN_MESSAGE__ =
      '\nTearing down E2E test environment...\n';
    console.log('E2E test environment setup completed successfully');
  } catch (error) {
    console.error('Error setting up E2E test environment:', error);
    process.exit(1);
  }
};
