import {Router} from 'express';
import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {buildPlanShoppingList} from '../../lib/buildPlanShoppingList.js';
import {getParam} from '../../lib/getParam.js';
import {loadMealPlanDetail} from '../../lib/loadMealPlanDetail.js';
import {listMealPlansForUser} from '../../lib/listMealPlansForUser.js';
import {
  deleteMealPlan,
  replaceMealPlan,
  saveNewMealPlan,
} from '../../lib/saveMealPlan.js';
import {MealPlanInputSchema, validate} from '../../lib/schemas.js';
import {loadEntitlement} from '../../middleware/loadEntitlement.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';
import {requirePlan} from '../../middleware/requirePlan.js';

type QueryFn = typeof defaultQuery;
const a = (req: Parameters<typeof requireAuth>[0]) => req as AuthedRequest;

const listPlans = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  res.json(await listMealPlansForUser(req.userId, queryFn));
};

const createPlan = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(MealPlanInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const result = await saveNewMealPlan(req.userId, body.data, queryFn);
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.status(201).json(result.plan);
};

const getPlan = async (req: AuthedRequest, res: Response, queryFn: QueryFn) => {
  const plan = await loadMealPlanDetail(
    getParam(req, 'id'),
    req.userId,
    queryFn,
  );
  if (!plan) {
    res.status(404).json({error: 'Meal plan not found'});
    return;
  }
  res.json(plan);
};

const putPlan = async (req: AuthedRequest, res: Response, queryFn: QueryFn) => {
  const body = validate(MealPlanInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const result = await replaceMealPlan(
    getParam(req, 'id'),
    req.userId,
    body.data,
    queryFn,
  );
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.json(result.plan);
};

const removePlan = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await deleteMealPlan(getParam(req, 'id'), req.userId, queryFn);
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.status(204).send();
};

const getShoppingList = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await buildPlanShoppingList(
    getParam(req, 'id'),
    req.userId,
    queryFn,
  );
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.json(result.lines);
};

export const createMealPlansRouter = (queryFn: QueryFn) => {
  const router = Router();
  // Meal planning is a Plus feature: gate the whole router. Existing plans
  // are never deleted on downgrade — they just become inaccessible until the
  // user re-upgrades.
  const plus = [requireAuth, loadEntitlement(queryFn), requirePlan('plus')];
  router.get('/', ...plus, (req, res) => listPlans(a(req), res, queryFn));
  router.post('/', ...plus, (req, res) => createPlan(a(req), res, queryFn));
  router.get('/:id', ...plus, (req, res) => getPlan(a(req), res, queryFn));
  router.put('/:id', ...plus, (req, res) => putPlan(a(req), res, queryFn));
  router.delete('/:id', ...plus, (req, res) =>
    removePlan(a(req), res, queryFn),
  );
  router.get('/:id/shopping-list', ...plus, (req, res) =>
    getShoppingList(a(req), res, queryFn),
  );
  return router;
};
