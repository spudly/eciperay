import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {getParam} from '../../lib/getParam.js';
import {getShareTokenFromQuery} from '../../lib/getShareTokenFromQuery.js';
import {loadPublicRecipe} from '../../lib/loadPublicRecipe.js';
import type {OptionalAuthedRequest} from '../../middleware/optionalAuth.js';

type QueryFn = typeof defaultQuery;

export const getPublicRecipe = async (
  req: OptionalAuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const id = getParam(req, 'id');
  const requestedSlug =
    req.params['slug'] === undefined ? undefined : getParam(req, 'slug');

  const result = await loadPublicRecipe(
    {
      id,
      requestedSlug,
      shareToken: getShareTokenFromQuery(req),
      userId: req.userId,
    },
    queryFn,
  );

  if (result.kind === 'denied') {
    if (result.denial === 'not_found') {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
    res.status(403).json({error: 'Recipe access denied'});
    return;
  }

  res.json(result.body);
};
