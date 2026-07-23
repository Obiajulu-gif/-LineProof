import { Router, type IRouter, Request, Response } from 'express';
import {
  enrollIdentity,
  cancelEnrollment,
  getEnrollmentsByIdentity,
  getEnrollmentsByQueue,
} from '../services/enrollmentService.js';
import { recordEnrollment } from '../metrics/registry.js';
import { validateStellarAddress } from '../middleware/validateStellarAddress.js';
import { StellarAddress } from '../schemas/stellar.js';
import {
  CancelEnrollmentSchema,
  EnrollSchema,
} from '../schemas/api.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/index.js';

const router: IRouter = Router();

type EnrollInput = typeof EnrollSchema._output;
type CancelInput = typeof CancelEnrollmentSchema._output;

router.post(
  '/enroll',
  validateStellarAddress(['identity']),
  (req: Request<{}, {}, EnrollInput>, res: Response, next): void => {
    try {
      const parsed = EnrollSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request', {
          issues: parsed.error.issues,
        });
      }

      const result = enrollIdentity(parsed.data.queueId, parsed.data.identity);
      if (result.conflict) {
        throw new ConflictError('Duplicate enrollment blocked');
      }

      recordEnrollment(result.queueId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/cancel',
  validateStellarAddress(['identity']),
  (req: Request<{}, {}, CancelInput>, res: Response, next): void => {
    try {
      const parsed = CancelEnrollmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request', {
          issues: parsed.error.issues,
        });
      }

      const ok = cancelEnrollment(parsed.data.queueId, parsed.data.identity);
      if (!ok) throw new NotFoundError('Enrollment not found');

      res.status(200).json({ message: 'Enrollment cancelled' });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/queue/:queueId',
  (req: Request<{ queueId: string }>, res: Response): void => {
    const records = getEnrollmentsByQueue(req.params.queueId);
    res.json(records);
  },
);

router.get(
  '/:identity',
  (req: Request<{ identity: string }>, res: Response, next): void => {
    try {
      const addressResult = StellarAddress.safeParse(req.params.identity);
      if (!addressResult.success) {
        throw new ValidationError('Invalid Stellar address in path');
      }

      const records = getEnrollmentsByIdentity(addressResult.data);
      if (records.length === 0) {
        throw new NotFoundError('No enrollments found');
      }
      res.json(records);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
