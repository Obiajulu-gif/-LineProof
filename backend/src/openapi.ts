import type { z } from 'zod';
import {
  AdvanceQueueSchema,
  CancelEnrollmentSchema,
  CreateQueueSchema,
  DepositSchema,
  EnrollSchema,
  EnrollmentListSchema,
  EnrollmentRecordSchema,
  ErrorSchema,
  EscrowActionSchema,
  EscrowRecordSchema,
  GetQueuesQuerySchema,
  HealthSchema,
  MessageSchema,
  PublicQueueStatsSchema,
  PublicQueueSummaryListSchema,
  QueueListResponseSchema,
  QueueSchema,
  QueueStatsSchema,
  QueueWithSourceSchema,
} from './schemas/api.js';

export type OpenApiSchema = Record<string, unknown>;

/**
 * Runtime Zod schemas registered against their OpenAPI component names.
 * Route handlers import these same schema instances, keeping validation and the
 * documented contract in one registry without relying on route-source parsing.
 */
export const registeredApiSchemas: Record<string, z.ZodTypeAny> = {
  CreateQueue: CreateQueueSchema,
  AdvanceQueue: AdvanceQueueSchema,
  QueueQuery: GetQueuesQuerySchema,
  Enroll: EnrollSchema,
  CancelEnrollment: CancelEnrollmentSchema,
  Deposit: DepositSchema,
  EscrowAction: EscrowActionSchema,
  Queue: QueueSchema,
  QueueWithSource: QueueWithSourceSchema,
  QueueStats: QueueStatsSchema,
  QueueListResponse: QueueListResponseSchema,
  EnrollmentRecord: EnrollmentRecordSchema,
  EnrollmentList: EnrollmentListSchema,
  EscrowRecord: EscrowRecordSchema,
  Message: MessageSchema,
  Error: ErrorSchema,
  Health: HealthSchema,
  PublicQueueSummaryList: PublicQueueSummaryListSchema,
  PublicQueueStats: PublicQueueStatsSchema,
};

const stellarAddress = {
  type: 'string',
  pattern: '^G[A-Z2-7]{55}$',
  example: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
};
const dateTime = { type: 'string', format: 'date-time' };
const queueStatus = {
  type: 'string',
  enum: [
    'Draft',
    'EnrollmentOpen',
    'EnrollmentClosed',
    'AdvancementActive',
    'Closed',
  ],
};
const advancementRule = {
  type: 'string',
  enum: ['FIFO', 'Priority', 'VerifiableRandomness'],
};

const components: Record<string, OpenApiSchema> = {
  CreateQueue: {
    type: 'object',
    required: ['name', 'slug', 'maxPositions'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 120 },
      slug: { type: 'string', minLength: 1, maxLength: 120 },
      maxPositions: { type: 'integer', minimum: 1 },
      advancementRule,
      escrowRequired: { type: 'boolean' },
      description: { type: 'string', maxLength: 500 },
    },
  },
  AdvanceQueue: {
    type: 'object',
    properties: { batchSize: { type: 'integer', minimum: 1, maximum: 1000 } },
  },
  QueueQuery: {
    type: 'object',
    properties: {
      status: queueStatus,
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      cursor: { type: 'string' },
    },
  },
  Enroll: {
    type: 'object',
    required: ['queueId', 'identity'],
    properties: { queueId: { type: 'string', minLength: 1 }, identity: stellarAddress },
  },
  CancelEnrollment: {
    type: 'object',
    required: ['queueId', 'identity'],
    properties: { queueId: { type: 'string', minLength: 1 }, identity: stellarAddress },
  },
  Deposit: {
    type: 'object',
    required: ['queueId', 'identity', 'amount', 'asset'],
    properties: {
      queueId: { type: 'string', minLength: 1 },
      identity: stellarAddress,
      amount: { type: 'number', exclusiveMinimum: 0 },
      asset: { type: 'string', minLength: 1 },
      holdDays: { type: 'integer', minimum: 1 },
    },
  },
  EscrowAction: {
    type: 'object',
    required: ['escrowId'],
    properties: {
      escrowId: { type: 'string', pattern: '^[^:]+:G[A-Z2-7]{55}$' },
    },
  },
  Queue: {
    type: 'object',
    required: [
      'id',
      'name',
      'slug',
      'description',
      'maxPositions',
      'enrolled',
      'advanced',
      'status',
      'advancementRule',
      'escrowAsset',
      'escrowAmount',
      'createdAt',
    ],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string' },
      maxPositions: { type: 'integer', minimum: 1 },
      enrolled: { type: 'integer', minimum: 0 },
      advanced: { type: 'integer', minimum: 0 },
      status: queueStatus,
      advancementRule,
      escrowAsset: { type: 'string' },
      escrowAmount: { type: 'number', minimum: 0 },
      createdAt: dateTime,
    },
  },
  QueueWithSource: {
    allOf: [
      { $ref: '#/components/schemas/Queue' },
      {
        type: 'object',
        required: ['source'],
        properties: { source: { type: 'string', enum: ['on-chain', 'in-memory'] } },
      },
    ],
  },
  QueueStats: {
    type: 'object',
    required: ['queueId', 'total', 'advanced', 'remaining', 'percentAdvanced'],
    properties: {
      queueId: { type: 'string' },
      total: { type: 'integer', minimum: 0 },
      advanced: { type: 'integer', minimum: 0 },
      remaining: { type: 'integer', minimum: 0 },
      percentAdvanced: { type: 'number', minimum: 0, maximum: 100 },
    },
  },
  QueueListResponse: {
    type: 'object',
    required: ['items', 'nextCursor', 'total'],
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/Queue' } },
      nextCursor: { type: ['string', 'null'] },
      total: { type: 'integer', minimum: 0 },
    },
  },
  EnrollmentRecord: {
    type: 'object',
    required: ['queueId', 'identity', 'enrolledAt', 'conflict', 'cancelled'],
    properties: {
      queueId: { type: 'string' },
      identity: stellarAddress,
      enrolledAt: dateTime,
      conflict: { type: 'boolean' },
      cancelled: { type: 'boolean' },
    },
  },
  EnrollmentList: {
    type: 'array',
    items: { $ref: '#/components/schemas/EnrollmentRecord' },
  },
  EscrowRecord: {
    type: 'object',
    required: ['id', 'queueId', 'identity', 'amount', 'asset', 'status', 'createdAt', 'expiresAt'],
    properties: {
      id: { type: 'string' },
      queueId: { type: 'string' },
      identity: stellarAddress,
      amount: { type: 'number', exclusiveMinimum: 0 },
      asset: { type: 'string' },
      status: { type: 'string', enum: ['Active', 'Released', 'Refunded', 'Expired'] },
      createdAt: dateTime,
      expiresAt: dateTime,
      releasedAt: dateTime,
    },
  },
  Message: {
    type: 'object',
    required: ['message'],
    properties: { message: { type: 'string' } },
  },
  Error: {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string' },
      code: { type: 'string' },
      details: {},
    },
  },
  Health: {
    type: 'object',
    required: ['status', 'timestamp', 'environment'],
    properties: {
      status: { type: 'string', const: 'ok' },
      timestamp: dateTime,
      environment: { type: 'string' },
    },
  },
  PublicQueueSummaryList: {
    type: 'array',
    items: {
      type: 'object',
      required: ['id', 'name', 'slug', 'status', 'enrolled', 'maxPositions', 'advancementRule', 'advancementRuleImplemented'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        status: queueStatus,
        enrolled: { type: 'integer', minimum: 0 },
        maxPositions: { type: 'integer', minimum: 1 },
        advancementRule: { type: 'string' },
        advancementRuleImplemented: { type: 'boolean' },
      },
    },
  },
  PublicQueueStats: { $ref: '#/components/schemas/QueueStats' },
};

for (const componentName of Object.keys(registeredApiSchemas)) {
  if (!components[componentName]) {
    throw new Error(`OpenAPI component missing for registered Zod schema: ${componentName}`);
  }
}

const schemaRef = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonResponse = (name: string, description = 'Successful response') => ({
  description,
  content: { 'application/json': { schema: schemaRef(name) } },
});
const jsonBody = (name: string) => ({
  required: true,
  content: { 'application/json': { schema: schemaRef(name) } },
});
const errors = {
  '400': jsonResponse('Error', 'Invalid request'),
  '404': jsonResponse('Error', 'Resource not found'),
  '409': jsonResponse('Error', 'State conflict'),
  '429': jsonResponse('Error', 'Rate limit exceeded'),
  '500': jsonResponse('Error', 'Unexpected server error'),
};
const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'LineProof Backend API',
    version: '0.1.0',
    description:
      'Machine-readable contract for queue, enrollment, escrow, and public LineProof endpoints.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
  tags: [
    { name: 'System' },
    { name: 'Queues' },
    { name: 'Enrollments' },
    { name: 'Escrow' },
    { name: 'Public' },
  ],
  paths: {
    '/health': {
      get: { tags: ['System'], summary: 'Backend health', responses: { '200': jsonResponse('Health') } },
    },
    '/api/openapi.json': {
      get: { tags: ['System'], summary: 'OpenAPI 3.1 document', responses: { '200': { description: 'OpenAPI document', content: { 'application/json': { schema: { type: 'object' } } } } } },
    },
    '/api/docs': {
      get: { tags: ['System'], summary: 'Swagger UI (non-production only)', responses: { '200': { description: 'Interactive HTML documentation', content: { 'text/html': { schema: { type: 'string' } } } }, '404': jsonResponse('Error', 'Disabled in production') } },
    },
    '/api/queues': {
      get: {
        tags: ['Queues'],
        summary: 'List queues',
        parameters: [
          { name: 'status', in: 'query', schema: queueStatus },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': jsonResponse('QueueListResponse'), ...errors },
      },
      post: { tags: ['Queues'], summary: 'Create a queue', requestBody: jsonBody('CreateQueue'), responses: { '201': jsonResponse('Queue', 'Queue created'), ...errors } },
    },
    '/api/queues/{id}': {
      get: { tags: ['Queues'], summary: 'Get a queue', parameters: [idParameter], responses: { '200': jsonResponse('QueueWithSource'), ...errors } },
    },
    '/api/queues/{id}/stats': {
      get: { tags: ['Queues'], summary: 'Get queue statistics', parameters: [idParameter], responses: { '200': jsonResponse('QueueStats'), ...errors } },
    },
    '/api/queues/{id}/advance': {
      post: { tags: ['Queues'], summary: 'Advance queue positions', parameters: [idParameter], requestBody: jsonBody('AdvanceQueue'), responses: { '200': jsonResponse('Queue'), ...errors } },
    },
    '/api/queues/{id}/close': {
      post: { tags: ['Queues'], summary: 'Close a queue', parameters: [idParameter], responses: { '200': jsonResponse('Queue'), ...errors } },
    },
    '/api/queues/{id}/open-enrollment': {
      post: { tags: ['Queues'], summary: 'Open queue enrollment', parameters: [idParameter], responses: { '200': jsonResponse('Queue'), ...errors } },
    },
    '/api/queues/{id}/close-enrollment': {
      post: { tags: ['Queues'], summary: 'Close queue enrollment', parameters: [idParameter], responses: { '200': jsonResponse('Queue'), ...errors } },
    },
    '/api/enrollments/enroll': {
      post: { tags: ['Enrollments'], summary: 'Enroll an identity', requestBody: jsonBody('Enroll'), responses: { '201': jsonResponse('EnrollmentRecord', 'Enrollment created'), ...errors } },
    },
    '/api/enrollments/cancel': {
      post: { tags: ['Enrollments'], summary: 'Cancel an enrollment', requestBody: jsonBody('CancelEnrollment'), responses: { '200': jsonResponse('Message'), ...errors } },
    },
    '/api/enrollments/queue/{queueId}': {
      get: { tags: ['Enrollments'], summary: 'List queue enrollments', parameters: [{ name: 'queueId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': jsonResponse('EnrollmentList'), ...errors } },
    },
    '/api/enrollments/{identity}': {
      get: { tags: ['Enrollments'], summary: 'List identity enrollments', parameters: [{ name: 'identity', in: 'path', required: true, schema: stellarAddress }], responses: { '200': jsonResponse('EnrollmentList'), ...errors } },
    },
    '/api/escrow/deposit': {
      post: { tags: ['Escrow'], summary: 'Deposit escrow', requestBody: jsonBody('Deposit'), responses: { '201': jsonResponse('EscrowRecord', 'Escrow created'), ...errors } },
    },
    '/api/escrow/release': {
      post: { tags: ['Escrow'], summary: 'Release escrow', requestBody: jsonBody('EscrowAction'), responses: { '200': jsonResponse('EscrowRecord'), ...errors } },
    },
    '/api/escrow/refund': {
      post: { tags: ['Escrow'], summary: 'Refund escrow', requestBody: jsonBody('EscrowAction'), responses: { '200': jsonResponse('EscrowRecord'), ...errors } },
    },
    '/api/escrow/expire': {
      post: { tags: ['Escrow'], summary: 'Expire escrow', requestBody: jsonBody('EscrowAction'), responses: { '200': jsonResponse('EscrowRecord'), '422': jsonResponse('Error', 'Escrow has not expired'), ...errors } },
    },
    '/api/escrow/{id}': {
      get: { tags: ['Escrow'], summary: 'Get an escrow record', parameters: [idParameter], responses: { '200': jsonResponse('EscrowRecord'), ...errors } },
    },
    '/public/queues': {
      get: { tags: ['Public'], summary: 'List public queue summaries', responses: { '200': jsonResponse('PublicQueueSummaryList'), ...errors } },
    },
    '/public/queues/{id}/stats': {
      get: { tags: ['Public'], summary: 'Get public queue statistics', parameters: [idParameter], responses: { '200': jsonResponse('PublicQueueStats'), ...errors } },
    },
    '/public/health': {
      get: { tags: ['Public'], summary: 'Redirect to canonical health endpoint', responses: { '301': { description: 'Redirects to /health', headers: { Location: { schema: { type: 'string', const: '/health' } } } } } },
    },
  },
  components: { schemas: components },
} as const;

export function serializeOpenApiDocument(): string {
  return `${JSON.stringify(openApiDocument, null, 2)}\n`;
}

export function renderSwaggerUi(specUrl = '/api/openapi.json'): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LineProof API documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({ url: ${JSON.stringify(specUrl)}, dom_id: '#swagger-ui', deepLinking: true });</script>
</body>
</html>`;
}
