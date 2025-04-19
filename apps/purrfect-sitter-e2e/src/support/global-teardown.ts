import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

module.exports = async function () {
  console.log(globalThis.__TEARDOWN_MESSAGE__);

  try {
    await execAsync('docker compose -f docker-compose-ci.yml down');

    console.log('E2E test environment teardown completed successfully');
  } catch (error) {
    console.error('Error during teardown:', error);
  }
};
