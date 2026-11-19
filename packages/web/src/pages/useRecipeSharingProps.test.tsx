import {act, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';
import type {RecipeDetail} from '@eciperay/types';
import type {RecipeDetailPageSharing} from '@spudly/ui';

import {eciperay} from '../lib/api.js';
import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {useRecipeSharingProps} from './useRecipeSharingProps.js';

const API = 'http://localhost:8080';

/**
 * The sharing panel crosses into RecipeDetailPage as data props (B7 T1,
 * eciperay#552), so its host logic is a hook: these tests drive the hook
 * through a probe that captures the props it returns for RecipeSharingView, and
 * pin the conditional composition (Save / consent / share-link / permalink
 * blocks cross only when the composed RecipeVisibilityControls rendered them),
 * the mutation wiring, the clipboard copy actions, and the #418 error surfacing
 * the panel owned.
 */
const renderSharingProps = async (
  recipe: RecipeDetail = makeRecipeDetail(),
  locale?: 'en-XA',
) => {
  const onActionMessage = vi.fn();
  let captured: RecipeDetailPageSharing | null = null;
  const Probe = () => {
    captured = useRecipeSharingProps(recipe, onActionMessage);
    return null;
  };
  await renderWithProviders(<Probe />, {locale});
  return {
    onActionMessage,
    props: () => {
      if (!captured) {
        throw new Error('hook did not render');
      }
      return captured;
    },
  };
};

describe('useRecipeSharingProps', () => {
  test('renders sharing options from the en-XA Lingui catalog (#465)', async () => {
    const {props} = await renderSharingProps(makeRecipeDetail(), 'en-XA');
    expect(props().options.map(option => option.label)).toEqual([
      'Private~',
      'Unlisted link~',
      'Public~',
    ]);
    expect(props().options.map(option => option.description)).toEqual([
      'Just between you and your kitchen — only you can view this recipe.~',
      'Anyone with the link can view it — no sign-in needed.~',
      'Out in the open — anyone can discover it, and it may turn up in search results.~',
    ]);
  });

  test('renders sharing options with no pending blocks', async () => {
    const {props} = await renderSharingProps();
    expect(props().options.map(option => option.label)).toEqual([
      'Private',
      'Unlisted link',
      'Public',
    ]);
    expect(props().value).toBe('private');
    // No changed selection yet: no Save, no consent block, and a
    // private recipe carries neither link block.
    expect(props().onSave).toBeUndefined();
    expect(props().onConsentCheckedChange).toBeUndefined();
    expect(props().onRotateShareLink).toBeUndefined();
    expect(props().permalinkUrl).toBeUndefined();
  });

  test('requires consent before saving a first publish', async () => {
    const {props} = await renderSharingProps();
    await act(async () => {
      props().onValueChange('unlisted');
    });
    expect(props().onSave).toBeDefined();
    expect(props().saveLabel).toBe('Save sharing settings');
    expect(props().consentRequired).toBe(true);
    expect(props().consentChecked).toBe(false);
    expect(props().consentLabel).toBe('Publishing consent');
    // The consent copy carries the Privacy Policy link.
    expect(props().consentDescription).toBeTruthy();
  });

  test('does not save a first publish without publishing consent', async () => {
    const patchSharing = vi.spyOn(eciperay.recipes, 'patchSharing');
    try {
      const {props} = await renderSharingProps();
      await act(async () => {
        props().onValueChange('unlisted');
      });
      expect(props().consentRequired).toBe(true);
      expect(props().consentChecked).toBe(false);
      await act(async () => {
        props().onSave?.();
      });
      expect(patchSharing).not.toHaveBeenCalled();
    } finally {
      patchSharing.mockRestore();
    }
  });

  test('saves visibility after publishing consent and enables share-link copy', async () => {
    const writeText = vi.fn().mockImplementation(() => Promise.resolve());
    Object.assign(navigator, {clipboard: {writeText}});
    server.use(
      http.patch(`${API}/api/recipes/:id/sharing`, () =>
        HttpResponse.json({
          ...makeRecipeDetail({visibility: 'unlisted'}),
          shareToken: 'token-abc',
        }),
      ),
    );
    const {props, onActionMessage} = await renderSharingProps();
    await act(async () => {
      props().onValueChange('unlisted');
    });
    await act(async () => {
      props().onConsentCheckedChange?.(true);
    });
    await act(async () => {
      props().onSave?.();
    });
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
    });
    // The saved token composes the share URL and enables the copy
    // action, wired to the clipboard with the web panel's wording.
    await waitFor(() => {
      expect(props().shareLinkUrl).toContain('token-abc');
    });
    expect(props().copyShareLinkLabel).toBe('Copy share link');
    await act(async () => {
      props().onCopyShareLink?.();
    });
    expect(writeText).toHaveBeenCalledWith(props().shareLinkUrl);
    expect(onActionMessage).toHaveBeenCalledWith('Share link copied');
  });

  test('surfaces a rejected sharing change and clears the pending selection (#418)', async () => {
    server.use(
      http.patch(`${API}/api/recipes/:id/sharing`, () =>
        HttpResponse.json(
          {error: 'Recipe cannot be modified in its current status'},
          {status: 409},
        ),
      ),
    );
    const {props, onActionMessage} = await renderSharingProps();
    await act(async () => {
      props().onValueChange('unlisted');
    });
    await act(async () => {
      props().onConsentCheckedChange?.(true);
    });
    await act(async () => {
      props().onSave?.();
    });
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith(
        'Could not update sharing settings: Recipe cannot be modified in its current status',
      );
    });
    // The failed change is not left looking saved: the pending
    // selection (and its Save button) is gone, matching the server's
    // visibility.
    await waitFor(() => {
      expect(props().onSave).toBeUndefined();
    });
    expect(props().value).toBe('private');
    // Retrying starts from a clean slate: the consent given for the
    // rejected attempt was cleared along with the selection.
    await act(async () => {
      props().onValueChange('unlisted');
    });
    expect(props().consentChecked).toBe(false);
  });

  test('surfaces a rejected share-link rotation (#418)', async () => {
    server.use(
      http.post(`${API}/api/recipes/:id/sharing/rotate-token`, () =>
        HttpResponse.json(
          {error: 'Recipe cannot be modified in its current status'},
          {status: 409},
        ),
      ),
    );
    const {props, onActionMessage} = await renderSharingProps(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    await act(async () => {
      props().onRotateShareLink?.();
    });
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith(
        'Could not rotate the share link: Recipe cannot be modified in its current status',
      );
    });
    expect(onActionMessage).not.toHaveBeenCalledWith('Share link rotated');
  });

  test('shows public warning before saving', async () => {
    const {props} = await renderSharingProps();
    await act(async () => {
      props().onValueChange('public');
    });
    expect(props().publicWarning).toMatch(
      /once public, anyone browsing Eciperay can discover this recipe/i,
    );
  });

  test('rotates share links for unlisted recipes', async () => {
    server.use(
      http.post(`${API}/api/recipes/:id/sharing/rotate-token`, () =>
        HttpResponse.json({
          ...makeRecipeDetail({visibility: 'unlisted'}),
          shareToken: 'rotated-token',
        }),
      ),
    );
    const {props, onActionMessage} = await renderSharingProps(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    expect(props().rotateShareLinkLabel).toBe('Generate share link');
    await act(async () => {
      props().onRotateShareLink?.();
    });
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith('Share link rotated');
    });
    await waitFor(() => {
      expect(props().shareLinkUrl).toContain('rotated-token');
    });
    expect(props().rotateShareLinkLabel).toBe('Rotate share link');
  });

  test('shows public permalink actions', async () => {
    const writeText = vi.fn().mockImplementation(() => Promise.resolve());
    Object.assign(navigator, {clipboard: {writeText}});
    const {props, onActionMessage} = await renderSharingProps(
      makeRecipeDetail({visibility: 'public'}),
    );
    expect(props().permalinkLabel).toBe('Public permalink');
    expect(props().permalinkUrl).toMatch(/\/recipe\/recipe-uuid-1\//);
    expect(props().copyPermalinkLabel).toBe('Copy');
    await act(async () => {
      props().onCopyPermalink?.();
    });
    expect(writeText).toHaveBeenCalledWith(props().permalinkUrl);
    expect(onActionMessage).toHaveBeenCalledWith('Permalink copied');
  });

  test('can return a recipe to private visibility', async () => {
    server.use(
      http.patch(`${API}/api/recipes/:id/sharing`, () =>
        HttpResponse.json(makeRecipeDetail({visibility: 'private'})),
      ),
    );
    const {props, onActionMessage} = await renderSharingProps(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    await act(async () => {
      props().onValueChange('private');
    });
    // Leaving a published state needs no consent block.
    expect(props().onConsentCheckedChange).toBeUndefined();
    await act(async () => {
      props().onSave?.();
    });
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
    });
    await waitFor(() => {
      expect(props().onRotateShareLink).toBeUndefined();
    });
  });
});
