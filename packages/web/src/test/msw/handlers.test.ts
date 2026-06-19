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
    const imported = await eciperay.import.importAi('quick pasta');
    expect(imported.recipeId).toBeTruthy();
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
    const approved = await eciperay.tweakAi.approvePlan(
      'recipe-uuid-1',
      'session-1',
    );
    expect(approved.session.phase).toBe('preview_ready');
    expect(approved.preview.title).toBe('Updated Recipe');
    const implemented = await eciperay.tweakAi.implement(
      'recipe-uuid-1',
      'session-1',
    );
    expect(implemented.preview.title).toBe('Updated Recipe');
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
