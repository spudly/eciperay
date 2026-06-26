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
    const perfected = await eciperay.recipes.patchStatus(
      'recipe-uuid-1',
      'perfected',
    );
    expect(perfected.status).toBe('perfected');
    const started = await eciperay.createAi.start('quick pasta');
    expect(started.session.id).toBeTruthy();
    const createApproved =
      await eciperay.createAi.approvePlan('create-session-1');
    expect(createApproved.session.phase).toBe('preview_ready');
    const created = await eciperay.createAi.createRecipe('create-session-1');
    expect(created.recipeId).toBeTruthy();
    const accepted = await eciperay.recipes.acceptImport('recipe-uuid-1');
    expect(accepted.status).toBe('evolving');
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
    const listed = await eciperay.recipes.listPublic({search: 'pasta'});
    expect(listed[0]?.title).toBe('Shared pasta');
    expect(listed[0]?.authorDisplayName).toBe('Chef Alex');
    const unfiltered = await eciperay.recipes.listPublic();
    expect(unfiltered[0]?.title).toBe('Shared Pasta');
    const byId = await eciperay.recipes.getPublic('recipe-uuid-1');
    expect(byId.recipe.title).toBe('Test Recipe');
    const bySlug = await eciperay.recipes.getPublic('recipe-uuid-1', {
      slug: 'test-recipe',
    });
    expect(bySlug.canonicalSlug).toBe('test-recipe');
  });

  test('covers shared-with-me list endpoint', async () => {
    const shared = await eciperay.recipes.listSharedWithMe({
      limit: 10,
      offset: 0,
    });
    expect(shared[0]?.title).toBe('Shared Pasta');
    expect(shared[0]?.id).toBe('shared-recipe-1');

    const response = await fetch(
      'http://localhost:8080/api/recipes/shared-with-me',
    );
    expect(response.ok).toBe(true);
    const unpaged = (await response.json()) as {title: string}[];
    expect(unpaged[0]?.title).toBe('Shared Pasta');
  });

  test('covers recipe clone endpoint', async () => {
    const cloned = await eciperay.recipes.clone('recipe-uuid-1');
    expect(cloned.id).toBe('cloned-recipe-id');
    expect(cloned.clonedFromRecipeId).toBe('recipe-uuid-1');
    expect(cloned.visibility).toBe('private');
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
    const recipe = (await response.json()) as {status: string};
    expect(recipe.status).toBe('evolving');
  });

  test('covers ratings and comments endpoints', async () => {
    const comment = await eciperay.recipes.createComment('recipe-uuid-1', {
      body: 'Nice!',
    });
    expect(comment.body).toBe('Nice!');
    const comments = await eciperay.recipes.listComments('recipe-uuid-1');
    expect(comments).toEqual([]);
    const publicComments = await eciperay.recipes.listPublicComments(
      'recipe-uuid-1',
      {shareToken: 'tok'},
    );
    expect(publicComments).toEqual([]);
    const rated = await eciperay.recipes.putRating('recipe-uuid-1', {stars: 4});
    expect(rated.viewerRating).toBe(4);
    const cleared = await eciperay.recipes.deleteRating('recipe-uuid-1');
    expect(cleared.viewerRating).toBeNull();

    const commentsViaSlug = await fetch(
      'http://localhost:8080/api/public/recipes/recipe-uuid-1/comments',
    );
    expect(commentsViaSlug.ok).toBe(true);
    expect(await commentsViaSlug.json()).toEqual([]);
  });
});
