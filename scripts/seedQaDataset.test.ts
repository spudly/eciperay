import {
  assertQaTarget,
  createQaRecipe,
  isDirectRun,
  listQaRecipeTitles,
  maybeRunSeedQaDatasetCli,
  planSeedRecipes,
  QA_SEED_RECIPES,
  readSeedConfig,
  runSeedQaDatasetCli,
  seedQaDataset,
  signInToQaAccount,
  type SeedConfig,
  type SeedFetch,
  type SeedRecipe,
} from './seedQaDataset.ts';

const seedAt = (index: number): SeedRecipe =>
  QA_SEED_RECIPES[index] as SeedRecipe;

const config: SeedConfig = {
  baseUrl: 'https://eciperay-next.fly.dev',
  supabaseUrl: 'https://qa-project.supabase.co',
  supabaseAnonKey: 'anon-key',
  email: 'qa@example.com',
  password: 'qa-password',
};

const jsonResponse = (ok: boolean, status: number, body: unknown) => ({
  ok,
  status,
  json: () => Promise.resolve(body),
});

describe('assertQaTarget', () => {
  test('refuses the production site', () => {
    expect(() => {
      assertQaTarget('https://www.eciperay.com');
    }).toThrow('production host');
  });

  test('refuses the production Fly app by name', () => {
    expect(() => {
      assertQaTarget('https://eciperay.fly.dev');
    }).toThrow('production host');
  });

  test('refuses hosts that are neither preview apps nor local', () => {
    expect(() => {
      assertQaTarget('https://staging.example.com');
    }).toThrow('must be a Fly preview app');
  });

  test('refuses preview apps over plain http', () => {
    expect(() => {
      assertQaTarget('http://pr-1-spudly-eciperay.fly.dev');
    }).toThrow('over http:');
  });

  test('allows the persistent preview and review apps', () => {
    expect(() => {
      assertQaTarget('https://eciperay-next.fly.dev');
    }).not.toThrow();
    expect(() => {
      assertQaTarget('https://pr-12-spudly-eciperay.fly.dev');
    }).not.toThrow();
  });

  test('allows local dev servers', () => {
    expect(() => {
      assertQaTarget('http://localhost:3000');
    }).not.toThrow();
    expect(() => {
      assertQaTarget('http://127.0.0.1:8080');
    }).not.toThrow();
  });
});

describe('readSeedConfig', () => {
  test('throws listing every missing variable', () => {
    expect(() => readSeedConfig({})).toThrow(
      'Missing required environment variables: QA_BASE_URL, QA_SUPABASE_URL, QA_SUPABASE_ANON_KEY, QA_EMAIL, QA_PASSWORD',
    );
  });

  test('throws listing only the missing variables', () => {
    expect(() =>
      readSeedConfig({QA_BASE_URL: 'https://eciperay-next.fly.dev'}),
    ).toThrow('QA_SUPABASE_URL');
  });

  test('reads config and trims trailing slashes', () => {
    expect(
      readSeedConfig({
        QA_BASE_URL: 'https://eciperay-next.fly.dev//',
        QA_SUPABASE_URL: 'https://qa-project.supabase.co/',
        QA_SUPABASE_ANON_KEY: 'anon-key',
        QA_EMAIL: 'qa@example.com',
        QA_PASSWORD: 'qa-password',
      }),
    ).toEqual(config);
  });

  test('refuses a production base URL', () => {
    expect(() =>
      readSeedConfig({
        QA_BASE_URL: 'https://www.eciperay.com',
        QA_SUPABASE_URL: 'https://qa-project.supabase.co',
        QA_SUPABASE_ANON_KEY: 'anon-key',
        QA_EMAIL: 'qa@example.com',
        QA_PASSWORD: 'qa-password',
      }),
    ).toThrow('production host');
  });
});

describe('planSeedRecipes', () => {
  test('plans every seed when the account is empty', () => {
    expect(planSeedRecipes([])).toEqual(QA_SEED_RECIPES);
  });

  test('skips seeds whose titles already exist', () => {
    const planned = planSeedRecipes([seedAt(0).title]);
    expect(planned).toEqual(QA_SEED_RECIPES.slice(1));
  });

  test('honours a custom seed list', () => {
    const custom: SeedRecipe[] = [{...seedAt(0), title: 'QA — Custom'}];
    expect(planSeedRecipes([], custom)).toEqual(custom);
    expect(planSeedRecipes(['QA — Custom'], custom)).toEqual([]);
  });
});

describe('signInToQaAccount', () => {
  test('returns the access token and sends the password grant', async () => {
    const fetchFn = jest.fn<SeedFetch>(() =>
      Promise.resolve(jsonResponse(true, 200, {access_token: 'token-123'})),
    );
    await expect(signInToQaAccount(config, fetchFn)).resolves.toBe('token-123');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://qa-project.supabase.co/auth/v1/token?grant_type=password',
      expect.objectContaining({method: 'POST'}),
    );
  });

  test('throws on an HTTP failure', async () => {
    const fetchFn = jest.fn<SeedFetch>(() =>
      Promise.resolve(jsonResponse(false, 400, {})),
    );
    await expect(signInToQaAccount(config, fetchFn)).rejects.toThrow(
      'QA sign-in failed with HTTP 400.',
    );
  });

  test('throws when the response has no access token', async () => {
    const fetchFn = jest.fn<SeedFetch>(() =>
      Promise.resolve(jsonResponse(true, 200, {})),
    );
    await expect(signInToQaAccount(config, fetchFn)).rejects.toThrow(
      'did not include an access token',
    );
  });

  test('throws when the access token is empty', async () => {
    const fetchFn = jest.fn<SeedFetch>(() =>
      Promise.resolve(jsonResponse(true, 200, {access_token: ''})),
    );
    await expect(signInToQaAccount(config, fetchFn)).rejects.toThrow(
      'did not include an access token',
    );
  });
});

describe('listQaRecipeTitles', () => {
  test('returns the titles of the account recipes', async () => {
    const fetchFn = jest.fn<SeedFetch>(() =>
      Promise.resolve(
        jsonResponse(true, 200, [{title: 'One'}, {title: 'Two'}]),
      ),
    );
    await expect(listQaRecipeTitles(config, 'token', fetchFn)).resolves.toEqual(
      ['One', 'Two'],
    );
  });

  test('throws on an HTTP failure', async () => {
    const fetchFn = jest.fn<SeedFetch>(() =>
      Promise.resolve(jsonResponse(false, 500, {})),
    );
    await expect(listQaRecipeTitles(config, 'token', fetchFn)).rejects.toThrow(
      'Listing QA recipes failed with HTTP 500.',
    );
  });

  test('throws when the response is not an array', async () => {
    const fetchFn = jest.fn<SeedFetch>(() =>
      Promise.resolve(jsonResponse(true, 200, {recipes: []})),
    );
    await expect(listQaRecipeTitles(config, 'token', fetchFn)).rejects.toThrow(
      'did not return an array',
    );
  });
});

describe('createQaRecipe', () => {
  test('posts the recipe', async () => {
    const fetchFn = jest.fn<SeedFetch>(() =>
      Promise.resolve(jsonResponse(true, 201, {})),
    );
    await expect(
      createQaRecipe(config, 'token', seedAt(0), fetchFn),
    ).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledWith(
      'https://eciperay-next.fly.dev/api/recipes',
      expect.objectContaining({method: 'POST'}),
    );
  });

  test('throws on an HTTP failure', async () => {
    const fetchFn = jest.fn<SeedFetch>(() =>
      Promise.resolve(jsonResponse(false, 402, {})),
    );
    await expect(
      createQaRecipe(config, 'token', seedAt(0), fetchFn),
    ).rejects.toThrow('failed with HTTP 402');
  });
});

const makeSeedFetch = (existingTitles: string[]): SeedFetch =>
  jest.fn<SeedFetch>((url, init) => {
    if (url.includes('/auth/v1/token')) {
      return Promise.resolve(
        jsonResponse(true, 200, {access_token: 'token-123'}),
      );
    }
    if (init.method === 'GET') {
      return Promise.resolve(
        jsonResponse(
          true,
          200,
          existingTitles.map(title => ({title})),
        ),
      );
    }
    return Promise.resolve(jsonResponse(true, 201, {}));
  });

describe('seedQaDataset', () => {
  test('creates only the missing seeds and reports skips', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const fetchFn = makeSeedFetch([seedAt(1).title]);
    const result = await seedQaDataset(config, fetchFn);
    expect(result.created).toEqual([seedAt(0).title, seedAt(2).title]);
    expect(result.skipped).toEqual([seedAt(1).title]);
    expect(log).toHaveBeenCalledWith('QA seed complete: 2 created, 1 skipped.');
    log.mockRestore();
  });

  test('creates nothing when every seed already exists', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const fetchFn = makeSeedFetch(QA_SEED_RECIPES.map(seed => seed.title));
    const result = await seedQaDataset(config, fetchFn);
    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual(QA_SEED_RECIPES.map(seed => seed.title));
    log.mockRestore();
  });
});

describe('isDirectRun', () => {
  test('returns false without argv entry', () => {
    expect(isDirectRun([], '/module.ts')).toBe(false);
  });

  test('returns false when argv names another module', () => {
    expect(isDirectRun(['node', '/other.ts'], '/module.ts')).toBe(false);
  });

  test('returns true when argv matches module path', () => {
    expect(isDirectRun(['node', '/module.ts'], '/module.ts')).toBe(true);
  });
});

describe('runSeedQaDatasetCli', () => {
  const env = {
    QA_BASE_URL: 'https://eciperay-next.fly.dev',
    QA_SUPABASE_URL: 'https://qa-project.supabase.co',
    QA_SUPABASE_ANON_KEY: 'anon-key',
    QA_EMAIL: 'qa@example.com',
    QA_PASSWORD: 'qa-password',
  };

  test('seeds from the environment end to end', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runSeedQaDatasetCli(env, makeSeedFetch([]));
    expect(log).toHaveBeenCalledWith(
      `QA seed complete: ${QA_SEED_RECIPES.length} created, 0 skipped.`,
    );
    log.mockRestore();
  });

  test('reports a config error and sets the exit code', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const previousExitCode = process.exitCode;
    await runSeedQaDatasetCli({}, jest.fn<SeedFetch>());
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Missing required environment variables'),
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
    error.mockRestore();
  });

  test('reports a non-Error failure and sets the exit code', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const previousExitCode = process.exitCode;
    const fetchFn = jest.fn<SeedFetch>(() => Promise.reject('boom'));
    await runSeedQaDatasetCli(env, fetchFn);
    expect(error).toHaveBeenCalledWith('QA seed failed: boom');
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
    error.mockRestore();
  });
});

describe('maybeRunSeedQaDatasetCli', () => {
  test('runs the cli when invoked directly', async () => {
    const run = jest.fn(() => Promise.resolve());
    maybeRunSeedQaDatasetCli(true, run);
    expect(run).toHaveBeenCalled();
    await Promise.resolve();
  });

  test('skips the cli when imported', () => {
    const run = jest.fn(() => Promise.resolve());
    maybeRunSeedQaDatasetCli(false, run);
    expect(run).not.toHaveBeenCalled();
  });
});
