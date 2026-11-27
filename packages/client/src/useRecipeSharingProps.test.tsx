import {act, renderHook, waitFor} from '@testing-library/react';

import type {EciperayClient} from './createEciperayClient.js';
import {makeRecipeDetail} from './test/fixtures/recipe.js';
import {makeHookWrapper} from './test/hookTestUtils.js';
import {
  useRecipeSharingProps,
  type RecipeSharingPlatform,
} from './useRecipeSharingProps.js';

const makePlatform = (overrides: Partial<RecipeSharingPlatform> = {}) => ({
  baseUrl: 'https://www.eciperay.com',
  shareUrl: jest.fn(),
  copyShareLinkLabel: 'Copy share link',
  copyPermalinkLabel: 'Copy',
  notifyOnShare: true,
  surfaceMutationErrors: true,
  ...overrides,
});

describe('useRecipeSharingProps', () => {
  test('saves a consented visibility change and composes the share link', async () => {
    const patchSharing = jest.fn().mockResolvedValue({
      visibility: 'unlisted',
      shareToken: 'token-abc',
    });
    const rotateShareToken = jest
      .fn()
      .mockResolvedValue({shareToken: 'token-def'});
    const client = {
      recipes: {patchSharing, rotateShareToken},
    } as unknown as EciperayClient;
    const onActionMessage = jest.fn();
    const platform = makePlatform();
    const {wrapper} = makeHookWrapper();
    const {result} = renderHook(
      () =>
        useRecipeSharingProps(
          client,
          makeRecipeDetail(),
          onActionMessage,
          platform,
        ),
      {wrapper},
    );
    expect(result.current.options.map(option => option.label)).toEqual([
      'Private',
      'Unlisted link',
      'Public',
    ]);
    act(() => {
      result.current.onValueChange('unlisted');
    });
    // Consent is required for leaving private: Save is a no-op until
    // consent is checked.
    act(() => {
      result.current.onSave?.();
    });
    expect(patchSharing).not.toHaveBeenCalled();
    act(() => {
      result.current.onConsentCheckedChange?.(true);
    });
    act(() => {
      result.current.onSave?.();
    });
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
    });
    expect(patchSharing).toHaveBeenCalledWith('recipe-uuid-1', {
      visibility: 'unlisted',
      publishingConsent: true,
    });
    await waitFor(() => {
      expect(result.current.shareLinkUrl).toContain('token-abc');
    });
    act(() => {
      result.current.onCopyShareLink?.();
    });
    expect(platform.shareUrl).toHaveBeenCalledWith(result.current.shareLinkUrl);
    expect(onActionMessage).toHaveBeenCalledWith('Share link copied');
  });

  test('a rejected change drops the pending selection (#418)', async () => {
    const patchSharing = jest
      .fn()
      .mockRejectedValue(new Error('cannot modify'));
    const client = {
      recipes: {patchSharing, rotateShareToken: jest.fn()},
    } as unknown as EciperayClient;
    const onActionMessage = jest.fn();
    const {wrapper} = makeHookWrapper();
    const {result} = renderHook(
      () =>
        useRecipeSharingProps(
          client,
          makeRecipeDetail(),
          onActionMessage,
          makePlatform(),
        ),
      {wrapper},
    );
    act(() => {
      result.current.onValueChange('public');
    });
    act(() => {
      result.current.onConsentCheckedChange?.(true);
    });
    act(() => {
      result.current.onSave?.();
    });
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith(
        expect.stringContaining('Could not update sharing settings'),
      );
    });
    expect(result.current.value).toBe('private');
  });

  test('public recipes expose the permalink share action', async () => {
    const client = {
      recipes: {patchSharing: jest.fn(), rotateShareToken: jest.fn()},
    } as unknown as EciperayClient;
    const onActionMessage = jest.fn();
    const platform = makePlatform();
    const {wrapper} = makeHookWrapper();
    const {result} = renderHook(
      () =>
        useRecipeSharingProps(
          client,
          makeRecipeDetail({visibility: 'public'}),
          onActionMessage,
          platform,
        ),
      {wrapper},
    );
    expect(result.current.permalinkUrl).toContain('/recipe/recipe-uuid-1/');
    act(() => {
      result.current.onCopyPermalink?.();
    });
    expect(platform.shareUrl).toHaveBeenCalledWith(
      result.current.permalinkUrl,
    );
    expect(onActionMessage).toHaveBeenCalledWith('Permalink copied');
  });
});
