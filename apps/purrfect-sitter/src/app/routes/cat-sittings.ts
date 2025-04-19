import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
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
  errorResponseSchema,
  updateCatSittingParamsSchema,
} from '@purrfect-sitter/models';

import { CatSittingsService } from '@purrfect-sitter/cat-sittings-services';

const params = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

const catSittingsRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { authenticate, authorize } = fastify;
  const catSittingsService = new CatSittingsService();

  fastify.get('/cat-sittings', {
    schema: {
      response: {
        200: getCatSittingsResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [authenticate],
    handler: async (_request, _reply) => {
      const sittings = await catSittingsService.findAll();
      return { data: sittings };
    },
  });

  fastify.get(
    '/cat-sittings/:id',
    {
      schema: {
        params: getCatSittingParamsSchema,
        response: {
          200: getCatSittingResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ cookieAuth: [] }],
      },
      preHandler: [
        authenticate,
        async (request, reply) => {
          const { id } = request.params;
          return authorize({
            action: 'view',
            resource: 'cat_sitting',
            resourceId: id,
          })(request, reply);
        },
      ],
    },
    async (request, reply) => {
      const { id } = request.params;
      const sitting = await catSittingsService.findById(id);
      if (!sitting) {
        return reply.status(404).send({ error: 'Cat sitting not found' });
      }

      return { data: sitting };
    }
  );

  fastify.post(
    '/cat-sittings',
    {
      schema: {
        body: CreateCatSittingSchema,
        response: {
          201: createCatSittingResponseSchema,
          400: errorResponseSchema,
        },
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const userId = request.user?.id as string;
      const createSittingDto = request.body;

      try {
        const sitting = await catSittingsService.create(
          userId,
          createSittingDto
        );
        return reply.status(201).send({ data: sitting });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return reply.status(400).send({ error: errorMessage });
      }
    }
  );

  fastify.put(
    '/cat-sittings/:id',
    {
      schema: {
        params: updateCatSittingParamsSchema,
        body: UpdateCatSittingSchema,
        response: {
          200: updateCatSittingResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ cookieAuth: [] }],
      },
      preHandler: [
        authenticate,
        async (request, reply) => {
          const { id } = request.params;
          return authorize({
            action: 'update',
            resource: 'cat_sitting',
            resourceId: id,
          })(request, reply);
        },
      ],
    },
    async (request, reply) => {
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
    }
  );

  fastify.put(
    '/cat-sittings/:id/status',
    {
      schema: {
        params: params,
        body: UpdateCatSittingStatusSchema,
        response: {
          200: updateCatSittingStatusResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ cookieAuth: [] }],
      },
      preHandler: [
        authenticate,
        async (request, reply) => {
          const { id } = request.params;
          return authorize({
            action: 'update',
            resource: 'cat_sitting',
            resourceId: id,
          })(request, reply);
        },
      ],
    },
    async (request, reply) => {
      const { id } = request.params;
      const updateStatusDto = request.body;
      const updatedSitting = await catSittingsService.updateStatus(
        id,
        updateStatusDto
      );

      if (!updatedSitting) {
        return reply.status(404).send({ error: 'Cat sitting not found' });
      }

      return { data: updatedSitting };
    }
  );

  fastify.delete(
    '/cat-sittings/:id',
    {
      schema: {
        params: params,
        response: {
          200: deleteCatSittingResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ cookieAuth: [] }],
      },
      preHandler: [
        authenticate,
        async (request, reply) => {
          const { id } = request.params;
          return authorize({
            action: 'update',
            resource: 'cat_sitting',
            resourceId: id,
          })(request, reply);
        },
      ],
    },
    async (request, reply) => {
      const { id } = request.params;
      const deletedSitting = await catSittingsService.remove(id);
      if (!deletedSitting) {
        return reply.status(404).send({ error: 'Cat sitting not found' });
      }

      return { success: true, data: deletedSitting };
    }
  );
};

export default catSittingsRoutes;
