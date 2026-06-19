import {
  ANALYTICS_EVENT_NAMES,
  RECIPE_CREATE_SOURCES,
  RECIPE_IMPORT_SOURCES,
  type AnalyticsEventProperties,
} from './analyticsEvents.js';

describe('analyticsEvents', () => {
  test('defines recipe lifecycle event names', () => {
    expect(ANALYTICS_EVENT_NAMES).toEqual([
      'recipe_created',
      'recipe_deleted',
      'recipe_imported',
    ]);
  });

  test('defines recipe source constants', () => {
    expect(RECIPE_IMPORT_SOURCES).toEqual([
      'url',
      'image',
      'text',
      'bulk',
      'ai',
    ]);
    expect(RECIPE_CREATE_SOURCES).toEqual([
      'manual',
      'url',
      'image',
      'text',
      'bulk',
      'ai',
    ]);
  });

  test('accepts typed event payloads', () => {
    const payloads: AnalyticsEventProperties = {
      recipe_created: {recipe_id: 'recipe-1', source: 'manual'},
      recipe_deleted: {recipe_id: 'recipe-1'},
      recipe_imported: {recipe_id: 'recipe-1', source: 'url'},
    };
    expect(payloads.recipe_created.source).toBe('manual');
  });
});
