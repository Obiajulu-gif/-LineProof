import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { openApiDocument, registeredApiSchemas } from '../openapi.js';

describe('OpenAPI contract', () => {
  it('serves a valid OpenAPI 3.1 document for every registered route group', async () => {
    const response = await request(createApp()).get('/api/openapi.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.1.0');
    expect(Object.keys(response.body.paths)).toHaveLength(22);
    expect(response.body.paths['/api/queues']).toHaveProperty('get');
    expect(response.body.paths['/api/queues']).toHaveProperty('post');
    expect(response.body.paths['/api/enrollments/enroll']).toHaveProperty('post');
    expect(response.body.paths['/api/escrow/deposit']).toHaveProperty('post');
  });

  it('has a documented component for every authoritative Zod schema', () => {
    const componentNames = Object.keys(openApiDocument.components.schemas);

    for (const schemaName of Object.keys(registeredApiSchemas)) {
      expect(componentNames).toContain(schemaName);
    }
  });

  it('serves Swagger UI outside production', async () => {
    const response = await request(createApp()).get('/api/docs');

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/html/);
    expect(response.text).toContain('SwaggerUIBundle');
    expect(response.text).toContain('/api/openapi.json');
  });
});
