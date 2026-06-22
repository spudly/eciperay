import {http, HttpResponse} from 'msw';

import {
  makeCookLog,
  makeRecipeDetail,
  makeRecipeVersionDetail,
  makeRecipeVersionSummary,
  VERSION_ID,
} from '../fixtures/recipe.js';

const API = 'http://localhost:8080';

const recipe = makeRecipeDetail();

export const handlers = [
  http.get(`${API}/api/recipes`, ({request}) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim();
    if (search && !recipe.title.toLowerCase().includes(search.toLowerCase())) {
      return HttpResponse.json([]);
    }
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 100);
    return HttpResponse.json([recipe].slice(offset, offset + limit));
  }),
  http.get(`${API}/api/recipes/shared-with-me`, ({request}) => {
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 100);
    const sharedRecipe = makeRecipeDetail({
      id: 'shared-recipe-1',
      userId: 'other-user',
      title: 'Shared Pasta',
      slug: 'shared-pasta',
      visibility: 'public',
    });
    return HttpResponse.json([sharedRecipe].slice(offset, offset + limit));
  }),
  http.get(`${API}/api/recipes/:id`, ({params}) =>
    HttpResponse.json({...recipe, id: params['id']}),
  ),
  http.get(`${API}/api/public/recipes`, ({request}) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim();
    const discoveryRecipe = {
      id: 'public-recipe-1',
      slug: 'shared-pasta',
      title: search ? `Shared ${search}` : 'Shared Pasta',
      description: 'A public recipe',
      servings: 4,
      prepTimeMin: 10,
      cookTimeMin: 25,
      imageUrl: null,
      visibility: 'public' as const,
      authorDisplayName: 'Chef Alex',
      updatedAt: '2024-01-01T00:00:00.000Z',
      tags: [],
    };
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 100);
    return HttpResponse.json([discoveryRecipe].slice(offset, offset + limit));
  }),
  http.get(`${API}/api/public/recipes/:id`, ({params}) => {
    const {userId: _userId, ...publicRecipe} = recipe;
    void _userId;
    return HttpResponse.json({
      recipe: {...publicRecipe, id: params['id'], visibility: 'public'},
      canonicalSlug: recipe.slug,
      communityRating: null,
      viewerRating: null,
    });
  }),
  http.get(`${API}/api/public/recipes/:id/:slug`, ({params}) => {
    const {userId: _userId, ...publicRecipe} = recipe;
    void _userId;
    const slug = params['slug'] as string;
    const slugMismatch = slug !== recipe.slug;
    return HttpResponse.json({
      recipe: {...publicRecipe, id: params['id'], visibility: 'public'},
      canonicalSlug: recipe.slug,
      communityRating: null,
      viewerRating: null,
      ...(slugMismatch ? {slugMismatch: true} : {}),
    });
  }),
  http.post(`${API}/api/recipes`, async ({request}) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({
      ...recipe,
      ...body,
      id: 'new-recipe-id',
      recipeId: 'new-recipe-id',
      versionId: VERSION_ID,
    });
  }),
  http.put(`${API}/api/recipes/:id`, async ({params, request}) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({...recipe, id: params['id'], ...body});
  }),
  http.patch(`${API}/api/recipes/:id`, async ({params, request}) => {
    const body = (await request.json()) as {status?: string};
    return HttpResponse.json({
      ...recipe,
      id: params['id'],
      lifecycleStatus: body.status ?? recipe.lifecycleStatus,
    });
  }),
  http.delete(
    `${API}/api/recipes/:id`,
    () => new HttpResponse(null, {status: 204}),
  ),
  http.post(`${API}/api/recipes/:id/clone`, ({params}) =>
    HttpResponse.json(
      {
        ...recipe,
        id: 'cloned-recipe-id',
        recipeId: 'cloned-recipe-id',
        userId: 'user-uuid-1',
        visibility: 'private',
        clonedFromRecipeId: params['id'],
        versionId: VERSION_ID,
      },
      {status: 201},
    ),
  ),
  http.get(`${API}/api/recipes/:id/versions`, () =>
    HttpResponse.json([makeRecipeVersionSummary()]),
  ),
  http.get(`${API}/api/recipes/:id/versions/:versionId`, ({params}) =>
    HttpResponse.json(
      makeRecipeVersionDetail({
        id: params['versionId'] as string,
        recipeId: params['id'] as string,
      }),
    ),
  ),
  http.post(`${API}/api/recipes/:id/versions`, ({params}) =>
    HttpResponse.json(
      makeRecipeVersionDetail({
        id: 'version-draft-1',
        recipeId: params['id'] as string,
        versionNumber: 2,
        derivedRole: 'draft',
        isEditable: true,
        childVersionCount: 0,
        changeSummary: 'Manual tweak',
      }),
      {status: 201},
    ),
  ),
  http.put(
    `${API}/api/recipes/:id/versions/:versionId`,
    async ({params, request}) => {
      const body = (await request.json()) as object;
      return HttpResponse.json(
        makeRecipeVersionDetail({
          id: params['versionId'] as string,
          recipeId: params['id'] as string,
          ...body,
        }),
      );
    },
  ),
  http.post(`${API}/api/recipes/:id/versions/:versionId/activate`, ({params}) =>
    HttpResponse.json({...recipe, id: params['id']}),
  ),
  http.post(`${API}/api/recipes/:id/versions/ai`, async ({request}) => {
    const body = (await request.json()) as {prompt: string};
    const version = makeRecipeVersionDetail({
      id: 'version-ai-1',
      versionNumber: 2,
      derivedRole: 'draft',
      isEditable: true,
      childVersionCount: 0,
      changeSummary: `AI tweak: ${body.prompt}`,
    });
    return HttpResponse.json(
      {versionId: version.id, changeSummary: version.changeSummary, version},
      {status: 201},
    );
  }),
  http.post(`${API}/api/recipes/:id/tweak-ai-sessions`, async ({request}) => {
    const body = (await request.json()) as {prompt: string};
    const plan = `Plan for: ${body.prompt}`;
    return HttpResponse.json(
      {
        session: {
          id: 'session-1',
          recipeId: 'recipe-uuid-1',
          phase: 'planning',
          messages: [
            {role: 'user', content: body.prompt},
            {role: 'assistant', content: plan},
          ],
          approvedPlan: null,
          proposedRecipe: null,
          parentVersionId: VERSION_ID,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        plan,
      },
      {status: 201},
    );
  }),
  http.post(
    `${API}/api/recipes/:id/tweak-ai-sessions/:sessionId/messages`,
    async ({request}) => {
      const body = (await request.json()) as {content: string};
      return HttpResponse.json({
        session: {
          id: 'session-1',
          recipeId: 'recipe-uuid-1',
          phase: 'planning',
          messages: [
            {role: 'user', content: 'make it spicier'},
            {role: 'assistant', content: 'Plan for: make it spicier'},
            {role: 'user', content: body.content},
            {role: 'assistant', content: `Refined: ${body.content}`},
          ],
          approvedPlan: null,
          proposedRecipe: null,
          parentVersionId: VERSION_ID,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        reply: `Refined: ${body.content}`,
      });
    },
  ),
  http.post(`${API}/api/recipes/:id/tweak-ai-sessions/:sessionId/cancel`, () =>
    HttpResponse.json({
      session: {
        id: 'session-1',
        recipeId: 'recipe-uuid-1',
        phase: 'cancelled',
        messages: [],
        approvedPlan: null,
        proposedRecipe: null,
        parentVersionId: VERSION_ID,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    }),
  ),
  http.post(
    `${API}/api/recipes/:id/tweak-ai-sessions/:sessionId/approve-plan`,
    () => {
      const preview = {
        title: 'Updated Recipe',
        description: 'A tasty update',
        servings: 4,
        prepTimeMin: 10,
        cookTimeMin: 20,
        ingredients: [
          {
            sortOrder: 0,
            name: 'pasta',
            quantity: 400,
            unit: 'g',
            notes: null,
            isOptional: false,
          },
        ],
        instructions: [{stepNumber: 1, body: 'Cook pasta'}],
        tagIds: [],
        imageUrl: null,
        sourceUrl: null,
      };
      return HttpResponse.json({
        session: {
          id: 'session-1',
          recipeId: 'recipe-uuid-1',
          phase: 'preview_ready',
          messages: [],
          approvedPlan: 'Approved plan',
          proposedRecipe: preview,
          parentVersionId: VERSION_ID,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        changeSummary: 'AI tweak',
        preview,
      });
    },
  ),
  http.post(
    `${API}/api/recipes/:id/tweak-ai-sessions/:sessionId/implement`,
    () =>
      HttpResponse.json({
        session: {
          id: 'session-1',
          recipeId: 'recipe-uuid-1',
          phase: 'preview_ready',
          messages: [],
          approvedPlan: 'Approved plan',
          proposedRecipe: {
            title: 'Updated Recipe',
            ingredients: [],
            instructions: [],
          },
          parentVersionId: VERSION_ID,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        changeSummary: 'AI tweak',
        preview: {title: 'Updated Recipe', ingredients: [], instructions: []},
      }),
  ),
  http.post(
    `${API}/api/recipes/:id/tweak-ai-sessions/:sessionId/create-version`,
    () => {
      const version = makeRecipeVersionDetail({
        id: 'version-ai-1',
        versionNumber: 2,
        derivedRole: 'draft',
        isEditable: true,
        childVersionCount: 0,
      });
      return HttpResponse.json(
        {
          session: {
            id: 'session-1',
            recipeId: 'recipe-uuid-1',
            phase: 'completed',
            messages: [],
            approvedPlan: 'Approved plan',
            proposedRecipe: null,
            parentVersionId: VERSION_ID,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          versionId: version.id,
          version,
        },
        {status: 201},
      );
    },
  ),
  http.get(`${API}/api/recipes/:id/versions/:versionId/cooks`, () =>
    HttpResponse.json([makeCookLog()]),
  ),
  http.post(
    `${API}/api/recipes/:id/versions/:versionId/cooks`,
    async ({request}) => {
      const body = (await request.json()) as object;
      return HttpResponse.json({...makeCookLog(), ...body}, {status: 201});
    },
  ),
  http.post(`${API}/api/recipes/import/url`, () =>
    HttpResponse.json({
      ...recipe,
      id: 'imported-id',
      recipeId: 'imported-id',
      versionId: VERSION_ID,
    }),
  ),
  http.post(`${API}/api/recipes/import/image`, () =>
    HttpResponse.json({
      ...recipe,
      id: 'imported-image-id',
      recipeId: 'imported-image-id',
      versionId: VERSION_ID,
    }),
  ),
  http.post(`${API}/api/recipes/import/text`, () =>
    HttpResponse.json({
      ...recipe,
      id: 'imported-text-id',
      recipeId: 'imported-text-id',
      versionId: VERSION_ID,
    }),
  ),
  http.post(`${API}/api/recipes/import/ai/sessions`, async ({request}) => {
    const body = (await request.json()) as {prompt: string};
    const plan = `Plan for: ${body.prompt}`;
    return HttpResponse.json(
      {
        session: {
          id: 'create-session-1',
          phase: 'planning',
          messages: [
            {role: 'user', content: body.prompt},
            {role: 'assistant', content: plan},
          ],
          approvedPlan: null,
          proposedRecipe: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        plan,
      },
      {status: 201},
    );
  }),
  http.post(
    `${API}/api/recipes/import/ai/sessions/:sessionId/approve-plan`,
    () => {
      const preview = {
        title: 'AI Generated Pasta',
        description: 'A quick pasta dish.',
        servings: 4,
        prepTimeMin: 10,
        cookTimeMin: 20,
        ingredients: [
          {
            sortOrder: 0,
            name: 'pasta',
            quantity: 400,
            unit: 'g',
            notes: null,
            isOptional: false,
          },
        ],
        instructions: [{stepNumber: 1, body: 'Cook pasta'}],
        tagIds: [],
        imageUrl: null,
        sourceUrl: null,
      };
      return HttpResponse.json({
        session: {
          id: 'create-session-1',
          phase: 'preview_ready',
          messages: [],
          approvedPlan: 'Approved plan',
          proposedRecipe: preview,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        changeSummary: 'AI recipe',
        preview,
      });
    },
  ),
  http.post(
    `${API}/api/recipes/import/ai/sessions/:sessionId/create-recipe`,
    () =>
      HttpResponse.json(
        {
          session: {
            id: 'create-session-1',
            phase: 'completed',
            messages: [],
            approvedPlan: 'Approved plan',
            proposedRecipe: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          recipeId: 'imported-ai-id',
          versionId: VERSION_ID,
          recipe: {...recipe, id: 'imported-ai-id', recipeId: 'imported-ai-id'},
        },
        {status: 201},
      ),
  ),
  http.post(`${API}/api/recipes/:id/import/accept`, ({params}) =>
    HttpResponse.json({
      ...recipe,
      id: params['id'],
      lifecycleStatus: 'evolving',
    }),
  ),
  http.post(`${API}/api/recipes/:id/import/start-edits`, () => {
    const version = makeRecipeVersionDetail({
      id: 'version-draft-2',
      versionNumber: 2,
      derivedRole: 'draft',
      isEditable: true,
      createdVia: 'import_review',
      changeSummary: 'Import review edits',
    });
    return HttpResponse.json(version, {status: 201});
  }),
  http.post(`${API}/api/recipes/export`, async ({request}) => {
    const body = (await request.json()) as {recipeIds: string[]};
    return HttpResponse.json({
      formatVersion: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      recipes: body.recipeIds.map(() => ({
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        prepTimeMin: recipe.prepTimeMin,
        cookTimeMin: recipe.cookTimeMin,
        sourceUrl: recipe.sourceUrl,
        tags: recipe.tags.map(tag => ({name: tag.name, color: tag.color})),
        ingredients: recipe.ingredients.map(
          ({sortOrder, name, quantity, unit, notes, isOptional}) => ({
            sortOrder,
            name,
            quantity,
            unit,
            notes,
            isOptional,
          }),
        ),
        instructions: recipe.instructions.map(({stepNumber, body: text}) => ({
          stepNumber,
          body: text,
        })),
      })),
    });
  }),
  http.post(`${API}/api/recipes/import/bulk`, async ({request}) => {
    const body = (await request.json()) as {recipes: {title: string}[]};
    return HttpResponse.json({
      created: body.recipes.map((item, index) => ({
        id: `imported-${index}`,
        title: item.title,
      })),
      errors: [],
    });
  }),
  http.get(`${API}/api/recipes/:id/ai/nutrition`, () =>
    HttpResponse.json({
      servings: 4,
      calories: 250,
      proteinG: 10,
      carbsG: 30,
      fatG: 8,
      fiberG: 2,
      sugarG: null,
      sodiumMg: 400,
      disclaimer: 'Estimates only',
    }),
  ),
  http.get(`${API}/api/recipes/:id/ai/substitutions`, () =>
    HttpResponse.json([
      {ingredient: 'Salt', suggestions: ['Soy sauce', 'Miso']},
    ]),
  ),
  http.post(`${API}/api/recipes/ai/generate-image`, () =>
    HttpResponse.json({imageBase64: 'aGVsbG8=', contentType: 'image/png'}),
  ),
  http.post(`${API}/api/recipes/ai/generate-description`, () =>
    HttpResponse.json({description: 'A delicious AI-generated description.'}),
  ),
  http.get(`${API}/api/tags`, () =>
    HttpResponse.json([
      {
        id: 'tag-1',
        userId: null,
        name: 'Dinner',
        color: '#6366f1',
        isPreset: false,
      },
      {
        id: 'tag-2',
        userId: 'user-uuid-1',
        name: 'Quick',
        color: '#22c55e',
        isPreset: false,
      },
    ]),
  ),
  http.post(`${API}/api/tags`, async ({request}) => {
    const body = (await request.json()) as {name: string; color: string};
    return HttpResponse.json({
      id: 'tag-new',
      userId: 'user-uuid-1',
      name: body.name,
      color: body.color,
      isPreset: false,
    });
  }),
  http.delete(
    `${API}/api/tags/:id`,
    () => new HttpResponse(null, {status: 204}),
  ),
  http.post(
    `${API}/api/auth/sync`,
    () => new HttpResponse(null, {status: 204}),
  ),
];
