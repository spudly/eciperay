import type {RecipeVersionSummary} from '@eciperay/types';

import {
  activationCandidates,
  canCreateDraftVersion,
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
  isRecipeStatusEditable,
} from './recipeEditActions.js';

describe('recipeEditActions', () => {
  const versions = (overrides: Partial<RecipeVersionSummary> = {}) => [
    {
      id: 'version-1',
      recipeId: 'recipe-1',
      versionNumber: 1,
      title: 'Test',
      derivedRole: 'active' as const,
      cookLogCount: 0,
      childVersionCount: 0,
      isEditable: false,
      isContentLocked: true,
      createdVia: 'ai' as const,
      changeSummary: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    },
  ];

  test('isRecipeStatusEditable excludes perfected and abandoned', () => {
    expect(isRecipeStatusEditable('evolving')).toBe(true);
    expect(isRecipeStatusEditable('perfected')).toBe(false);
    expect(isRecipeStatusEditable('abandoned')).toBe(false);
  });

  test('canCreateDraftVersion is true only for perfected recipes', () => {
    expect(canCreateDraftVersion('perfected')).toBe(true);
    expect(canCreateDraftVersion('evolving')).toBe(false);
    expect(canCreateDraftVersion('idea')).toBe(false);
    expect(canCreateDraftVersion('abandoned')).toBe(false);
  });

  test('activationCandidates offers candidates and archived versions', () => {
    const candidate = versions({
      id: 'version-2',
      derivedRole: 'candidate' as const,
    });
    const archived = versions({
      id: 'version-0',
      derivedRole: 'archived' as const,
    });
    const draft = versions({id: 'version-3', derivedRole: 'draft' as const});
    const active = versions();
    expect(
      activationCandidates('evolving', [
        ...active,
        ...candidate,
        ...archived,
        ...draft,
      ]),
    ).toEqual([...candidate, ...archived]);
  });

  test('activationCandidates offers every non-active version of a perfected recipe', () => {
    const draft = versions({id: 'version-3', derivedRole: 'draft' as const});
    const active = versions();
    expect(activationCandidates('perfected', [...active, ...draft])).toEqual(
      draft,
    );
  });

  test('activationCandidates offers nothing for an abandoned recipe', () => {
    const candidate = versions({
      id: 'version-2',
      derivedRole: 'candidate' as const,
    });
    const archived = versions({
      id: 'version-0',
      derivedRole: 'archived' as const,
    });
    expect(
      activationCandidates('abandoned', [...candidate, ...archived]),
    ).toEqual([]);
  });

  test('canEditDraftVersion reflects version isEditable', () => {
    expect(
      canEditDraftVersion(
        'draft-1',
        versions({id: 'draft-1', isEditable: true, derivedRole: 'draft'}),
      ),
    ).toBe(true);
    expect(canEditDraftVersion('version-1', versions())).toBe(false);
    expect(canEditDraftVersion('missing', versions())).toBe(false);
  });

  test('canEditActiveRecipeMetadata for content-locked active version', () => {
    expect(
      canEditActiveRecipeMetadata(
        'evolving',
        'version-1',
        'version-1',
        versions(),
      ),
    ).toBe(true);
  });

  test('canEditActiveRecipeMetadata is false when viewing alternate version', () => {
    expect(
      canEditActiveRecipeMetadata(
        'evolving',
        'draft-1',
        'version-1',
        versions(),
      ),
    ).toBe(false);
  });

  test('canEditActiveRecipeMetadata is false for perfected recipes', () => {
    expect(
      canEditActiveRecipeMetadata(
        'perfected',
        'version-1',
        'version-1',
        versions(),
      ),
    ).toBe(false);
  });

  test('canEditActiveRecipeMetadata is false for drafts and missing versions', () => {
    expect(
      canEditActiveRecipeMetadata(
        'evolving',
        'version-1',
        'version-1',
        versions({isEditable: true, derivedRole: 'draft'}),
      ),
    ).toBe(false);
    expect(
      canEditActiveRecipeMetadata('evolving', 'version-1', 'version-1', []),
    ).toBe(false);
  });
});
