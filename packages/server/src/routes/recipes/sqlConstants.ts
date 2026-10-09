import type {RecipeListSort, RecipeListSortDir} from '@eciperay/types';

import {
  communityRatingSelectSql,
  ingredientFilterSql,
  nutritionFilterSql,
  nutritionSelectSql,
  orderBySql,
} from './listFilterParams.js';

const listNutritionAndRatingSelect = `
         ${nutritionSelectSql},
         ${communityRatingSelectSql}
`;

export const buildListRecipesSql = (
  sort: RecipeListSort,
  sortDir: RecipeListSortDir,
) => `
  select r.id, r.status, r.visibility, r.slug, r.content_revision,
         r.cloned_from_recipe_id, r.star_rating, r.active_version_id,
         rv.id as version_id, rv.version_number, rv.title, rv.description,
         rv.servings, rv.prep_time_min, rv.cook_time_min, rv.image_url,
         rv.source_url, rv.created_via, rv.created_at, rv.updated_at,
         ${listNutritionAndRatingSelect},
         coalesce(
           json_agg(
             json_build_object('id', t.id, 'name', t.name, 'color', t.color)
           ) filter (where t.id is not null),
           '[]'
         ) as tags
  from recipes r
  join recipe_versions rv on rv.id = r.active_version_id
  left join recipe_tags rt on rt.recipe_version_id = rv.id
  left join tags t on t.id = rt.tag_id
  where r.user_id = $1
    and ($4::text is null or rv.title ilike '%' || $4 || '%')
    and ($5::text is null or r.status = $5)
    ${ingredientFilterSql(6)}
    ${nutritionFilterSql(7)}
  group by r.id, rv.id
  order by ${orderBySql(sort, sortDir)}
  limit $2 offset $3
`;

export const buildListSharedWithMeSql = (
  sort: RecipeListSort,
  sortDir: RecipeListSortDir,
) => `
  select r.id, r.status, r.visibility, r.slug, r.content_revision,
         r.cloned_from_recipe_id, r.star_rating, r.active_version_id,
         rv.id as version_id, rv.version_number, rv.title, rv.description,
         rv.servings, rv.prep_time_min, rv.cook_time_min, rv.image_url,
         rv.source_url, rv.created_via, rv.created_at, rv.updated_at,
         ${listNutritionAndRatingSelect},
         coalesce(
           json_agg(
             json_build_object('id', t.id, 'name', t.name, 'color', t.color)
           ) filter (where t.id is not null),
           '[]'
         ) as tags
  from recipe_share_grants g
  join recipes r on r.id = g.recipe_id
  join recipe_versions rv on rv.id = r.active_version_id
  left join recipe_tags rt on rt.recipe_version_id = rv.id
  left join tags t on t.id = rt.tag_id
  where g.user_id = $1
    and r.user_id <> $1
    and ($4::text is null or rv.title ilike '%' || $4 || '%')
    and ($5::text is null or r.status = $5)
    ${ingredientFilterSql(6)}
    ${nutritionFilterSql(7)}
  group by r.id, rv.id, g.granted_at
  order by ${
    sort === 'newest'
      ? `g.granted_at ${sortDir === 'asc' ? 'asc' : 'desc'}`
      : orderBySql(sort, sortDir)
  }
  limit $2 offset $3
`;

export const buildListPublicRecipesSql = (
  sort: RecipeListSort,
  sortDir: RecipeListSortDir,
) => `
  select r.id, r.slug, r.visibility,
         rv.title, rv.description, rv.servings, rv.prep_time_min,
         rv.cook_time_min, rv.image_url, rv.updated_at,
         u.display_name as author_display_name,
         ${listNutritionAndRatingSelect},
         coalesce(
           json_agg(
             json_build_object('id', t.id, 'name', t.name, 'color', t.color)
           ) filter (where t.id is not null),
           '[]'
         ) as tags
  from recipes r
  join recipe_versions rv on rv.id = r.active_version_id
  join users u on u.id = r.user_id
  left join recipe_tags rt on rt.recipe_version_id = rv.id
  left join tags t on t.id = rt.tag_id
  where r.visibility = 'public'
    and r.status <> 'idea'
    and (
      $3::text is null
      or rv.title ilike '%' || $3 || '%'
      or coalesce(rv.description, '') ilike '%' || $3 || '%'
    )
    and ($4::text is null or r.status = $4)
    ${ingredientFilterSql(5)}
    ${nutritionFilterSql(6)}
  group by r.id, rv.id, u.display_name
  order by ${orderBySql(sort, sortDir)}
  limit $1 offset $2
`;

/** @deprecated Use buildListSharedWithMeSql */
export const LIST_SHARED_WITH_ME_SQL = buildListSharedWithMeSql(
  'newest',
  'desc',
);

/** @deprecated Use buildListPublicRecipesSql */
export const LIST_PUBLIC_RECIPES_SQL = buildListPublicRecipesSql(
  'newest',
  'desc',
);

export const LIST_PUBLIC_RECIPES_SITEMAP_SQL = `
  select r.id, r.slug, rv.updated_at
  from recipes r
  join recipe_versions rv on rv.id = r.active_version_id
  where r.visibility = 'public'
    and r.status <> 'idea'
  order by rv.updated_at desc
`;

export const GET_RECIPE_DETAIL_SQL = `
  select r.id, r.user_id, r.status, r.visibility, r.slug, r.share_token_hash,
         r.content_revision, r.cloned_from_recipe_id,
         r.star_rating, r.active_version_id,
         rv.id as version_id, rv.version_number, rv.title, rv.description,
         rv.servings, rv.prep_time_min, rv.cook_time_min, rv.image_url,
         rv.source_url, rv.created_via, rv.created_at, rv.updated_at,
         ${nutritionSelectSql},
    coalesce((
      select json_agg(
        jsonb_build_object(
          'id', i.id, 'recipeVersionId', i.recipe_version_id,
          'sortOrder', i.sort_order, 'name', i.name,
          'quantity', i.quantity, 'unit', i.unit, 'notes', i.notes,
          'isOptional', i.is_optional
        ) order by i.sort_order
      )
      from ingredients i
      where i.recipe_version_id = rv.id
    ), '[]') as ingredients,
    coalesce((
      select json_agg(
        jsonb_build_object(
          'id', ins.id, 'recipeVersionId', ins.recipe_version_id,
          'stepNumber', ins.step_number, 'body', ins.body
        ) order by ins.step_number
      )
      from instructions ins
      where ins.recipe_version_id = rv.id
    ), '[]') as instructions,
    coalesce(json_agg(distinct jsonb_build_object(
      'id', t.id, 'name', t.name, 'color', t.color
    )) filter (where t.id is not null), '[]') as tags
  from recipes r
  join recipe_versions rv on rv.id = r.active_version_id
  left join recipe_tags rt on rt.recipe_version_id = rv.id
  left join tags t on t.id = rt.tag_id
  where r.id = $1 and r.user_id = $2
  group by r.id, rv.id
`;

export const GET_PUBLIC_RECIPE_DETAIL_SQL = `
  select r.id, r.user_id, r.status, r.visibility, r.slug, r.share_token_hash,
         r.content_revision, r.cloned_from_recipe_id,
         r.star_rating, r.active_version_id,
         rv.id as version_id, rv.version_number, rv.title, rv.description,
         rv.servings, rv.prep_time_min, rv.cook_time_min, rv.image_url,
         rv.source_url, rv.created_via, rv.created_at, rv.updated_at,
         ${nutritionSelectSql},
    coalesce((
      select json_agg(
        jsonb_build_object(
          'id', i.id, 'recipeVersionId', i.recipe_version_id,
          'sortOrder', i.sort_order, 'name', i.name,
          'quantity', i.quantity, 'unit', i.unit, 'notes', i.notes,
          'isOptional', i.is_optional
        ) order by i.sort_order
      )
      from ingredients i
      where i.recipe_version_id = rv.id
    ), '[]') as ingredients,
    coalesce((
      select json_agg(
        jsonb_build_object(
          'id', ins.id, 'recipeVersionId', ins.recipe_version_id,
          'stepNumber', ins.step_number, 'body', ins.body
        ) order by ins.step_number
      )
      from instructions ins
      where ins.recipe_version_id = rv.id
    ), '[]') as instructions,
    coalesce(json_agg(distinct jsonb_build_object(
      'id', t.id, 'name', t.name, 'color', t.color
    )) filter (where t.id is not null), '[]') as tags
  from recipes r
  join recipe_versions rv on rv.id = r.active_version_id
  left join recipe_tags rt on rt.recipe_version_id = rv.id
  left join tags t on t.id = rt.tag_id
  where r.id = $1
  group by r.id, rv.id
`;

export {
  GET_VERSION_DETAIL_SQL,
  LIST_VERSIONS_SQL,
} from './versionSqlConstants.js';
