import axios, { isAxiosError } from 'axios';
import { Configuration, FrontendApi, IdentityApi } from '@ory/kratos-client';
import { OpenFgaApi } from '@openfga/sdk';
import { userRepository } from '@purrfect-sitter/users-repositories';

export interface TestUser {
  id: string;
  email: string;
  sessionToken: string;
  displayName?: string;
}

export interface TestCat {
  id: string;
  name: string;
  ownerId: string;
}

export interface TestCatSitting {
  id: string;
  catId: string;
  sitterId: string;
  status: string;
  startTime: Date;
  endTime: Date;
}

export const kratosPublicClient = new FrontendApi(
  new Configuration({
    basePath: 'http://localhost:4433',
  })
);

export const kratosAdminClient = new IdentityApi(
  new Configuration({
    basePath: 'http://localhost:4434',
  })
);

export const openfgaClient = new OpenFgaApi({
  apiUrl: 'http://localhost:8080',
});

export function getOpenFgaStoreId(): string {
  const { FGA_STORE_ID } = globalThis.__TEST_VARIABLES__ || {};
  if (!FGA_STORE_ID) {
    throw new Error('OpenFGA store ID not found in test variables');
  }

  return FGA_STORE_ID;
}

export async function createTestUser(
  email: string,
  password: string,
  displayName?: string
): Promise<TestUser> {
  const identityResponse = await kratosAdminClient.createIdentity({
    createIdentityBody: {
      schema_id: 'user',
      traits: {
        email,
        display_name: displayName,
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

  await userRepository.create({
    id: identityResponse.data.id,
    role: 'user',
  });

  const { data: loginFlow } = await kratosPublicClient.createNativeLoginFlow(
    {}
  );
  const {
    data: { session_token: sessionToken },
  } = await kratosPublicClient.updateLoginFlow({
    flow: loginFlow.id,
    updateLoginFlowBody: {
      method: 'password',
      identifier: email,
      password,
    },
  });

  return {
    id: identityResponse.data.id,
    email,
    sessionToken: sessionToken as string,
    displayName: displayName,
  };
}

export function createAuthenticatedClient(sessionToken: string) {
  const client = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    validateStatus: () => true,
  });
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (isAxiosError(error)) {
        if (error.response) {
          console.error(
            `HTTP Error: ${error.response.status}`,
            error.response.data
          );
        } else {
          console.error('Network Error:', error.message);
        }
        return Promise.reject(error.cause);
      }
      return Promise.reject(new Error('Unknown error'));
    }
  );

  return client;
}

export async function createTestCat(
  ownerClient: ReturnType<typeof createAuthenticatedClient>,
  name: string,
  ownerId: string,
  attributes: Record<string, unknown> = {}
): Promise<TestCat> {
  const response = await ownerClient.post('/cats', {
    name,
    description: `Test cat ${name}`,
    breed: 'Test Breed',
    age: '3',
    attributes,
  });
  expect(response.status).toBe(201);
  return {
    id: response.data.id,
    name,
    ownerId,
  };
}

export async function createTestCatSitting(
  ownerClient: ReturnType<typeof createAuthenticatedClient>,
  catId: string,
  sitterId: string,
  status = 'requested',
  startTime = new Date(),
  endTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day later
): Promise<TestCatSitting> {
  const response = await ownerClient.post('/cat-sittings', {
    catId,
    sitterId,
    status,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  });

  expect(response.status).toBe(201);

  return {
    id: response.data.id,
    catId,
    sitterId,
    status,
    startTime,
    endTime,
  };
}

export async function createAdmin(identityId: string) {
  if (process.env.AUTH_STRATEGY === 'db') {
    await userRepository.update(identityId, {
      role: 'admin',
    });
  } else if (process.env.AUTH_STRATEGY === 'openfga') {
    const storeId = getOpenFgaStoreId();

    await openfgaClient.write(storeId, {
      writes: {
        tuple_keys: [
          {
            user: `user:${identityId}`,
            relation: 'admin',
            object: 'system:1',
          },
        ],
      },
    });
  }
}
