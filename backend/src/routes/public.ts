/**
 * Public read-only routes — no auth required.
 * These endpoints are safe to expose without authentication.
 */
import { Router, type IRouter } from 'express';
import { listQueues, getQueueStats } from '../services/queueService.js';
import { NotFoundError } from '../errors/index.js';
import {
  PublicQueueSummaryListSchema,
  PublicQueueStatsSchema,
} from '../schemas/publicQueue.js';

const router: IRouter = Router();

/** GET /public/queues — list all queues (summary, no internal fields). */
router.get('/queues', (_req, res) => {
  const rawSummary = listQueues().map(
    ({ id, name, slug, status, enrolled, maxPositions, advancementRule }) => ({
      id,
      name,
      slug,
      status,
      enrolled,
      maxPositions,
      advancementRule,
      advancementRuleImplemented: advancementRule.toUpperCase() === 'FIFO',
    }),
  );
  res.json(PublicQueueSummaryListSchema.parse(rawSummary));
});

/** GET /public/queues/:id/stats — public queue statistics. */
router.get('/queues/:id/stats', (req, res, next) => {
  try {
    const stats = getQueueStats(req.params.id);
    if (!stats) throw new NotFoundError('Queue not found');
    res.json(PublicQueueStatsSchema.parse(stats));
  } catch (error) {
    next(error);
  }
});

/** GET /public/health — permanent redirect to the canonical health endpoint. */
router.get('/health', (_req, res) => {
  res.redirect(301, '/health');
});

export default router;
