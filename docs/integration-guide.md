# Integration Guide

This guide walks through integrating LineProof into your application.

## HTTP API contract

The backend publishes a machine-readable OpenAPI 3.1 contract at [`docs/api-reference/openapi.yaml`](./api-reference/openapi.yaml). When running the backend locally, use:

- `GET /api/openapi.json` for the bundled JSON document used by clients and test tooling.
- `GET /api/docs` for interactive Swagger UI in non-production environments.
- `pnpm --filter @lineproof/backend openapi:generate` after changing a registered route or schema.

CI runs `openapi:check` and rejects a pull request when the committed path or schema registry no longer matches the backend contract.

## Prerequisites

1. **Stellar Account**: Create or use an existing Stellar keypair
2. **Testnet Setup**: Fund account via Friendbot or use existing mainnet account
3. **SDK Installation**: `pnpm add @lineproof/sdk` or install from source

## Step 1: Initialize Client

```typescript
import { LineProofClient, NetworkPassphrase } from '@lineproof/sdk';

const client = new LineProofClient({
  networkPassphrase: NetworkPassphrase.TESTNET,
  rpcServerUrl: 'https://soroban-testnet.stellar.org',
  privateKey: process.env.STELLAR_PRIVATE_KEY,
});
```

## Step 2: Deploy Queue Factory (or use existing)

```typescript
const factoryId = await client.deployFactory();
console.log('Factory deployed at:', factoryId);
```

## Step 3: Create a Queue

```typescript
import { QueueDeploymentParams, AdvancementRule } from '@lineproof/sdk';

const params: QueueDeploymentParams = {
  slug: 'product-launch-001',
  name: 'Product Launch #001',
  maxPositions: 1000,
  enrollmentOpenAt: Math.floor(Date.now() / 1000),
  enrollmentCloseAt: Math.floor(Date.now() / 1000) + 86400 * 7, // 1 week
  advancementRule: AdvancementRule.FIRST_IN_FIRST_OUT,
  escrowRequired: false,
};

const queueAddress = await factory.createQueue(params);
```

## Step 4: Participant Enrollment

```typescript
const participantClient = new LineProofClient({
  networkPassphrase: NetworkPassphrase.TESTNET,
  rpcServerUrl: 'https://soroban-testnet.stellar.org',
  privateKey: participantPrivateKey,
});

const proof = await participantClient.enroll(queueAddress);
console.log('Enrolled at position:', proof.positionId);
```

## Step 5: Check Queue Position

```typescript
const position = await client.getPosition(proof.positionId);
console.log('Status:', position.status);
console.log('Advanced at:', position.advancedAt);
```

## Step 6: Advance Queue (Admin)

```typescript
const advancedIds = await factory.advance(queueAddress, 100);
console.log('Advanced positions:', advancedIds);
```

## Escrow Integration

If escrow is required:

```typescript
const depositTx = await client.escrow.deposit(queueAddress, amount);

// Release upon advancement (handled automatically)
// or refund on queue cancellation
await client.escrow.refund(queueAddress, identityAddress);
```

## Event Listening

```typescript
const events = await client.getEvents('lineproof.queue', queueAddress);
for (const event of events) {
  console.log(event.kind, event.positionId, event.timestamp);
}
```

## Next Steps

- See [docs/use-cases.md](./use-cases.md) for industry-specific patterns
- Review [docs/security-considerations.md](./security-considerations.md)
- Check [examples/](../examples/) for full application examples
