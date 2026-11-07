import React from 'react';
import {act, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Linking, Share} from 'react-native';
import type {RecipeDetailPageSharing} from '@spudly/ui';

import {renderWithProviders} from '../../__tests__/testUtils';
import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {api} from '../../lib/api';

import {useRecipeSharingProps} from './RecipeVisibilityControls';

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
jest
  .spyOn(Share, 'share')
  .mockResolvedValue({action: 'sharedAction', activityType: undefined});

jest.mock('../../lib/api', () => ({
  api: {recipes: {patchSharing: jest.fn(), rotateShareToken: jest.fn()}},
}));

const mockPatchSharing = jest.mocked(api.recipes.patchSharing);
const mockRotateShareToken = jest.mocked(api.recipes.rotateShareToken);

/**
 * The sharing panel crosses into RecipeDetailPage as data props (#438 Part 3),
 * so its host logic is a hook: these tests drive the hook through a probe that
 * captures the props it returns for RecipeSharingView, and pin the conditional
 * composition (Save / consent / share-link / permalink blocks cross only when
 * the composed panel rendered them) and the mutation wiring the panel used to
 * own.
 */
const renderSharingProps = async (recipe = makeRecipeDetail()) => {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  const onActionMessage = jest.fn();
  let captured: RecipeDetailPageSharing | null = null;
  const Probe = () => {
    captured = useRecipeSharingProps(recipe, onActionMessage);
    return null;
  };
  await renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  );
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
  beforeEach(() => {
    mockPatchSharing.mockReset();
    mockRotateShareToken.mockReset();
    mockPatchSharing.mockResolvedValue({
      ...makeRecipeDetail({visibility: 'unlisted'}),
      shareToken: 'token-abc',
    });
    mockRotateShareToken.mockResolvedValue({
      ...makeRecipeDetail({visibility: 'unlisted'}),
      shareToken: 'rotated-token',
    });
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
    expect(mockPatchSharing).not.toHaveBeenCalled();
  });

  test('does not save a first publish without publishing consent', async () => {
    const {props} = await renderSharingProps();
    await act(async () => {
      props().onValueChange('unlisted');
    });
    expect(props().consentRequired).toBe(true);
    expect(props().consentChecked).toBe(false);
    await act(async () => {
      props().onSave?.();
    });
    expect(mockPatchSharing).not.toHaveBeenCalled();
  });

  test('saves visibility after publishing consent', async () => {
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
      expect(mockPatchSharing).toHaveBeenCalledWith(expect.any(String), {
        visibility: 'unlisted',
        publishingConsent: true,
      });
    });
    expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
  });

  test('shows public warning before saving', async () => {
    const {props} = await renderSharingProps();
    await act(async () => {
      props().onValueChange('public');
    });
    expect(props().publicWarning).toMatch(
      /This recipe will be discoverable by anyone/i,
    );
  });

  test('can switch back to private visibility', async () => {
    mockPatchSharing.mockResolvedValue(
      makeRecipeDetail({visibility: 'private'}),
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
      expect(mockPatchSharing).toHaveBeenCalled();
    });
    expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
  });

  test('rotates share links for unlisted recipes', async () => {
    const {props, onActionMessage} = await renderSharingProps(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    expect(props().rotateShareLinkLabel).toBe('Generate share link');
    await act(async () => {
      props().onRotateShareLink?.();
    });
    await waitFor(() => {
      expect(mockRotateShareToken).toHaveBeenCalled();
    });
    expect(onActionMessage).toHaveBeenCalledWith('Share link rotated');
    // The rotated token composes the share URL and enables the
    // share action, wired to the native share sheet.
    await waitFor(() => {
      expect(props().shareLinkUrl).toContain('rotated-token');
    });
    expect(props().copyShareLinkLabel).toBe('Share link');
    await act(async () => {
      props().onCopyShareLink?.();
    });
    expect(Share.share).toHaveBeenCalled();
    expect(onActionMessage).not.toHaveBeenCalledWith('Share link copied');
  });

  test('ignores rotate responses without a share token', async () => {
    mockRotateShareToken.mockResolvedValue(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    const {props} = await renderSharingProps(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    await act(async () => {
      props().onRotateShareLink?.();
    });
    await waitFor(() => {
      expect(mockRotateShareToken).toHaveBeenCalled();
    });
    expect(props().shareLinkUrl).toBeNull();
    expect(props().onCopyShareLink).toBeUndefined();
  });

  test('shows public permalink actions', async () => {
    const {props} = await renderSharingProps(
      makeRecipeDetail({visibility: 'public'}),
    );
    expect(props().permalinkLabel).toBe('Public permalink');
    expect(props().permalinkUrl).toBeTruthy();
    expect(props().copyPermalinkLabel).toBe('Share permalink');
    await act(async () => {
      props().onCopyPermalink?.();
    });
    expect(Share.share).toHaveBeenCalled();
  });
});
