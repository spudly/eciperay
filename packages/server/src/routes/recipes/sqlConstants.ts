export const LIST_RECIPES_SQL = `
  select r.id, r.title, r.description, r.servings,
         r.prep_time_min, r.cook_time_min, r.image_url,
         r.star_rating, r.source_url, r.created_at, r.updated_at,
         coalesce(
           json_agg(
             json_build_object('id', t.id, 'name', t.name, 'color', t.color)
           ) filter (where t.id is not null),
           '[]'
         ) as tags
  from recipes r
  left join recipe_tags rt on rt.recipe_id = r.id
  left join tags t on t.id = rt.tag_id
  where r.user_id = $1
    and ($4::text is null or r.title ilike '%' || $4 || '%')
  group by r.id
  order by r.updated_at desc
  limit $2 offset $3
`;

export const GET_RECIPE_DETAIL_SQL = `
  select r.*,
    coalesce((
      select json_agg(
        jsonb_build_object(
          'id', i.id, 'sortOrder', i.sort_order, 'name', i.name,
          'quantity', i.quantity, 'unit', i.unit, 'notes', i.notes,
          'isOptional', i.is_optional
        ) order by i.sort_order
      )
      from ingredients i
      where i.recipe_id = r.id
    ), '[]') as ingredients,
    coalesce((
      select json_agg(
        jsonb_build_object(
          'id', ins.id, 'stepNumber', ins.step_number, 'body', ins.body
        ) order by ins.step_number
      )
      from instructions ins
      where ins.recipe_id = r.id
    ), '[]') as instructions,
    coalesce(json_agg(distinct jsonb_build_object(
      'id', t.id, 'name', t.name, 'color', t.color
    )) filter (where t.id is not null), '[]') as tags
  from recipes r
  left join recipe_tags rt on rt.recipe_id = r.id
  left join tags t on t.id = rt.tag_id
  where r.id = $1 and r.user_id = $2
  group by r.id
`;
