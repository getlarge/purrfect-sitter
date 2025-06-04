#!/usr/bin/env tsx
/**
 * Basic OpenFGA permission check example
 * Run with: npx tsx .devcontainer/examples/openfga-basic-check.ts
 */

import { OpenFgaClient } from '@openfga/sdk';

// Initialize the OpenFGA client
const fgaClient = new OpenFgaClient({
  apiUrl: process.env.OPENFGA_API_URL || 'http://localhost:8080',
  storeId: process.env.FGA_STORE_ID,
});

async function checkPermission() {
  try {
    // Check if Bob can manage Romeo
    const { allowed } = await fgaClient.check({
      user: 'user:bob',
      relation: 'can_manage',
      object: 'cat:romeo',
    });

    console.log(`Can Bob manage Romeo? ${allowed ? '✅ Yes' : '❌ No'}`);
  } catch (error) {
    console.error('Error checking permission:', error);
  }
}

// Run the example
checkPermission();