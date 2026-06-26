import type {RecipeCommentInput} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';

type QueryFn = typeof defaultQuery;

const LIST_RECIPE_COMMENTS_SQL = `
  select c.id, c.recipe_id, c.user_id, u.display_name as author_display_name,
         c.body, c.content_revision, c.created_at, c.updated_at
  from recipe_comments c
  join users u on u.id = c.user_id
  where c.recipe_id = $1
  order by c.created_at asc
`;

const INSERT_RECIPE_COMMENT_SQL = `
  insert into recipe_comments (recipe_id, user_id, body, content_revision)
  values ($1, $2, $3, $4)
  returning id
`;

const GET_RECIPE_COMMENT_SQL = `
  select c.id, c.recipe_id, c.user_id, u.display_name as author_display_name,
         c.body, c.content_revision, c.created_at, c.updated_at
  from recipe_comments c
  join users u on u.id = c.user_id
  where c.id = $1 and c.recipe_id = $2
`;

const UPDATE_RECIPE_COMMENT_SQL = `
  update recipe_comments
  set body = $3
  where id = $1 and recipe_id = $2 and user_id = $4
  returning id
`;

const DELETE_RECIPE_COMMENT_SQL = `
  delete from recipe_comments
  where id = $1 and recipe_id = $2 and user_id = $3
  returning id
`;

const DELETE_RECIPE_COMMENT_BY_OWNER_SQL = `
  delete from recipe_comments
  where id = $1 and recipe_id = $2
  returning id
`;

export const listRecipeComments = (recipeId: string, queryFn: QueryFn) =>
  queryFn(LIST_RECIPE_COMMENTS_SQL, [recipeId]);

export const insertRecipeComment = (
  opts: {
    recipeId: string;
    userId: string;
    body: RecipeCommentInput['body'];
    contentRevision: number | null;
  },
  queryFn: QueryFn,
) =>
  queryFn(INSERT_RECIPE_COMMENT_SQL, [
    opts.recipeId,
    opts.userId,
    opts.body,
    opts.contentRevision,
  ]);

export const getRecipeComment = (
  commentId: string,
  recipeId: string,
  queryFn: QueryFn,
) => queryFn(GET_RECIPE_COMMENT_SQL, [commentId, recipeId]);

export const updateRecipeComment = (
  opts: {
    commentId: string;
    recipeId: string;
    userId: string;
    body: RecipeCommentInput['body'];
  },
  queryFn: QueryFn,
) =>
  queryFn(UPDATE_RECIPE_COMMENT_SQL, [
    opts.commentId,
    opts.recipeId,
    opts.body,
    opts.userId,
  ]);

export const deleteRecipeCommentByAuthor = (
  opts: {commentId: string; recipeId: string; userId: string},
  queryFn: QueryFn,
) =>
  queryFn(DELETE_RECIPE_COMMENT_SQL, [
    opts.commentId,
    opts.recipeId,
    opts.userId,
  ]);

export const deleteRecipeCommentByOwner = (
  commentId: string,
  recipeId: string,
  queryFn: QueryFn,
) => queryFn(DELETE_RECIPE_COMMENT_BY_OWNER_SQL, [commentId, recipeId]);
