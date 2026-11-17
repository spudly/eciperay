import {fileURLToPath} from 'node:url';

import pool from '../src/db/pool.js';
import {query} from '../src/db/query.js';
import {
  autoGenerateRecipeImage,
  autoImageContextFromDetail,
  type AutoGenerateOutcome,
} from '../src/lib/autoGenerateRecipeImage.js';
import {mapRowToRecipeDetail} from '../src/lib/mapRowToRecipeDetail.js';
import {GET_RECIPE_DETAIL_SQL} from '../src/routes/recipes/queries.js';

type QueryFn = typeof query;

type CandidateRow = {
  id: string;
  user_id: string;
  supabase_uid: string;
};

// Every recipe whose ACTIVE version has no image and whose one auto-image
// attempt has never been claimed. Recipes already claimed (attached, raced,
// or in flight) are excluded, so the script is safe to re-run: claimed
// recipes skip, and the claim inside autoGenerateRecipeImage is atomic.
const CANDIDATES_SQL = `
  select r.id, r.user_id, u.supabase_uid
    from recipes r
    join recipe_versions rv on rv.id = r.active_version_id
    join users u on u.id = r.user_id
   where rv.image_url is null
     and r.auto_image_attempted_at is null
   order by r.created_at asc
`;

/**
 * One-time backfill for #535: recipes saved through paths that never fired
 * the auto-image trigger (imports before the shared-save-layer fix) get
 * their one auto-generated image. Each recipe goes through the exact live
 * machinery — autoGenerateRecipeImage with its claim, entitlement, and
 * metering — so the rules match a live save. Logs one line per recipe.
 *
 * Run manually, once, AFTER the #535 deploy (it spends AI quota on the
 * backlog — Stephen's go-ahead required first):
 *   pnpm --filter @eciperay/server exec tsx scripts/backfillAutoRecipeImages.ts
 */
export const backfillAutoRecipeImages = async (
  queryFn: QueryFn = query,
): Promise<{recipeId: string; outcome: AutoGenerateOutcome}[]> => {
  const candidates = await queryFn<CandidateRow>(CANDIDATES_SQL);
  const results: {recipeId: string; outcome: AutoGenerateOutcome}[] = [];
  for (const candidate of candidates.rows) {
    const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [
      candidate.id,
      candidate.user_id,
    ]);
    const row = detail.rows[0];
    if (!row) {
      console.log(`recipe ${candidate.id}: skipped (detail not found)`);
      continue;
    }
    const recipe = mapRowToRecipeDetail(
      row as Parameters<typeof mapRowToRecipeDetail>[0],
    );
    const outcome = await autoGenerateRecipeImage(
      {
        userId: candidate.user_id,
        supabaseUid: candidate.supabase_uid,
        recipe: autoImageContextFromDetail(recipe),
      },
      queryFn,
    );
    results.push({recipeId: candidate.id, outcome});
    console.log(`recipe ${candidate.id}: ${outcome}`);
  }
  const attached = results.filter(r => r.outcome === 'attached').length;
  console.log(
    `backfill complete: ${results.length} candidate(s), ${attached} attached`,
  );
  return results;
};

export const isDirectRun = (
  argv: string[] = process.argv,
  modulePath: string = fileURLToPath(import.meta.url),
): boolean => {
  const entry = argv[1];
  if (!entry) {
    return false;
  }
  return modulePath === entry;
};

export const maybeRunBackfillCli = (
  directRun: boolean = isDirectRun(),
  run: () => Promise<void> = async () => {
    try {
      await backfillAutoRecipeImages();
    } finally {
      await pool.end();
    }
  },
): void => {
  if (directRun) {
    void run().catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
  }
};

maybeRunBackfillCli();
