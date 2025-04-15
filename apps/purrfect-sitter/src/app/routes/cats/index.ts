import { FastifyPluginAsync } from 'fastify';
import {
  CreateCatSchema,
  UpdateCatSchema,
  getCatParamsSchema,
  getCatsResponseSchema,
  getCatResponseSchema,
  createCatResponseSchema,
  updateCatResponseSchema,
  deleteCatResponseSchema,
  deleteCatParamsSchema,
  updateCatParamsSchema,
} from '@purrfect-sitter/models';
import { catsService } from '@purrfect-sitter/cats-services';

const catsRoutes: FastifyPluginAsync = async (fastify) => {
  const { authenticate, authorize } = fastify;

  // Get all cats
  fastify.get('/', {
    schema: {
      response: {
        200: getCatsResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    handler: async (request, reply) => {
      const cats = await catsService.findAll();
      return { data: cats };
    },
  });

  // Get a cat by ID
  fastify.get('/:id', {
    schema: {
      params: getCatParamsSchema,
      response: {
        200: getCatResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const cat = await catsService.findById(id);

      if (!cat) {
        return reply.status(404).send({ error: 'Cat not found' });
      }

      return { data: cat };
    },
  });

  // Create a new cat
  fastify.post('/', {
    schema: {
      body: CreateCatSchema,
      response: {
        201: createCatResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const userId = request.user?.id;
      const createCatDto = request.body;
      const cat = await catsService.create(userId, createCatDto);
      return reply.status(201).send({ data: cat });
    },
  });

  // Update a cat
  fastify.put('/:id', {
    schema: {
      params: updateCatParamsSchema,
      body: UpdateCatSchema,
      response: {
        200: updateCatResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params as { id: string };
        return authorize({
          action: 'manage',
          resource: 'cat',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const updateCatDto = request.body;

      const updatedCat = await catsService.update(id, updateCatDto);

      if (!updatedCat) {
        return reply.status(404).send({ error: 'Cat not found' });
      }

      return { data: updatedCat };
    },
  });

  // Delete a cat
  fastify.delete('/:id', {
    schema: {
      params: deleteCatParamsSchema,
      response: {
        200: deleteCatResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params as { id: string };
        return authorize({
          action: 'manage',
          resource: 'cat',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const deletedCat = await catsService.remove(id);

      if (!deletedCat) {
        return reply.status(404).send({ error: 'Cat not found' });
      }

      return { success: true, data: deletedCat };
    },
  });
};

export default catsRoutes;
