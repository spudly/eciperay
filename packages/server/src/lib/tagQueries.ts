import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

const LIST_TAG_OPTIONS_SQL = `select id, name
  from tags
  where is_preset = true or user_id = $1
  order by is_preset desc, name`;

export type TagOption = {id: string; name: string};

export const listTagOptionsForUser = async (
  userId: string,
  queryFn: QueryFn,
): Promise<TagOption[]> => {
  const result = await queryFn(LIST_TAG_OPTIONS_SQL, [userId]);
  return result.rows as TagOption[];
};
