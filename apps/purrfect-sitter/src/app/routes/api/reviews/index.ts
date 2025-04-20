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
  errorResponseSchema,
} from '@purrfect-sitter/models';
import { ReviewsService } from '@purrfect-sitter/reviews-services';
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

const reviewsRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { authenticate, authorize } = fastify;
  const reviewsService = new ReviewsService();

  fastify.get('/', {
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

  fastify.get('/:id', {
    schema: {
      params: getReviewParamsSchema,
      response: {
        200: getReviewResponseSchema,
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
          resource: 'review',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params;
      const review = await reviewsService.findById(id);

      if (!review) {
        return reply.status(404).send({ error: 'Review not found' });
      }

      return { data: review };
    },
  });

  fastify.post('/', {
    schema: {
      body: CreateReviewSchema,
      response: {
        201: createReviewResponseSchema,
        400: errorResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { catSittingId } = request.body;
        return authorize({
          action: 'review',
          resource: 'cat_sitting',
          resourceId: catSittingId,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const userId = request.user?.id as string;
      const createReviewDto = request.body;

      try {
        const review = await reviewsService.create(userId, createReviewDto);
        return reply.status(201).send({ data: review });
      } catch (error) {
        fastify.log.error(error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        return reply.status(400).send({ error: errorMessage });
      }
    },
  });

  fastify.put('/:id', {
    schema: {
      params: updateReviewParamsSchema,
      body: UpdateReviewSchema,
      response: {
        200: updateReviewResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ cookieAuth: [] }],
    },
    preHandler: [
      authenticate,
      async (request, reply) => {
        const { id } = request.params;
        return authorize({
          action: 'edit',
          resource: 'review',
          resourceId: id,
        })(request, reply);
      },
    ],
    handler: async (request, reply) => {
      const { id } = request.params;
      const updateReviewDto = request.body;

      const updatedReview = await reviewsService.update(id, updateReviewDto);
      if (!updatedReview) {
        return reply.status(404).send({ error: 'Review not found' });
      }

      return { data: updatedReview };
    },
  });

  fastify.delete('/:id', {
    schema: {
      params: deleteReviewParamsSchema,
      response: {
        200: deleteReviewResponseSchema,
        404: errorResponseSchema,
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
      const { id } = request.params;

      const deletedReview = await reviewsService.remove(id);
      if (!deletedReview) {
        return reply.status(404).send({ error: 'Review not found' });
      }

      return { success: true, data: deletedReview };
    },
  });
};

export default reviewsRoutes;
