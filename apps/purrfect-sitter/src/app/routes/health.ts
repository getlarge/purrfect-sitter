import { FastifyPluginAsync } from 'fastify';
import { getAuthStrategy } from '@purrfect-sitter/auth-repositories';

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      authStrategy: getAuthStrategy(),
    };
  });
};

export default routes;
