import { Router, type IRouter, Request, Response } from 'express';
import {
  listQueues,
  getQueueById,
  createQueue,
  advanceQueue,
  closeQueue,
  getQueueStats,
  openEnrollment,
  closeEnrollment,
} from '../services/queueService.js';
import { readQueueOnChain } from '../contracts/index.js';
import { SlugSchema } from '../schemas/slug.js';
import {
  AdvanceQueueSchema,
  CreateQueueSchema,
  GetQueuesQuerySchema,
} from '../schemas/api.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

const router: IRouter = Router();

router.get('/', (req, res: Response): Response => {
  const queryResult = GetQueuesQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({
      message: 'Invalid query parameters',
      issues: queryResult.error.issues,
    });
  }

  const { status, limit, cursor } = queryResult.data;
  const queues = listQueues();

  let filtered = queues;
  if (status) {
    filtered = queues.filter((queue) => queue.status === status);
  }

  const total = filtered.length;
  let startIndex = 0;

  if (cursor) {
    try {
      const lastSlug = Buffer.from(cursor, 'base64').toString('utf8');
      const index = filtered.findIndex((queue) => queue.slug === lastSlug);
      if (index === -1) {
        return res.status(400).json({ message: 'Invalid cursor: slug not found' });
      }
      startIndex = index + 1;
    } catch {
      return res.status(400).json({ message: 'Invalid cursor format' });
    }
  }

  const paginated = filtered.slice(startIndex, startIndex + limit);

  let nextCursor: string | null = null;
  if (paginated.length > 0) {
    const lastItem = paginated[paginated.length - 1];
    const lastIndex = filtered.findIndex((queue) => queue.slug === lastItem.slug);
    if (lastIndex < total - 1) {
      nextCursor = Buffer.from(lastItem.slug).toString('base64');
    }
  }

  return res.json({
    items: paginated,
    nextCursor,
    total,
  });
});

router.get(
  '/:id',
  async (
    req: Request<{ id: string }>,
    res: Response,
    next,
  ): Promise<void> => {
    try {
      const slugResult = SlugSchema.safeParse(req.params.id);
      if (!slugResult.success) {
        throw new ValidationError('Invalid queue ID format');
      }

      const onChain = await readQueueOnChain(slugResult.data);
      if (onChain) {
        res.json({ ...onChain, source: 'on-chain' });
        return;
      }

      const queue = getQueueById(slugResult.data);
      if (!queue) {
        throw new NotFoundError('Queue not found');
      }
      res.json({ ...queue, source: 'in-memory' });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/:id/stats',
  (req: Request<{ id: string }>, res: Response, next): void => {
    try {
      const slugResult = SlugSchema.safeParse(req.params.id);
      if (!slugResult.success) {
        throw new ValidationError('Invalid queue ID format');
      }

      const stats = getQueueStats(slugResult.data);
      if (!stats) throw new NotFoundError('Queue not found');
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },
);

router.post('/', (req, res: Response, next): void => {
  try {
    const parsed = CreateQueueSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request', {
        issues: parsed.error.issues,
      });
    }
    const queue = createQueue(parsed.data);
    res.status(201).json(queue);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/advance',
  (req: Request<{ id: string }>, res: Response, next): void => {
    try {
      const slugResult = SlugSchema.safeParse(req.params.id);
      if (!slugResult.success) {
        throw new ValidationError('Invalid queue ID format');
      }

      const parsed = AdvanceQueueSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request', {
          issues: parsed.error.issues,
        });
      }

      const queue = advanceQueue(slugResult.data, parsed.data.batchSize ?? 10);
      if (!queue) throw new NotFoundError('Queue not found');
      res.json(queue);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/close',
  (req: Request<{ id: string }>, res: Response, next): void => {
    try {
      const slugResult = SlugSchema.safeParse(req.params.id);
      if (!slugResult.success) {
        throw new ValidationError('Invalid queue ID format');
      }

      const queue = closeQueue(slugResult.data);
      if (!queue) throw new NotFoundError('Queue not found');
      res.json(queue);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/open-enrollment',
  (req: Request<{ id: string }>, res: Response, next): void => {
    try {
      const slugResult = SlugSchema.safeParse(req.params.id);
      if (!slugResult.success) {
        throw new ValidationError('Invalid queue ID format');
      }

      const queue = openEnrollment(slugResult.data);
      if (!queue) throw new NotFoundError('Queue not found');
      res.json(queue);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/close-enrollment',
  (req: Request<{ id: string }>, res: Response, next): void => {
    try {
      const slugResult = SlugSchema.safeParse(req.params.id);
      if (!slugResult.success) {
        throw new ValidationError('Invalid queue ID format');
      }

      const queue = closeEnrollment(slugResult.data);
      if (!queue) throw new NotFoundError('Queue not found');
      res.json(queue);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
