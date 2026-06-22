export const LIST_RECIPES_SQL = `
  select r.id, r.status, r.visibility, r.slug, r.content_revision,
         r.development_status, r.cloned_from_recipe_id, r.active_version_id,
         rv.id as version_id, rv.version_number, rv.title, rv.description,
         rv.servings, rv.prep_time_min, rv.cook_time_min, rv.image_url,
         rv.source_url, rv.created_via, rv.created_at, rv.updated_at,
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
  group by r.id, rv.id
  order by rv.updated_at desc
  limit $2 offset $3
`;

export const LIST_SHARED_WITH_ME_SQL = `
  select r.id, r.status, r.visibility, r.slug, r.content_revision,
         r.development_status, r.cloned_from_recipe_id, r.active_version_id,
         rv.id as version_id, rv.version_number, rv.title, rv.description,
         rv.servings, rv.prep_time_min, rv.cook_time_min, rv.image_url,
         rv.source_url, rv.created_via, rv.created_at, rv.updated_at,
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
  group by r.id, rv.id, g.granted_at
  order by g.granted_at desc
  limit $2 offset $3
`;

export const LIST_PUBLIC_RECIPES_SQL = `
  select r.id, r.slug, r.visibility,
         rv.title, rv.description, rv.servings, rv.prep_time_min,
         rv.cook_time_min, rv.image_url, rv.updated_at,
         u.display_name as author_display_name,
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
    and (
      $3::text is null
      or rv.title ilike '%' || $3 || '%'
      or coalesce(rv.description, '') ilike '%' || $3 || '%'
    )
  group by r.id, rv.id, u.display_name
  order by rv.updated_at desc
  limit $1 offset $2
`;

export const GET_RECIPE_DETAIL_SQL = `
  select r.id, r.user_id, r.status, r.visibility, r.slug, r.share_token_hash,
         r.content_revision, r.development_status, r.cloned_from_recipe_id,
         r.active_version_id,
         rv.id as version_id, rv.version_number, rv.title, rv.description,
         rv.servings, rv.prep_time_min, rv.cook_time_min, rv.image_url,
         rv.source_url, rv.created_via, rv.created_at, rv.updated_at,
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
         r.content_revision, r.development_status, r.cloned_from_recipe_id,
         r.active_version_id,
         rv.id as version_id, rv.version_number, rv.title, rv.description,
         rv.servings, rv.prep_time_min, rv.cook_time_min, rv.image_url,
         rv.source_url, rv.created_via, rv.created_at, rv.updated_at,
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

export const GET_VERSION_DETAIL_SQL = `
  select rv.id as version_id, rv.recipe_id, rv.version_number, rv.title,
         rv.description, rv.servings, rv.prep_time_min, rv.cook_time_min,
         rv.image_url, rv.source_url, rv.created_via, rv.change_summary,
         rv.derived_from_version_id, rv.created_at, rv.updated_at,
         r.user_id, r.status, r.active_version_id, av.version_number as active_version_number,
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
    )) filter (where t.id is not null), '[]') as tags,
    (select count(*)::int from cook_logs cl where cl.recipe_version_id = rv.id) as cook_log_count,
    (select count(*)::int from recipe_versions cv where cv.derived_from_version_id = rv.id) as child_version_count
  from recipe_versions rv
  join recipes r on r.id = rv.recipe_id
  join recipe_versions av on av.id = r.active_version_id
  left join recipe_tags rt on rt.recipe_version_id = rv.id
  left join tags t on t.id = rt.tag_id
  where rv.id = $1 and r.id = $2 and r.user_id = $3
  group by rv.id, r.id, av.version_number
`;

export const LIST_VERSIONS_SQL = `
  select rv.id, rv.recipe_id, rv.version_number, rv.title, rv.created_via,
         rv.change_summary, rv.created_at, rv.updated_at,
         r.active_version_id, av.version_number as active_version_number,
         r.status,
         (select count(*)::int from cook_logs cl where cl.recipe_version_id = rv.id) as cook_log_count,
         (select count(*)::int from recipe_versions cv where cv.derived_from_version_id = rv.id) as child_version_count
  from recipe_versions rv
  join recipes r on r.id = rv.recipe_id
  join recipe_versions av on av.id = r.active_version_id
  where rv.recipe_id = $1 and r.user_id = $2
  order by rv.version_number desc
`;
