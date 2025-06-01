#!/usr/bin/env tsx
/**
 * Time-based permission example with OpenFGA
 * Run with: npx tsx .devcontainer/examples/openfga-time-based.ts
 */

import { OpenFgaClient } from '@openfga/sdk';

const fgaClient = new OpenFgaClient({
  apiUrl: process.env.OPENFGA_API_URL || 'http://localhost:8080',
  storeId: process.env.FGA_STORE_ID,
});

async function setupAndCheckTimeBasedPermission() {
  try {
    // First, create the time-based relationship
    await fgaClient.write({
      writes: [{
        user: 'cat_sitting:1#sitter',
        relation: 'active_sitter',
        object: 'cat_sitting:1',
        condition: {
          name: 'is_active_timeslot',
          context: {
            start_time: '2023-01-01T00:00:00Z',
            end_time: '2023-01-02T00:00:00Z',
          },
        },
      }],
    });

    console.log('✅ Created time-based permission\n');

    // Check during active time
    const duringActiveTime = await fgaClient.check({
      user: 'user:anne',
      relation: 'can_post_updates',
      object: 'cat_sitting:1',
      context: {
        current_time: '2023-01-01T12:00:00Z',
      },
    });

    console.log(`Can Anne post updates during her shift (Jan 1, noon)?`);
    console.log(`${duringActiveTime.allowed ? '✅ Yes' : '❌ No'}\n`);

    // Check after active time
    const afterActiveTime = await fgaClient.check({
      user: 'user:anne',
      relation: 'can_post_updates',
      object: 'cat_sitting:1',
      context: {
        current_time: '2023-01-03T00:00:00Z',
      },
    });

    console.log(`Can Anne post updates after her shift (Jan 3)?`);
    console.log(`${afterActiveTime.allowed ? '✅ Yes' : '❌ No'}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
setupAndCheckTimeBasedPermission();