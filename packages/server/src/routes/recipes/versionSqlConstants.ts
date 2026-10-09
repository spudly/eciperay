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
