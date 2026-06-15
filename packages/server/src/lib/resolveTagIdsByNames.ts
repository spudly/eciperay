import type {RecipeExportTag} from '@recipoo/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

const LIST_TAGS_SQL = `select id, name, color, is_preset from tags where is_preset = true or user_id = $1`;
const INSERT_TAG_SQL = `insert into tags (user_id, name, color) values ($1, $2, $3) returning id`;

type TagRow = {id: string; name: string; color: string; is_preset: boolean};

const findTagByName = (tags: TagRow[], name: string) =>
  tags.find(tag => tag.name.toLowerCase() === name.toLowerCase());

export const resolveTagIdsByNames = async (
  userId: string,
  exportTags: RecipeExportTag[],
  queryFn: QueryFn,
): Promise<string[]> => {
  const result = await queryFn(LIST_TAGS_SQL, [userId]);
  const available = result.rows as TagRow[];
  const tagIds: string[] = [];

  for (const exportTag of exportTags) {
    const existing = findTagByName(available, exportTag.name);
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    const created = await queryFn(INSERT_TAG_SQL, [
      userId,
      exportTag.name,
      exportTag.color ?? '#6b7280',
    ]);
    const row = created.rows[0] as {id: string} | undefined;
    if (!row) {
      continue;
    }
    available.push({
      id: row.id,
      name: exportTag.name,
      color: exportTag.color ?? '#6b7280',
      is_preset: false,
    });
    tagIds.push(row.id);
  }

  return tagIds;
};
