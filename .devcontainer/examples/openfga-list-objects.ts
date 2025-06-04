#!/usr/bin/env tsx
/**
 * List objects example - finding what a user has access to
 * Run with: npx tsx .devcontainer/examples/openfga-list-objects.ts
 */

import { OpenFgaClient } from '@openfga/sdk';

const fgaClient = new OpenFgaClient({
  apiUrl: process.env.OPENFGA_API_URL || 'http://localhost:8080',
  storeId: process.env.FGA_STORE_ID,
});

async function listUserPermissions() {
  try {
    // Find all cat sittings where Anne is an active sitter
    const activeSittings = await fgaClient.listObjects({
      user: 'user:anne',
      relation: 'active_sitter',
      type: 'cat_sitting',
      contextualTuples: {
        current_time: '2023-01-01T12:00:00Z',
      },
    });

    console.log('Anne is actively sitting for:');
    activeSittings.objects.forEach(id => {
      console.log(`  - ${id}`);
    });
    console.log();

    // Find all cats Bob can manage
    const managedCats = await fgaClient.listObjects({
      user: 'user:bob',
      relation: 'can_manage',
      type: 'cat',
    });

    console.log('Bob can manage these cats:');
    managedCats.objects.forEach(id => {
      console.log(`  - ${id}`);
    });
    console.log();

    // Find all reviews Jenny (admin) can delete
    const deletableReviews = await fgaClient.listObjects({
      user: 'user:jenny',
      relation: 'can_delete',
      type: 'review',
    });

    console.log('Jenny (admin) can delete these reviews:');
    deletableReviews.objects.forEach(id => {
      console.log(`  - ${id}`);
    });

  } catch (error) {
    console.error('Error listing objects:', error);
  }
}

// Run the example
listUserPermissions();