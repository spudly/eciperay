import type {NextFunction, Request, Response} from 'express';
import type {PlanName} from '@eciperay/types';

import {planAtOrAbove} from '../lib/plans.js';

import type {EntitledRequest} from './loadEntitlement.js';

/**
 * 403s unless the request's plan is at or above `minimum`.
 * Requires loadEntitlement to have run first (programmer error otherwise).
 *
 * Usage: router.post('/', requireAuth, loadEntitlement(queryFn),
 *                     requirePlan('plus'), handler)
 */
export const requirePlan =
  (minimum: PlanName) =>
  (req: Request, res: Response, next: NextFunction) => {
    const entitled = req as Partial<EntitledRequest>;
    if (!entitled.entitlement) {
      next(
        new Error('requirePlan: loadEntitlement must run before requirePlan'),
      );
      return;
    }
    if (!planAtOrAbove(entitled.entitlement.plan, minimum)) {
      res.status(403).json({
        error: 'plan_required',
        requiredPlan: minimum,
        plan: entitled.entitlement.plan,
      });
      return;
    }
    next();
  };
