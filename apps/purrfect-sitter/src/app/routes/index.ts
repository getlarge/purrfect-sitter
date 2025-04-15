import { FastifyPluginAsync } from 'fastify';
import catsRoutes from './cats/index.js';
import catSittingsRoutes from './cat-sittings/index.js';
import reviewsRoutes from './reviews/index.js';

const routes: FastifyPluginAsync = async (fastify) => {
  // Register API routes
  fastify.register(catsRoutes, { prefix: '/api/cats' });
  fastify.register(catSittingsRoutes, { prefix: '/api/cat-sittings' });
  fastify.register(reviewsRoutes, { prefix: '/api/reviews' });

  // Add health check route
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
};

export default routes;
