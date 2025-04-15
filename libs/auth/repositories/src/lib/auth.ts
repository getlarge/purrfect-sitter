import { Configuration, FrontendApi } from '@ory/kratos-client';
import { OpenFgaApi } from '@openfga/sdk';

export interface IAuthConfig {
  kratosUrl: string;
  openfgaUrl: string;
  openfgaStoreId: string;
  authStrategy: 'db' | 'openfga';
}

export interface ISessionUser {
  id: string;
  email: string;
  displayName?: string;
}

// Singleton instances
let kratosClient: FrontendApi;
let openfgaClient: OpenFgaApi;
let authConfig: IAuthConfig;

export const getKratosClient = () => {
  if (!kratosClient) {
    if (!authConfig?.kratosUrl) {
      throw new Error('Kratos URL not configured');
    }
    kratosClient = new FrontendApi(
      new Configuration({
        basePath: authConfig.kratosUrl,
      })
    );
  }
  return kratosClient;
};

export const getOpenFgaClient = () => {
  if (!openfgaClient) {
    if (!authConfig?.openfgaUrl || !authConfig?.openfgaStoreId) {
      throw new Error('OpenFGA not configured');
    }
    openfgaClient = new OpenFgaApi({
      apiUrl: authConfig.openfgaUrl,
    });
  }
  return { client: openfgaClient, storeId: authConfig.openfgaStoreId };
};

export const configureAuth = (config: IAuthConfig) => {
  authConfig = config;
  return {
    getKratosClient,
    getOpenFgaClient,
    getAuthStrategy: () => authConfig.authStrategy || 'db',
  };
};
