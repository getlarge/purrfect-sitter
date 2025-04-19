/* eslint-disable */
import { exec } from 'node:child_process';
import { inspect, promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { transformer } from '@openfga/syntax-transformer';
import { openfgaClient } from './test-utils';

var __TEARDOWN_MESSAGE__: string;
var __TEST_VARIABLES__: {
  openfgaStoreId?: string;
};

process.env.AUTH_STRATEGY ??= 'openfga';
process.env.DATABASE_URL ??=
  'postgres://dbuser:secret@localhost:5432/purrfect-sitter-test?sslmode=disable';

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

    globalThis.__TEST_VARIABLES__ = {
      ...(globalThis.__TEST_VARIABLES__ || {}),
      openfgaStoreId: store.id,
    };

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

    // ? run db migrations?
    if (process.env.AUTH_STRATEGY === 'openfga') {
      const openfgaStoreId = await setupOpenFGA();

      await execAsync(
        'docker compose -f docker-compose-ci.yml restart purrfect-sitter-api',
        {
          env: {
            ...process.env,
            FGA_STORE_ID: openfgaStoreId,
          },
        }
      );
    }

    console.log('Starting API server with test configuration...');

    globalThis.__TEARDOWN_MESSAGE__ =
      '\nTearing down E2E test environment...\n';

    console.log('E2E test environment setup completed successfully');
  } catch (error) {
    console.error('Error setting up E2E test environment:', error);
    process.exit(1);
  }
};
