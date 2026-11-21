import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {getParam} from '../../lib/getParam.js';
import {
  mapRowToPublicRecipeDiscoveryItem,
  type PublicRecipeDiscoveryRow,
} from '../../lib/mapRowToRecipeDetail.js';
import {InterestSignalInputSchema, validate} from '../../lib/schemas.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {parseLimit, parseOffset} from '../recipes/listFilterParams.js';

import {
  followUser,
  hideRecipe,
  listDiscoveryFeedRows,
  listFollows,
  listHiddenRecipes,
  listSavedRecipes,
  recordInterestSignal,
  saveRecipe,
  unfollowUser,
  unhideRecipe,
  unsaveRecipe,
} from './discoveryQueries.js';

type QueryFn = typeof defaultQuery;

export const getDiscoveryFeed = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const limit = parseLimit(req.query['limit']);
  const offset = parseOffset(req.query['offset']);
  const result = await listDiscoveryFeedRows(
    req.userId,
    limit,
    offset,
    queryFn,
  );
  res.json(
    result.rows.map(row => {
      const typed = row as PublicRecipeDiscoveryRow & {
        discovery_score: number | string;
        from_followee: number;
        saved_by_followee: number;
      };
      return {
        ...mapRowToPublicRecipeDiscoveryItem(typed),
        discoveryScore: Number(typed.discovery_score),
        fromFollowee: typed.from_followee === 1,
        savedByFollowee: typed.saved_by_followee === 1,
      };
    }),
  );
};

export const listSaved = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  res.json(
    await listSavedRecipes(
      req.userId,
      parseLimit(req.query['limit']),
      parseOffset(req.query['offset']),
      queryFn,
    ),
  );
};

export const putSaved = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const saved = await saveRecipe(
    req.userId,
    getParam(req, 'recipeId'),
    queryFn,
  );
  res.status(201).json(saved);
};

export const deleteSaved = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const removed = await unsaveRecipe(
    req.userId,
    getParam(req, 'recipeId'),
    queryFn,
  );
  if (!removed) {
    res.status(404).json({error: 'Saved recipe not found'});
    return;
  }
  res.status(204).send();
};

export const listHidden = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  res.json(
    await listHiddenRecipes(
      req.userId,
      parseLimit(req.query['limit']),
      parseOffset(req.query['offset']),
      queryFn,
    ),
  );
};

export const putHidden = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const hidden = await hideRecipe(
    req.userId,
    getParam(req, 'recipeId'),
    queryFn,
  );
  res.status(201).json(hidden);
};

export const deleteHidden = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const removed = await unhideRecipe(
    req.userId,
    getParam(req, 'recipeId'),
    queryFn,
  );
  if (!removed) {
    res.status(404).json({error: 'Hidden recipe not found'});
    return;
  }
  res.status(204).send();
};

export const listFollowing = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  res.json(await listFollows(req.userId, queryFn));
};

export const putFollowing = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await followUser(req.userId, getParam(req, 'userId'), queryFn);
  if (result.kind === 'self') {
    res.status(400).json({error: 'You cannot follow your own account'});
    return;
  }
  if (result.kind === 'unknown_user') {
    res.status(404).json({error: 'User not found'});
    return;
  }
  res.status(201).json(result.follow);
};

export const deleteFollowing = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const removed = await unfollowUser(
    req.userId,
    getParam(req, 'userId'),
    queryFn,
  );
  if (!removed) {
    res.status(404).json({error: 'Follow not found'});
    return;
  }
  res.status(204).send();
};

export const postInterestSignal = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(InterestSignalInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const signal = await recordInterestSignal(
    {
      userId: req.userId,
      recipeId: getParam(req, 'recipeId'),
      signal: body.data.signal,
      dwellMs: body.data.dwellMs ?? null,
    },
    queryFn,
  );
  res.status(201).json(signal);
};
