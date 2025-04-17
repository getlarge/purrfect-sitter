import { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/health', () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
};

export default routes;
