import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApiDocument, serializeOpenApiDocument } from '../openapi.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDir, '../../../docs/api-reference/openapi.yaml');
const checking = process.argv.includes('--check');

function sortedKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).sort();
}

function contractFingerprint(): string {
  return createHash('sha256')
    .update(JSON.stringify(openApiDocument))
    .digest('hex');
}

if (checking) {
  const committed = await readFile(outputPath, 'utf8');
  const parsed = JSON.parse(committed) as {
    paths?: Record<string, unknown>;
    components?: { schemas?: Record<string, unknown> };
    'x-lineproof-contract-fingerprint'?: string;
  };

  const expectedPaths = sortedKeys(openApiDocument.paths);
  const committedPaths = sortedKeys(parsed.paths ?? {});
  const expectedSchemas = sortedKeys(openApiDocument.components.schemas);
  const committedSchemas = sortedKeys(parsed.components?.schemas ?? {});
  const expectedFingerprint = contractFingerprint();

  const drift =
    JSON.stringify(expectedPaths) !== JSON.stringify(committedPaths) ||
    JSON.stringify(expectedSchemas) !== JSON.stringify(committedSchemas) ||
    parsed['x-lineproof-contract-fingerprint'] !== expectedFingerprint;

  if (drift) {
    console.error(
      'OpenAPI drift detected. Run `pnpm --filter @lineproof/backend openapi:generate` and commit docs/api-reference/openapi.yaml.',
    );
    process.exitCode = 1;
  } else {
    console.log('Committed OpenAPI document matches the registered API contract.');
  }
} else {
  const document = {
    ...openApiDocument,
    'x-lineproof-contract-fingerprint': contractFingerprint(),
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  console.log(`Generated ${outputPath}`);
}
