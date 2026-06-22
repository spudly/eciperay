import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {deleteAuthUser} from '../../lib/deleteAuthUser.js';

type QueryFn = typeof defaultQuery;

const DELETE_USER_SQL = `delete from users where id = $1`;

export const deleteAccount = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await queryFn(DELETE_USER_SQL, [req.userId]);
  if (result.rowCount === 0) {
    res.status(404).json({error: 'User not found'});
    return;
  }

  try {
    await deleteAuthUser(req.supabaseUid);
  } catch (error) {
    res
      .status(502)
      .json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete authentication account',
      });
    return;
  }

  res.status(204).send();
};
