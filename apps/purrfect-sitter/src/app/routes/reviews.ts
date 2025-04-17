import {
  CreateReviewSchema,
  UpdateReviewSchema,
  getReviewParamsSchema,
  getReviewsResponseSchema,
  getReviewResponseSchema,
  createReviewResponseSchema,
  updateReviewResponseSchema,
  deleteReviewResponseSchema,
  deleteReviewParamsSchema,
  updateReviewParamsSchema,
} from '@purrfect-sitter/models';
import { reviewsService } from '@purrfect-sitter/reviews-services';
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

const reviewsRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { authenticate, authorize } = fastify;

  // Get all reviews (publicly accessible)
  fastify.get('/reviews', {
    schema: {
      response: {
        200: getReviewsResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const reviews = await reviewsService.findAll();
      return { data: reviews };
    },
  });

  // Get a review by ID
  fastify.get('/reviews/:id', {
    schema: {
      params: getReviewParamsSchema,
      response: {
        200: getReviewResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params as { id: string };
        return authorize({
          action: 'view',
          resource: 'review',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const review = await reviewsService.findById(id);

      if (!review) {
        return reply.status(404).send({ error: 'Review not found' });
      }

      return { data: review };
    },
  });

  // Create a new review
  fastify.post('/reviews', {
    schema: {
      body: CreateReviewSchema,
      response: {
        201: createReviewResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { catSittingId } = request.body as { catSittingId: string };
        return authorize({
          action: 'review',
          resource: 'cat_sitting',
          resourceId: catSittingId,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const userId = request.user?.id;
      const createReviewDto = request.body;

      try {
        const review = await reviewsService.create(userId, createReviewDto);
        return reply.status(201).send({ data: review });
      } catch (error) {
        return reply.status(400).send({ error: error.message });
      }
    },
  });

  // Update a review
  fastify.put('/reviews/:id', {
    schema: {
      params: updateReviewParamsSchema,
      body: UpdateReviewSchema,
      response: {
        200: updateReviewResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params as { id: string };
        return authorize({
          action: 'edit',
          resource: 'review',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const updateReviewDto = request.body;

      const updatedReview = await reviewsService.update(id, updateReviewDto);

      if (!updatedReview) {
        return reply.status(404).send({ error: 'Review not found' });
      }

      return { data: updatedReview };
    },
  });

  // Delete a review (admin only)
  fastify.delete('/reviews/:id', {
    schema: {
      params: deleteReviewParamsSchema,
      response: {
        200: deleteReviewResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        return authorize({
          action: 'admin',
          resource: 'system',
          resourceId: '1', // System resource ID (arbitrary)
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const deletedReview = await reviewsService.remove(id);

      if (!deletedReview) {
        return reply.status(404).send({ error: 'Review not found' });
      }

      return { success: true, data: deletedReview };
    },
  });
};

export default reviewsRoutes;
