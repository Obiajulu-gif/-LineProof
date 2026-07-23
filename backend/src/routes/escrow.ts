import { Router, type IRouter, Request, Response } from 'express';
import {
  depositEscrow,
  releaseEscrow,
  refundEscrow,
  expireEscrow,
  getEscrow,
} from '../services/escrowService.js';
import { recordEscrowDeposit, recordEscrowClosed } from '../metrics/registry.js';
import { validateStellarAddress } from '../middleware/validateStellarAddress.js';
import { DepositSchema, EscrowActionSchema } from '../schemas/api.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

const router: IRouter = Router();

type DepositInput = typeof DepositSchema._output;
type EscrowActionInput = typeof EscrowActionSchema._output;

router.post(
  '/deposit',
  validateStellarAddress(['identity']),
  (req: Request<{}, {}, DepositInput>, res: Response, next): void => {
    try {
      const parsed = DepositSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request', {
          issues: parsed.error.issues,
        });
      }

      const record = depositEscrow(parsed.data);
      recordEscrowDeposit(record.asset);
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  },
);

function escrowAction(
  action: (escrowId: string) => ReturnType<typeof releaseEscrow>,
) {
  return (
    req: Request<{}, {}, EscrowActionInput>,
    res: Response,
    next: (error?: unknown) => void,
  ): void => {
    try {
      const parsed = EscrowActionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request', {
          issues: parsed.error.issues,
        });
      }

      const updated = action(parsed.data.escrowId);
      if (!updated) throw new NotFoundError('Escrow not found');

      recordEscrowClosed();
      res.json(updated);
    } catch (error) {
      next(error);
    }
  };
}

router.post('/release', escrowAction(releaseEscrow));
router.post('/refund', escrowAction(refundEscrow));
router.post('/expire', escrowAction(expireEscrow));

router.get('/:id', (req: Request<{ id: string }>, res: Response, next): void => {
  try {
    const record = getEscrow(req.params.id);
    if (!record) throw new NotFoundError('Escrow not found');
    res.json(record);
  } catch (error) {
    next(error);
  }
});

export default router;
