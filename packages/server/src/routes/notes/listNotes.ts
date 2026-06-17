import type {Response} from 'express';
import type {RecipeNote} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';

type QueryFn = typeof defaultQuery;

type NoteRow = {
  id: string;
  recipe_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export const mapRowToRecipeNote = (row: NoteRow): RecipeNote => ({
  id: row.id,
  recipeId: row.recipe_id,
  userId: row.user_id,
  content: row.content,
  createdAt: row.created_at,
});

const LIST_NOTES_SQL = `
  select * from recipe_notes
  where recipe_id = $1 and user_id = $2
  order by created_at asc
`;

export const listNotes = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await queryFn(LIST_NOTES_SQL, [
    getParam(req, 'id'),
    req.userId,
  ]);
  res.json(result.rows.map(row => mapRowToRecipeNote(row as NoteRow)));
};
