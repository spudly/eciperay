import type {Request, Response} from 'express';
import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';

type QueryFn = typeof defaultQuery;

const LIST_TAGS_SQL = `select * from tags where is_preset = true or user_id = $1 order by is_preset desc, name`;
const INSERT_TAG_SQL = `insert into tags (user_id, name, color) values ($1,$2,$3) returning *`;
const DELETE_TAG_SQL = `delete from tags where id=$1 and user_id=$2 and is_preset=false`;

const asAuthed = (req: Request) => req as AuthedRequest;

const listTags = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await queryFn(LIST_TAGS_SQL, [req.userId]);
  res.json(result.rows);
};

const createTag = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const {name, color = '#6b7280'} = req.body as {name: string; color?: string};
  const result = await queryFn(INSERT_TAG_SQL, [req.userId, name, color]);
  res.status(201).json(result.rows[0]);
};

const deleteTag = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await queryFn(DELETE_TAG_SQL, [
    getParam(req, 'id'),
    req.userId,
  ]);
  if (result.rowCount === 0) {
    res.status(404).json({error: 'Tag not found'});
    return;
  }
  res.status(204).send();
};

export const createTagsRouter = (queryFn: QueryFn) => {
  const router = Router();
  router.get('/', requireAuth, (req, res) =>
    listTags(asAuthed(req), res, queryFn),
  );
  router.post('/', requireAuth, (req, res) =>
    createTag(asAuthed(req), res, queryFn),
  );
  router.delete('/:id', requireAuth, (req, res) =>
    deleteTag(asAuthed(req), res, queryFn),
  );
  return router;
};
