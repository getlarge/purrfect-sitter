import { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { configureAuth } from '@purrfect-sitter/auth-repositories';

interface AuthPluginOptions {
  kratosUrl: string;
  openfgaUrl: string;
  openfgaStoreId: string;
  authStrategy: 'db' | 'openfga';
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
  fastify,
  options
) => {
  configureAuth({
    kratosUrl: options.kratosUrl,
    openfgaUrl: options.openfgaUrl,
    openfgaStoreId: options.openfgaStoreId,
    authStrategy: options.authStrategy,
  });
};

export default fastifyPlugin(authPlugin, {
  name: 'auth-config',
  fastify: '5.x',
});
