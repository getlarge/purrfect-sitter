import { FastifyPluginAsync } from 'fastify';
import {
  CreateCatSittingSchema,
  UpdateCatSittingSchema,
  UpdateCatSittingStatusSchema,
  getCatSittingParamsSchema,
  getCatSittingsResponseSchema,
  getCatSittingResponseSchema,
  createCatSittingResponseSchema,
  updateCatSittingResponseSchema,
  updateCatSittingStatusResponseSchema,
  deleteCatSittingResponseSchema,
  deleteCatSittingParamsSchema,
  updateCatSittingParamsSchema,
  updateCatSittingStatusParamsSchema,
} from '@purrfect-sitter/models';
import { catSittingsService } from '@purrfect-sitter/cat-sittings-services';

const catSittingsRoutes: FastifyPluginAsync = async (fastify) => {
  const { authenticate, authorize } = fastify;

  // Get all cat sittings (filtered by permission in DB or OpenFGA)
  fastify.get('/', {
    schema: {
      response: {
        200: getCatSittingsResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const sittings = await catSittingsService.findAll();
      // Note: In a real app, you'd filter these based on permissions
      return { data: sittings };
    },
  });

  // Get a cat sitting by ID
  fastify.get('/:id', {
    schema: {
      params: getCatSittingParamsSchema,
      response: {
        200: getCatSittingResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params as { id: string };
        return authorize({
          action: 'view',
          resource: 'cat_sitting',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const sitting = await catSittingsService.findById(id);

      if (!sitting) {
        return reply.status(404).send({ error: 'Cat sitting not found' });
      }

      return { data: sitting };
    },
  });

  // Create a new cat sitting
  fastify.post('/', {
    schema: {
      body: CreateCatSittingSchema,
      response: {
        201: createCatSittingResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const userId = request.user?.id;
      const createSittingDto = request.body;

      try {
        const sitting = await catSittingsService.create(
          userId,
          createSittingDto
        );
        return reply.status(201).send({ data: sitting });
      } catch (error) {
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Update a cat sitting
  fastify.put('/:id', {
    schema: {
      params: updateCatSittingParamsSchema,
      body: UpdateCatSittingSchema,
      response: {
        200: updateCatSittingResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params as { id: string };
        return authorize({
          action: 'update',
          resource: 'cat_sitting',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const updateSittingDto = request.body;

      const updatedSitting = await catSittingsService.update(
        id,
        updateSittingDto
      );

      if (!updatedSitting) {
        return reply.status(404).send({ error: 'Cat sitting not found' });
      }

      return { data: updatedSitting };
    },
  });

  // Update a cat sitting status
  fastify.put('/:id/status', {
    schema: {
      params: updateCatSittingStatusParamsSchema,
      body: UpdateCatSittingStatusSchema,
      response: {
        200: updateCatSittingStatusResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params as { id: string };
        return authorize({
          action: 'update',
          resource: 'cat_sitting',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const updateStatusDto = request.body;

      const updatedSitting = await catSittingsService.updateStatus(
        id,
        updateStatusDto
      );

      if (!updatedSitting) {
        return reply.status(404).send({ error: 'Cat sitting not found' });
      }

      return { data: updatedSitting };
    },
  });

  // Delete a cat sitting
  fastify.delete('/:id', {
    schema: {
      params: deleteCatSittingParamsSchema,
      response: {
        200: deleteCatSittingResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params as { id: string };
        return authorize({
          action: 'update',
          resource: 'cat_sitting',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const deletedSitting = await catSittingsService.remove(id);

      if (!deletedSitting) {
        return reply.status(404).send({ error: 'Cat sitting not found' });
      }

      return { success: true, data: deletedSitting };
    },
  });
};

export default catSittingsRoutes;
