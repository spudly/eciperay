import {fileURLToPath} from 'node:url';

// Seed pass for the QA dataset (issue #234): starter content for the
// dedicated QA account, created through the app's own API so the dataset
// holds real, app-shaped data for QA sweeps and manual test runs.
//
// The seed runs ONLY against a preview target — the persistent preview
// (eciperay-next) or a PR review app — and signs in as the QA account, so
// both the base URL and the credentials arrive via the environment:
//
//   QA_BASE_URL            e.g. https://eciperay-next.fly.dev
//   QA_SUPABASE_URL        the QA dataset's Supabase URL (the
//                          PREVIEW_SUPABASE_URL secret value)
//   QA_SUPABASE_ANON_KEY   the QA dataset's anon key (the
//                          PREVIEW_VITE_SUPABASE_ANON_KEY secret value)
//   QA_EMAIL / QA_PASSWORD the QA account's credentials
//
// Production hosts are refused outright (see assertQaTarget): this script
// must never write seed data into production. The run is idempotent —
// recipes whose titles already exist in the account are skipped — so it is
// safe to re-run after the account gains content. See docs/qa-seed.md.

export type SeedIngredient = {
  sortOrder: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  isOptional: boolean;
};

export type SeedInstruction = {stepNumber: number; body: string};

export type SeedRecipe = {
  title: string;
  description: string;
  servings: number;
  prepTimeMin: number;
  cookTimeMin: number;
  ingredients: SeedIngredient[];
  instructions: SeedInstruction[];
  tagIds: string[];
};

// Every seeded title carries the QA data prefix from the QA protocol, so
// seed content is always recognisable (and removable) in the account. The
// set is deliberately small: one everyday recipe for list/detail/servings
// flows, one scalable recipe for scaling and cook-log flows, and one
// minimal recipe for search and empty-state contrasts.
export const QA_SEED_RECIPES: SeedRecipe[] = [
  {
    title: 'QA — Weeknight Tomato Pasta',
    description:
      'Seed recipe for QA sweeps: recipe list, detail, and servings flows.',
    servings: 4,
    prepTimeMin: 10,
    cookTimeMin: 20,
    ingredients: [
      {
        sortOrder: 0,
        name: 'spaghetti',
        quantity: 12,
        unit: 'oz',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 1,
        name: 'crushed tomatoes',
        quantity: 28,
        unit: 'oz',
        notes: 'one can',
        isOptional: false,
      },
      {
        sortOrder: 2,
        name: 'garlic cloves',
        quantity: 3,
        unit: null,
        notes: 'minced',
        isOptional: false,
      },
      {
        sortOrder: 3,
        name: 'parmesan',
        quantity: null,
        unit: null,
        notes: 'to serve',
        isOptional: true,
      },
    ],
    instructions: [
      {stepNumber: 1, body: 'Boil salted water and cook the spaghetti.'},
      {
        stepNumber: 2,
        body: 'Simmer the tomatoes with the garlic for 15 minutes.',
      },
      {stepNumber: 3, body: 'Toss the pasta through the sauce and serve.'},
    ],
    tagIds: [],
  },
  {
    title: 'QA — Scaling Test Pancakes',
    description:
      'Seed recipe for QA sweeps: servings scaling and cook-log flows.',
    servings: 2,
    prepTimeMin: 5,
    cookTimeMin: 10,
    ingredients: [
      {
        sortOrder: 0,
        name: 'flour',
        quantity: 1.5,
        unit: 'cups',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 1,
        name: 'milk',
        quantity: 1.25,
        unit: 'cups',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 2,
        name: 'egg',
        quantity: 1,
        unit: null,
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 3,
        name: 'baking powder',
        quantity: 3.5,
        unit: 'tsp',
        notes: null,
        isOptional: false,
      },
    ],
    instructions: [
      {stepNumber: 1, body: 'Whisk the dry ingredients in a large bowl.'},
      {stepNumber: 2, body: 'Whisk in the milk and egg until just combined.'},
      {
        stepNumber: 3,
        body: 'Griddle ladles of batter until golden on both sides.',
      },
    ],
    tagIds: [],
  },
  {
    title: 'QA — Simple Garden Salad',
    description: 'Seed recipe for QA sweeps: search and filtering flows.',
    servings: 2,
    prepTimeMin: 10,
    cookTimeMin: 0,
    ingredients: [
      {
        sortOrder: 0,
        name: 'romaine hearts',
        quantity: 2,
        unit: null,
        notes: 'chopped',
        isOptional: false,
      },
      {
        sortOrder: 1,
        name: 'olive oil',
        quantity: 2,
        unit: 'tbsp',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 2,
        name: 'lemon',
        quantity: 1,
        unit: null,
        notes: 'juiced',
        isOptional: false,
      },
    ],
    instructions: [
      {stepNumber: 1, body: 'Chop the romaine and place it in a bowl.'},
      {stepNumber: 2, body: 'Dress with the olive oil and lemon juice.'},
    ],
    tagIds: [],
  },
];

export type SeedConfig = {
  baseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  password: string;
};

export type SeedFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export type SeedFetch = (
  url: string,
  init: {method: string; headers: Record<string, string>; body?: string},
) => Promise<SeedFetchResponse>;

const PRODUCTION_HOSTS: ReadonlySet<string> = new Set([
  'www.eciperay.com',
  'eciperay.com',
  // The production Fly app's own hostname: the preview apps are also
  // *.fly.dev, so the production app must be refused by name.
  'eciperay.fly.dev',
]);

// The seed may only ever write to a preview target: a *.fly.dev preview
// app (the persistent preview or a PR review app) or a local dev server.
// Anything else — above all production — is refused before any request.
export const assertQaTarget = (baseUrl: string): void => {
  const url = new URL(baseUrl);
  const host = url.hostname;
  if (PRODUCTION_HOSTS.has(host)) {
    throw new Error(
      `Refusing to seed ${host}: that is a production host. Point QA_BASE_URL at the preview environment.`,
    );
  }
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const isPreviewApp = host.endsWith('.fly.dev');
  if (!isLocal && !isPreviewApp) {
    throw new Error(
      `Refusing to seed ${host}: QA_BASE_URL must be a Fly preview app (*.fly.dev) or localhost.`,
    );
  }
  if (!isLocal && url.protocol !== 'https:') {
    throw new Error(`Refusing to seed ${host} over ${url.protocol}`);
  }
};

const REQUIRED_ENV = [
  'QA_BASE_URL',
  'QA_SUPABASE_URL',
  'QA_SUPABASE_ANON_KEY',
  'QA_EMAIL',
  'QA_PASSWORD',
] as const;

export const readSeedConfig = (
  env: Record<string, string | undefined>,
): SeedConfig => {
  const missing = REQUIRED_ENV.filter(name => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
  const baseUrl = (env['QA_BASE_URL'] as string).replace(/\/+$/u, '');
  assertQaTarget(baseUrl);
  return {
    baseUrl,
    supabaseUrl: (env['QA_SUPABASE_URL'] as string).replace(/\/+$/u, ''),
    supabaseAnonKey: env['QA_SUPABASE_ANON_KEY'] as string,
    email: env['QA_EMAIL'] as string,
    password: env['QA_PASSWORD'] as string,
  };
};

export const planSeedRecipes = (
  existingTitles: readonly string[],
  seeds: readonly SeedRecipe[] = QA_SEED_RECIPES,
): SeedRecipe[] => {
  const existing = new Set(existingTitles);
  return seeds.filter(seed => !existing.has(seed.title));
};

export const signInToQaAccount = async (
  config: SeedConfig,
  fetchFn: SeedFetch,
): Promise<string> => {
  const response = await fetchFn(
    `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'apikey': config.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({email: config.email, password: config.password}),
    },
  );
  if (!response.ok) {
    throw new Error(`QA sign-in failed with HTTP ${response.status}.`);
  }
  const body = (await response.json()) as {access_token?: unknown};
  if (typeof body.access_token !== 'string' || body.access_token === '') {
    throw new Error('QA sign-in response did not include an access token.');
  }
  return body.access_token;
};

export const listQaRecipeTitles = async (
  config: SeedConfig,
  accessToken: string,
  fetchFn: SeedFetch,
): Promise<string[]> => {
  const response = await fetchFn(`${config.baseUrl}/api/recipes?limit=500`, {
    method: 'GET',
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  if (!response.ok) {
    throw new Error(`Listing QA recipes failed with HTTP ${response.status}.`);
  }
  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) {
    throw new Error('Listing QA recipes did not return an array.');
  }
  return body.map(item => (item as {title: string}).title);
};

export const createQaRecipe = async (
  config: SeedConfig,
  accessToken: string,
  recipe: SeedRecipe,
  fetchFn: SeedFetch,
): Promise<void> => {
  const response = await fetchFn(`${config.baseUrl}/api/recipes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recipe),
  });
  if (!response.ok) {
    throw new Error(
      `Creating seed recipe "${recipe.title}" failed with HTTP ${response.status}.`,
    );
  }
};

export type SeedResult = {created: string[]; skipped: string[]};

export const seedQaDataset = async (
  config: SeedConfig,
  fetchFn: SeedFetch,
): Promise<SeedResult> => {
  const accessToken = await signInToQaAccount(config, fetchFn);
  const existingTitles = await listQaRecipeTitles(config, accessToken, fetchFn);
  const planned = planSeedRecipes(existingTitles);
  const plannedTitles = new Set(planned.map(seed => seed.title));
  const skipped = QA_SEED_RECIPES.filter(
    seed => !plannedTitles.has(seed.title),
  ).map(seed => seed.title);
  const created: string[] = [];
  for (const recipe of planned) {
    await createQaRecipe(config, accessToken, recipe, fetchFn);
    created.push(recipe.title);
    console.log(`Seeded "${recipe.title}".`);
  }
  for (const title of skipped) {
    console.log(`Skipped "${title}" (already exists).`);
  }
  console.log(
    `QA seed complete: ${created.length} created, ${skipped.length} skipped.`,
  );
  return {created, skipped};
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

export const runSeedQaDatasetCli = async (
  env: Record<string, string | undefined> = process.env,
  fetchFn: SeedFetch = fetch as SeedFetch,
): Promise<void> => {
  try {
    const config = readSeedConfig(env);
    await seedQaDataset(config, fetchFn);
  } catch (error) {
    console.error(
      `QA seed failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
};

export const maybeRunSeedQaDatasetCli = (
  directRun: boolean = isDirectRun(),
  run: () => Promise<void> = runSeedQaDatasetCli,
): void => {
  if (directRun) {
    void run();
  }
};

maybeRunSeedQaDatasetCli();
