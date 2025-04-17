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
  errorResponseSchema,
} from '@purrfect-sitter/models';
import { catsService } from '@purrfect-sitter/cats-services';
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

const catsRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { authenticate, authorize } = fastify;

  fastify.get('/cats', {
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

  fastify.get('/cats/:id', {
    schema: {
      params: getCatParamsSchema,
      response: {
        200: getCatResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const cat = await catsService.findById(id);

      if (!cat) {
        return reply.status(404).send({ error: 'Cat not found' });
      }

      return { data: cat };
    },
  });

  fastify.post('/cats', {
    schema: {
      body: CreateCatSchema,
      response: {
        201: createCatResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const userId = request.user?.id as string;
      const createCatDto = request.body;
      const cat = await catsService.create(userId, createCatDto);
      return reply.status(201).send({ data: cat });
    },
  });

  fastify.put('/cats/:id', {
    schema: {
      params: updateCatParamsSchema,
      body: UpdateCatSchema,
      response: {
        200: updateCatResponseSchema,
        404: errorResponseSchema,
      },

      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params;
        return authorize({
          action: 'manage',
          resource: 'cat',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params;
      const updateCatDto = request.body;
      const updatedCat = await catsService.update(id, updateCatDto);

      if (!updatedCat) {
        return reply.status(404).send({ error: 'Cat not found' });
      }

      return { data: updatedCat };
    },
  });

  fastify.delete('/cats/:id', {
    schema: {
      params: deleteCatParamsSchema,
      response: {
        200: deleteCatResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params;
        return authorize({
          action: 'manage',
          resource: 'cat',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params;
      const deletedCat = await catsService.remove(id);
      if (!deletedCat) {
        return reply.status(404).send({ error: 'Cat not found' });
      }

      return { success: true, data: deletedCat };
    },
  });
};

export default catsRoutes;
