import { z } from 'zod';
import { PublicQueueStatsSchema, PublicQueueSummaryListSchema } from './publicQueue.js';
import { QueueStatus } from './queueStatus.js';
import { StellarAddress } from './stellar.js';

export const CreateQueueSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  maxPositions: z.number().int().positive(),
  advancementRule: z
    .enum(['FIFO', 'Priority', 'VerifiableRandomness'])
    .optional(),
  escrowRequired: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export const AdvanceQueueSchema = z.object({
  batchSize: z.number().int().positive().max(1000).optional(),
});

export const GetQueuesQuerySchema = z.object({
  status: z.nativeEnum(QueueStatus).optional(),
  limit: z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    z.number().int().min(1).max(100).default(20),
  ),
  cursor: z.string().optional(),
});

export const EnrollSchema = z.object({
  queueId: z.string().min(1),
  identity: StellarAddress,
});

export const CancelEnrollmentSchema = EnrollSchema;

export const DepositSchema = z.object({
  queueId: z.string().min(1),
  identity: StellarAddress,
  amount: z.number().positive(),
  asset: z.string().min(1),
  holdDays: z.number().int().positive().optional(),
});

export const EscrowActionSchema = z.object({
  escrowId: z
    .string()
    .min(1)
    .regex(/^[^:]+:G[A-Z2-7]{55}$/, {
      message:
        'Invalid escrowId format. Must be ${queueId}:${identity} where identity is a valid Stellar address.',
    }),
});

export const QueueSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  maxPositions: z.number().int().positive(),
  enrolled: z.number().int().nonnegative(),
  advanced: z.number().int().nonnegative(),
  status: z.nativeEnum(QueueStatus),
  advancementRule: z.enum(['FIFO', 'Priority', 'VerifiableRandomness']),
  escrowAsset: z.string(),
  escrowAmount: z.number().nonnegative(),
  createdAt: z.string().datetime(),
});

export const QueueWithSourceSchema = QueueSchema.extend({
  source: z.enum(['on-chain', 'in-memory']),
});

export const QueueStatsSchema = PublicQueueStatsSchema;

export const QueueListResponseSchema = z.object({
  items: z.array(QueueSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});

export const EnrollmentRecordSchema = z.object({
  queueId: z.string(),
  identity: StellarAddress,
  enrolledAt: z.string().datetime(),
  conflict: z.boolean(),
  cancelled: z.boolean(),
});

export const EnrollmentListSchema = z.array(EnrollmentRecordSchema);

export const EscrowRecordSchema = z.object({
  id: z.string(),
  queueId: z.string(),
  identity: StellarAddress,
  amount: z.number().positive(),
  asset: z.string(),
  status: z.enum(['Active', 'Released', 'Refunded', 'Expired']),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  releasedAt: z.string().datetime().optional(),
});

export const MessageSchema = z.object({ message: z.string() });

export const ErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export const HealthSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  environment: z.string(),
});

export { PublicQueueStatsSchema, PublicQueueSummaryListSchema };
