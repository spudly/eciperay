import {query as defaultQuery} from '../db/query.js';

import {loadMealPlanDetail} from './loadMealPlanDetail.js';

type QueryFn = typeof defaultQuery;

export const listMealPlansForUser = async (
  userId: string,
  queryFn: QueryFn = defaultQuery,
) => {
  const result = await queryFn(
    `select id from meal_plans where user_id = $1 order by updated_at desc`,
    [userId],
  );
  const plans = [];
  for (const row of result.rows as {id: string}[]) {
    const detail = await loadMealPlanDetail(row.id, userId, queryFn);
    if (detail) {
      const {entries: _entries, ...summary} = detail;
      void _entries;
      plans.push(summary);
    }
  }
  return plans;
};
