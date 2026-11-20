import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  createFamilyShareGrant,
  deleteFamilyShareGrant,
  listFamilyShareGrants,
} from '../../lib/familySharing.js';
import {getParam} from '../../lib/getParam.js';
import {FamilySharingCreateSchema, validate} from '../../lib/schemas.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';

type QueryFn = typeof defaultQuery;

export const getFamilySharing = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  res.json(await listFamilyShareGrants(req.userId, queryFn));
};

export const postFamilySharing = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(FamilySharingCreateSchema, req, res);
  if (!body.ok) {
    return;
  }
  const result = await createFamilyShareGrant(
    req.userId,
    body.data.email,
    queryFn,
  );
  if (result.kind === 'unknown_email') {
    res
      .status(404)
      .json({error: 'No account found for that email address'});
    return;
  }
  if (result.kind === 'self') {
    res
      .status(400)
      .json({error: 'You cannot designate your own account for family sharing'});
    return;
  }
  res.status(201).json(result.grant);
};

export const deleteFamilySharing = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const removed = await deleteFamilyShareGrant(
    req.userId,
    getParam(req, 'recipientUserId'),
    queryFn,
  );
  if (!removed) {
    res.status(404).json({error: 'Family sharing designation not found'});
    return;
  }
  res.status(204).send();
};
