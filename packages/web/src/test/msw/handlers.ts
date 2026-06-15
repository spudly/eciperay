import {http, HttpResponse} from 'msw';

import {makeRecipeDetail} from '../fixtures/recipe.js';

const API = 'http://localhost:8080';

const recipe = makeRecipeDetail();

export const handlers = [
  http.get(`${API}/recipes`, ({request}) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim();
    if (search && !recipe.title.toLowerCase().includes(search.toLowerCase())) {
      return HttpResponse.json([]);
    }
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 100);
    return HttpResponse.json([recipe].slice(offset, offset + limit));
  }),
  http.get(`${API}/recipes/:id`, ({params}) =>
    HttpResponse.json({...recipe, id: params['id']}),
  ),
  http.post(`${API}/recipes`, async ({request}) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({...recipe, ...body, id: 'new-recipe-id'});
  }),
  http.put(`${API}/recipes/:id`, async ({params, request}) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({...recipe, id: params['id'], ...body});
  }),
  http.patch(`${API}/recipes/:id`, async ({params, request}) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({...recipe, id: params['id'], ...body});
  }),
  http.delete(
    `${API}/recipes/:id`,
    () => new HttpResponse(null, {status: 204}),
  ),
  http.post(`${API}/recipes/import/url`, () =>
    HttpResponse.json({...recipe, id: 'imported-id'}),
  ),
  http.post(`${API}/recipes/import/image`, () =>
    HttpResponse.json({...recipe, id: 'imported-image-id'}),
  ),
  http.post(`${API}/recipes/import/text`, () =>
    HttpResponse.json({...recipe, id: 'imported-text-id'}),
  ),
  http.post(`${API}/recipes/export`, async ({request}) => {
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
        starRating: recipe.starRating,
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
  http.post(`${API}/recipes/import/bulk`, async ({request}) => {
    const body = (await request.json()) as {recipes: {title: string}[]};
    return HttpResponse.json({
      created: body.recipes.map((item, index) => ({
        id: `imported-${index}`,
        title: item.title,
      })),
      errors: [],
    });
  }),
  http.get(`${API}/recipes/:id/notes`, () =>
    HttpResponse.json([
      {
        id: 'note-1',
        recipeId: 'recipe-uuid-1',
        userId: 'user-uuid-1',
        content: 'Great recipe',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]),
  ),
  http.post(`${API}/recipes/:id/notes`, async ({request}) => {
    const body = (await request.json()) as {content: string};
    return HttpResponse.json({
      id: 'note-new',
      recipeId: 'recipe-uuid-1',
      userId: 'user-uuid-1',
      content: body.content,
      createdAt: '2024-01-02T00:00:00.000Z',
    });
  }),
  http.get(`${API}/recipes/:id/ai/conversation`, () =>
    HttpResponse.json({
      id: 'conv-1',
      recipeId: 'recipe-uuid-1',
      userId: 'user-uuid-1',
      messages: [
        {role: 'user', content: 'Make it spicier', createdAt: '2024-01-01'},
        {role: 'assistant', content: 'Hello!', createdAt: '2024-01-01'},
      ],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }),
  ),
  http.post(`${API}/recipes/:id/ai/chat`, () =>
    HttpResponse.json({
      assistantMessage: 'Sure!',
      draft: {
        id: 'draft-1',
        recipeId: 'recipe-uuid-1',
        status: 'pending',
        snapshotJson: recipe,
        diffJson: {},
        trigger: 'ai_chat',
        summaryOfChanges: 'Added garlic',
        createdAt: '2024-01-01',
      },
    }),
  ),
  http.post(`${API}/recipes/:id/ai/cleanup`, () =>
    HttpResponse.json({
      draft: {
        id: 'draft-2',
        recipeId: 'recipe-uuid-1',
        status: 'pending',
        snapshotJson: recipe,
        diffJson: {},
        trigger: 'ai_cleanup',
        summaryOfChanges: 'Cleaned up steps',
        createdAt: '2024-01-01',
      },
    }),
  ),
  http.get(`${API}/recipes/:id/ai/nutrition`, () =>
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
  http.get(`${API}/recipes/:id/ai/substitutions`, () =>
    HttpResponse.json([
      {ingredient: 'Salt', suggestions: ['Soy sauce', 'Miso']},
    ]),
  ),
  http.post(`${API}/recipes/ai/generate-image`, () =>
    HttpResponse.json({imageBase64: 'aGVsbG8=', contentType: 'image/png'}),
  ),
  http.post(`${API}/recipes/ai/generate-description`, () =>
    HttpResponse.json({description: 'A delicious AI-generated description.'}),
  ),
  http.get(`${API}/recipes/:id/drafts`, () =>
    HttpResponse.json([
      {
        id: 'draft-1',
        recipeId: 'recipe-uuid-1',
        status: 'pending',
        snapshotJson: recipe,
        diffJson: {},
        trigger: 'ai_chat',
        summaryOfChanges: 'Added garlic',
        createdAt: '2024-01-01',
      },
    ]),
  ),
  http.post(`${API}/recipes/:id/drafts/:draftId/approve`, ({params}) =>
    HttpResponse.json({...recipe, id: params['id']}),
  ),
  http.post(`${API}/recipes/:id/drafts/:draftId/reject`, () =>
    HttpResponse.json({status: 'rejected'}),
  ),
  http.get(`${API}/tags`, () =>
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
  http.post(`${API}/tags`, async ({request}) => {
    const body = (await request.json()) as {name: string; color: string};
    return HttpResponse.json({
      id: 'tag-new',
      userId: 'user-uuid-1',
      name: body.name,
      color: body.color,
      isPreset: false,
    });
  }),
  http.delete(`${API}/tags/:id`, () => new HttpResponse(null, {status: 204})),
  http.post(`${API}/auth/sync`, () => new HttpResponse(null, {status: 204})),
];
