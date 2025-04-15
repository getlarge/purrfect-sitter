import { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { configureAuth } from '@purrfect-sitter/auth';
import sessionPlugin from './session.js';
import authorizationPlugin from './authorization.js';

interface AuthPluginOptions {
  kratosUrl: string;
  openfgaUrl: string;
  openfgaStoreId: string;
  authStrategy: 'db' | 'openfga';
}

// Main auth plugin that configures authentication and authorization
const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
  fastify,
  options
) => {
  // Configure auth services
  configureAuth({
    kratosUrl: options.kratosUrl,
    openfgaUrl: options.openfgaUrl,
    openfgaStoreId: options.openfgaStoreId,
    authStrategy: options.authStrategy,
  });

  // Register session middleware
  await fastify.register(sessionPlugin);

  // Register authorization middleware
  await fastify.register(authorizationPlugin);
};

export default fastifyPlugin(authPlugin, {
  name: 'auth',
  fastify: '4.x',
});
