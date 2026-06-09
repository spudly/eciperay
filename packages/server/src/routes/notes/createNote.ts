import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {RecipeNoteInputSchema, validate} from '../../lib/schemas.js';

import {mapRowToRecipeNote} from './listNotes.js';

type QueryFn = typeof defaultQuery;

const INSERT_NOTE_SQL = `
  insert into recipe_notes (recipe_id, user_id, content)
  values ($1, $2, $3)
  returning *
`;

export const createNote = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeNoteInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const result = await queryFn(INSERT_NOTE_SQL, [
    getParam(req, 'id'),
    req.userId,
    body.data.content,
  ]);
  const row = result.rows[0];
  if (!row) {
    res.status(500).json({error: 'Failed to create note'});
    return;
  }
  res
    .status(201)
    .json(mapRowToRecipeNote(row as Parameters<typeof mapRowToRecipeNote>[0]));
};
