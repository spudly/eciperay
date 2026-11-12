import type {AuthorDisplaySettings} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

const AUTHOR_DISPLAY_SELECT_SQL = `
  select display_name, show_author_on_public_recipes
  from users
  where id = $1
`;

const AUTHOR_DISPLAY_UPDATE_SQL = `
  update users
  set display_name = $2,
      show_author_on_public_recipes = $3
  where id = $1
  returning display_name, show_author_on_public_recipes
`;

type AuthorDisplayRow = {
  display_name: string | null;
  show_author_on_public_recipes: boolean;
};

export const mapRowToAuthorDisplaySettings = (
  row: AuthorDisplayRow,
): AuthorDisplaySettings => ({
  displayName: row.display_name,
  showOnPublicRecipes: row.show_author_on_public_recipes,
});

export const emptyAuthorDisplaySettings = (): AuthorDisplaySettings => ({
  displayName: null,
  showOnPublicRecipes: true,
});

export const fetchAuthorDisplaySettings = async (
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<AuthorDisplaySettings> => {
  const result = await queryFn(AUTHOR_DISPLAY_SELECT_SQL, [userId]);
  const row = result.rows[0] as AuthorDisplayRow | undefined;
  if (!row) {
    return emptyAuthorDisplaySettings();
  }
  return mapRowToAuthorDisplaySettings(row);
};

export const updateAuthorDisplaySettings = async (
  userId: string,
  settings: AuthorDisplaySettings,
  queryFn: QueryFn = defaultQuery,
): Promise<AuthorDisplaySettings | null> => {
  const trimmed = settings.displayName?.trim();
  const result = await queryFn(AUTHOR_DISPLAY_UPDATE_SQL, [
    userId,
    trimmed ? trimmed : null,
    settings.showOnPublicRecipes,
  ]);
  const row = result.rows[0] as AuthorDisplayRow | undefined;
  if (!row) {
    return null;
  }
  return mapRowToAuthorDisplaySettings(row);
};
