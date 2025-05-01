import axios, { isAxiosError, type AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { OpenFgaApi } from '@openfga/sdk';
import { randomBytes } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { Configuration, FrontendApi, IdentityApi } from '@ory/kratos-client';
import { users } from '@purrfect-sitter/database';
import type { CatDto, CatSittingDto, ReviewDto } from '@purrfect-sitter/models';
import path from 'node:path';

type UserRole = 'cat_owner' | 'cat_sitter' | 'admin';

interface TestUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  sessionToken: string;
}

dotenv.config({
  path: path.join(import.meta.dirname, '../../apps/purrfect-sitter/.env'),
});

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const KRATOS_URL = process.env.KRATOS_PUBLIC_URL || 'http://localhost:4433';
const KRATOS_ADMIN_URL =
  process.env.KRATOS_ADMIN_URL || 'http://localhost:4434';
const ITERATIONS = process.env.ITERATIONS ? +process.env.ITERATIONS : 5;

const FGA_STORE_ID = process.env.FGA_STORE_ID;
const FGA_MODEL_ID = process.env.FGA_MODEL_ID;
const DATABASE_URL = process.env.DATABASE_URL;
const OPENFGA_URL = process.env.OPENFGA_URL || 'http://localhost:8080';

const createdResources = {
  users: [] as string[],
  cats: [] as string[],
  catSittings: [] as string[],
  reviews: [] as string[],
};

const db = drizzle({
  connection: DATABASE_URL as string,
  schema: {
    users,
  },
});

const frontendApi = new FrontendApi(
  new Configuration({
    basePath: KRATOS_URL,
  })
);

const identityApi = new IdentityApi(
  new Configuration({
    basePath: KRATOS_ADMIN_URL,
  })
);

async function createUser(
  email: string,
  password: string,
  role: UserRole
): Promise<TestUser> {
  console.log(`Creating user: ${email}`);

  const identity = await identityApi.createIdentity({
    createIdentityBody: {
      schema_id: 'user',
      traits: {
        email,
      },
      credentials: {
        password: {
          config: {
            password,
          },
        },
      },
    },
  });

  const userId = identity.data.id;
  await db.insert(users).values({
    id: userId,
    role: 'user',
  });

  createdResources.users.push(userId);

  const loginResponse = await frontendApi.createNativeLoginFlow();
  const login = await frontendApi.updateLoginFlow({
    flow: loginResponse.data.id,
    updateLoginFlowBody: {
      method: 'password',
      password,
      identifier: email,
    },
  });

  const sessionToken = login.data.session_token;
  if (!sessionToken) {
    throw new Error('Failed to create session token');
  }
  return {
    id: userId,
    email,
    password,
    role,
    sessionToken,
  };
}

/**
 * Create an admin user in OpenFGA and set their role in the database.
 * @param userId
 */
async function createAdmin(userId: string): Promise<void> {
  console.log(`Setting user ${userId} as admin`);

  const openfgaClient = new OpenFgaApi({
    apiUrl: OPENFGA_URL,
  });
  const model = await openfgaClient.readAuthorizationModel(
    FGA_STORE_ID as string,
    FGA_MODEL_ID as string
  );
  if (!model) {
    throw new Error('Failed to read OpenFGA model');
  }
  await openfgaClient.write(FGA_STORE_ID as string, {
    writes: {
      tuple_keys: [
        {
          user: `user:${userId}`,
          relation: 'admin',
          object: 'system:1',
        },
      ],
    },
  });

  await db
    .update(users)
    .set({
      role: 'admin',
    })
    .where(eq(users.id, userId))
    .returning();
}

function createAuthenticatedClient(sessionToken: string): AxiosInstance {
  const instance = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
      authorization: sessionToken,
    },
  });
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (isAxiosError(error)) {
        if (error.response) {
          console.error(
            `HTTP Error: ${error.response.status}`,
            error.response.data
          );
        } else {
          console.error('Network Error:', error.message);
        }
      }
      return Promise.reject(error);
    }
  );
  return instance;
}

// Main benchmark runner
async function runAuthBenchmark(authStrategy: 'db' | 'openfga') {
  console.log(
    `\n========== Running benchmark for ${authStrategy} strategy ==========`
  );

  const catOwner = await createUser(
    `cat_owner_${authStrategy}_${randomBytes(4).toString('hex')}@test.com`,
    randomBytes(8).toString('hex'),
    'cat_owner'
  );

  const catSitter = await createUser(
    `cat_sitter_${authStrategy}_${randomBytes(4).toString('hex')}@test.com`,
    randomBytes(8).toString('hex'),
    'cat_sitter'
  );

  const admin = await createUser(
    `admin_${authStrategy}_${randomBytes(4).toString('hex')}@test.com`,
    randomBytes(8).toString('hex'),
    'admin'
  );

  await createAdmin(admin.id);

  const ownerClient = createAuthenticatedClient(catOwner.sessionToken);
  const sitterClient = createAuthenticatedClient(catSitter.sessionToken);
  const adminClient = createAuthenticatedClient(admin.sessionToken);

  console.log('Creating test cat');
  const catResponse = await ownerClient.post('/cats', {
    name: `Test Cat ${authStrategy}`,
    description: 'A test cat for benchmarking',
    breed: 'Benchmark Breed',
    age: '3',
  });

  const cat: CatDto = catResponse.data.data;
  createdResources.cats.push(cat.id);

  await runScenarios(authStrategy, {
    ownerClient,
    sitterClient,
    adminClient,
    cat,
    catOwner,
    catSitter,
  });

  console.log(`Benchmark for ${authStrategy} strategy completed`);
}

async function runScenarios(
  strategy: string,
  {
    ownerClient,
    sitterClient,
    adminClient,
    cat,
    catSitter,
  }: {
    ownerClient: AxiosInstance;
    sitterClient: AxiosInstance;
    adminClient: AxiosInstance;
    cat: CatDto;
    catOwner: TestUser;
    catSitter: TestUser;
  }
) {
  // We'll run each scenario multiple times to get a good average
  for (let i = 0; i < ITERATIONS; i++) {
    console.log(`\nIteration ${i + 1}/${ITERATIONS} - ${strategy} strategy`);

    console.log(`Scenario 1: Simple case - View cat (public access)`);
    await scenarioViewCat(ownerClient, sitterClient, cat.id, i);

    console.log(`Scenario 2: Medium case - Cat sitting creation & management`);
    const catSitting = await scenarioCatSittingManagement(
      ownerClient,
      sitterClient,
      adminClient,
      cat.id,
      catSitter.id,
      i
    );

    console.log(
      `Scenario 3: Complex case - Nested authorization checks (review permissions)`
    );
    await scenarioReviewManagement(
      ownerClient,
      sitterClient,
      adminClient,
      catSitting.id,
      i
    );

    // Wait a bit between iterations to separate trace data
    await setTimeout(500);
  }
}

// Individual scenarios
async function scenarioViewCat(
  ownerClient: AxiosInstance,
  sitterClient: AxiosInstance,
  catId: string,
  iteration: number
) {
  try {
    // Owner views cat
    const ownerResponse = await ownerClient.get(`/cats/${catId}`, {
      headers: {
        'X-Benchmark-Scenario': `1-view-cat-owner-${iteration}`,
      },
    });
    console.log(`\tOwner view cat: ${ownerResponse.status}`);

    // Sitter views cat
    const sitterResponse = await sitterClient.get(`/cats/${catId}`, {
      headers: {
        'X-Benchmark-Scenario': `1-view-cat-sitter-${iteration}`,
      },
    });
    console.log(`\tSitter view cat: ${sitterResponse.status}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error;
    console.error('Error in scenarioViewCat:', errorMessage);
    throw error;
  }
}

async function scenarioCatSittingManagement(
  ownerClient: AxiosInstance,
  sitterClient: AxiosInstance,
  adminClient: AxiosInstance,
  catId: string,
  sitterId: string,
  iteration: number
): Promise<CatSittingDto> {
  try {
    // Owner creates cat sitting starting now
    const createResponse = await ownerClient.post(
      '/cat-sittings',
      {
        catId,
        sitterId,
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        // startTime: new Date(Date.now()).toISOString(),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        headers: {
          'X-Benchmark-Scenario': `2-create-sitting-${iteration}`,
        },
      }
    );
    console.log(`\tCreate cat sitting: ${createResponse.status}`);
    const catSitting: CatSittingDto = createResponse.data.data;
    createdResources.catSittings.push(catSitting.id);

    // Sitter views assigned sitting
    const viewResponse = await sitterClient.get(
      `/cat-sittings/${catSitting.id}`,
      {
        headers: {
          'X-Benchmark-Scenario': `2-view-sitting-sitter-${iteration}`,
        },
      }
    );
    console.log(`\tSitter view sitting: ${viewResponse.status}`);

    // Sitter updates sitting (should succeed - pending state)
    const updateResponse = await sitterClient.put(
      `/cat-sittings/${catSitting.id}`,
      {
        ...catSitting,
        attributes: { note: 'Added some notes from the sitter' },
      },
      {
        headers: {
          'X-Benchmark-Scenario': `2-update-sitting-${iteration}`,
        },
      }
    );
    console.log(`\tSitter update sitting: ${updateResponse.status}`);

    // TODO: Sitter approves sitting, not yet supported
    // const approveResponse = await sitterClient.put(
    //   `/cat-sittings/${catSitting.id}/status`,
    //   {
    //     status: 'approved',
    //   },
    //   {
    //     headers: {
    //       'X-Benchmark-Scenario': `2-approve-sitting-${iteration}`,
    //     },
    //   }
    // );
    // console.log(`  Sitter approve sitting: ${approveResponse.status}`);

    // Owner sets sitting to active
    const activeResponse = await ownerClient.put(
      `/cat-sittings/${catSitting.id}`,
      {
        startTime: new Date(Date.now()).toISOString(),
        status: 'active',
      },
      {
        headers: {
          'X-Benchmark-Scenario': `2-activate-sitting-${iteration}`,
        },
      }
    );
    console.log(`\tActivate sitting: ${activeResponse.status}`);

    // Sitter attempts update in active state (should fail)
    try {
      const failUpdateResponse = await sitterClient.put(
        `/cat-sittings/${catSitting.id}`,
        {
          ...catSitting,
          attributes: { note: 'Update during active state' },
        },
        {
          headers: {
            'X-Benchmark-Scenario': `2-update-active-sitting-${iteration}`,
          },
        }
      );
      console.log(
        `\tSitter update active sitting: ${failUpdateResponse.status} (expected 403)`
      );
    } catch (error) {
      console.log(
        `\tSitter update active sitting: ${error.response?.status} (expected 403)`
      );
    }

    // Complete sitting
    const completeResponse = await ownerClient.put(
      `/cat-sittings/${catSitting.id}/status`,
      {
        status: 'completed',
      },
      {
        headers: {
          'X-Benchmark-Scenario': `2-complete-sitting-${iteration}`,
        },
      }
    );
    console.log(`\tComplete sitting: ${completeResponse.status}`);

    return completeResponse.data.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error;
    console.error('Error in scenarioCatSittingManagement:', errorMessage);
    throw error;
  }
}

async function scenarioReviewManagement(
  ownerClient: AxiosInstance,
  sitterClient: AxiosInstance,
  adminClient: AxiosInstance,
  catSittingId: string,
  iteration: number
) {
  try {
    // Owner creates review
    const createResponse = await ownerClient.post(
      '/reviews',
      {
        catSittingId,
        rating: 5,
        content: 'Excellent service!',
      },
      {
        headers: {
          'X-Benchmark-Scenario': `3-create-review-${iteration}`,
        },
      }
    );
    console.log(`\tCreate review: ${createResponse.status}`);
    const review: ReviewDto = createResponse.data.data;
    createdResources.reviews.push(review.id);

    // Sitter tries to edit review (should fail)
    try {
      const editResponse = await sitterClient.put(
        `/reviews/${review.id}`,
        {
          ...review,
          content: 'Modified by sitter',
        },
        {
          headers: {
            'X-Benchmark-Scenario': `3-edit-review-sitter-${iteration}`,
          },
        }
      );
      console.log(
        `\tSitter edit review: ${editResponse.status} (expected 403)`
      );
    } catch (error) {
      console.log(
        `\tSitter edit review: ${error.response?.status} (expected 403)`
      );
    }

    // Owner edits review (should succeed)
    const ownerEditResponse = await ownerClient.put(
      `/reviews/${review.id}`,
      {
        ...review,
        content: 'Updated review content',
      },
      {
        headers: {
          'X-Benchmark-Scenario': `3-edit-review-owner-${iteration}`,
        },
      }
    );
    console.log(`\tOwner edit review: ${ownerEditResponse.status}`);

    // Admin edits review (should succeed)
    const adminEditResponse = await adminClient.put(
      `/reviews/${review.id}`,
      {
        ...review,
        content: 'Admin edited this review',
      },
      {
        headers: {
          'X-Benchmark-Scenario': `3-edit-review-admin-${iteration}`,
        },
      }
    );
    console.log(`\tAdmin edit review: ${adminEditResponse.status}`);

    return review;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error;
    console.error('Error in scenarioReviewManagement:', errorMessage);
    throw error;
  }
}

// Cleanup resources
async function cleanup() {
  console.log('\nCleaning up resources...');

  try {
    // Get an admin session to clean things up
    const adminEmail = `cleanup_admin_${randomBytes(4).toString(
      'hex'
    )}@test.com`;
    const adminPassword = randomBytes(8).toString('hex');

    const admin = await createUser(adminEmail, adminPassword, 'admin');
    await createAdmin(admin.id);

    const adminClient = createAuthenticatedClient(admin.sessionToken);

    // Clean up reviews
    for (const reviewId of createdResources.reviews) {
      try {
        await adminClient.delete(`/reviews/${reviewId}`);
        console.log(`Deleted review: ${reviewId}`);
      } catch (error) {
        console.error(`Failed to delete review ${reviewId}:`, error.message);
      }
    }

    // Clean up cat sittings
    for (const sittingId of createdResources.catSittings) {
      try {
        await adminClient.delete(`/cat-sittings/${sittingId}`);
        console.log(`Deleted cat sitting: ${sittingId}`);
      } catch (error) {
        console.error(
          `Failed to delete cat sitting ${sittingId}:`,
          error.message
        );
      }
    }

    // Clean up cats
    for (const catId of createdResources.cats) {
      try {
        await adminClient.delete(`/cats/${catId}`);
        console.log(`Deleted cat: ${catId}`);
      } catch (error) {
        console.error(`Failed to delete cat ${catId}:`, error.message);
      }
    }

    // Delete users last (including admin user for cleanup)
    createdResources.users.push(admin.id);
    for (const userId of createdResources.users) {
      try {
        await identityApi.deleteIdentity({ id: userId });
        await db.delete(users).where(eq(users.id, userId));
        console.log(`Deleted user: ${userId}`);
      } catch (error) {
        console.error(`Failed to delete user ${userId}:`, error.message);
      }
    }

    console.log('Cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Main function
async function main() {
  try {
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, cleaning up before exit...');
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, cleaning up before exit...');
      await cleanup();
      process.exit(0);
    });

    // Check health endpoint to make sure API is running and get current strategy
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log(`API Health: ${healthResponse.status}`);
    console.log(`Current auth strategy: ${healthResponse.data.authStrategy}`);

    const authStrategy = healthResponse.data.authStrategy;
    await runAuthBenchmark(authStrategy);

    console.log('\nBenchmark completed successfully!');
    console.log('Check Zipkin for trace visualization.');
  } finally {
    await cleanup();
  }
}

main().catch(async (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
