import {eciperay} from '../../lib/api.js';

describe('msw handlers', () => {
  test('covers versioning and import endpoints', async () => {
    const version = await eciperay.versions.create('recipe-uuid-1');
    expect(version.id).toBeTruthy();
    const activated = await eciperay.versions.activate(
      'recipe-uuid-1',
      'version-uuid-1',
    );
    expect(activated.id).toBe('recipe-uuid-1');
    const perfected = await eciperay.recipes.patchLifecycle(
      'recipe-uuid-1',
      'perfected',
    );
    expect(perfected.lifecycleStatus).toBe('perfected');
    const started = await eciperay.createAi.start('quick pasta');
    expect(started.session.id).toBeTruthy();
    const createApproved =
      await eciperay.createAi.approvePlan('create-session-1');
    expect(createApproved.session.phase).toBe('preview_ready');
    const created = await eciperay.createAi.createRecipe('create-session-1');
    expect(created.recipeId).toBeTruthy();
    const accepted = await eciperay.recipes.acceptImport('recipe-uuid-1');
    expect(accepted.lifecycleStatus).toBe('evolving');
    const draft = await eciperay.versions.startImportEdits('recipe-uuid-1');
    expect(draft.versionNumber).toBe(2);
    const cookLog = await eciperay.cookLogs.create(
      'recipe-uuid-1',
      'version-uuid-1',
      {notes: 'Great'},
    );
    expect(cookLog.notes).toBe('Great');
    const tweaked = await eciperay.versions.tweakWithAi(
      'recipe-uuid-1',
      'make it spicier',
    );
    expect(tweaked.versionId).toBe('version-ai-1');
    expect(tweaked.changeSummary).toContain('make it spicier');
    const tweakApproved = await eciperay.tweakAi.approvePlan(
      'recipe-uuid-1',
      'session-1',
    );
    expect(tweakApproved.session.phase).toBe('preview_ready');
    expect(tweakApproved.preview.title).toBe('Updated Recipe');
    const implemented = await eciperay.tweakAi.implement(
      'recipe-uuid-1',
      'session-1',
    );
    expect(implemented.preview.title).toBe('Updated Recipe');
  });

  test('covers public recipe read endpoints', async () => {
    const byId = await eciperay.recipes.getPublic('recipe-uuid-1');
    expect(byId.recipe.title).toBe('Test Recipe');
    const bySlug = await eciperay.recipes.getPublic('recipe-uuid-1', {
      slug: 'test-recipe',
    });
    expect(bySlug.canonicalSlug).toBe('test-recipe');
  });

  test('covers lifecycle patch without an explicit status', async () => {
    const response = await fetch(
      'http://localhost:8080/api/recipes/recipe-uuid-1',
      {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
      },
    );
    expect(response.ok).toBe(true);
    const recipe = (await response.json()) as {lifecycleStatus: string};
    expect(recipe.lifecycleStatus).toBe('evolving');
  });
});
