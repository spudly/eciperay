import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Linking, Share} from 'react-native';

import {renderWithProviders} from '../../__tests__/testUtils';
import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {api} from '../../lib/api';

import {RecipeVisibilityControls} from './RecipeVisibilityControls';

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
jest
  .spyOn(Share, 'share')
  .mockResolvedValue({action: 'sharedAction', activityType: undefined});

jest.mock('../../lib/api', () => ({
  api: {recipes: {patchSharing: jest.fn(), rotateShareToken: jest.fn()}},
}));

const mockPatchSharing = jest.mocked(api.recipes.patchSharing);
const mockRotateShareToken = jest.mocked(api.recipes.rotateShareToken);

const renderControls = async (recipe = makeRecipeDetail()) => {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  const onActionMessage = jest.fn();
  await renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <RecipeVisibilityControls
        recipe={recipe}
        onActionMessage={onActionMessage}
      />
    </QueryClientProvider>,
  );
  return {onActionMessage};
};

describe('RecipeVisibilityControls', () => {
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

  test('renders sharing options', async () => {
    await renderControls();
    expect(screen.getByText('Sharing')).toBeTruthy();
    expect(screen.getByText('Private')).toBeTruthy();
    expect(screen.getByText('Public')).toBeTruthy();
  });

  test('requires consent before saving a first publish', async () => {
    await renderControls();
    await fireEvent.press(screen.getByText('Unlisted link'));
    await fireEvent.press(screen.getByText('Save sharing settings'));
    expect(screen.getByText(/Privacy Policy/i)).toBeTruthy();
    expect(mockPatchSharing).not.toHaveBeenCalled();
  });

  test('saves visibility after publishing consent', async () => {
    const {onActionMessage} = await renderControls();
    await fireEvent.press(screen.getByText('Unlisted link'));
    await fireEvent.press(screen.getByText('Publishing consent'));
    await fireEvent.press(screen.getByText('Save sharing settings'));
    await waitFor(() => {
      expect(mockPatchSharing).toHaveBeenCalled();
    });
    expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
  });

  test('rotates share links for unlisted recipes', async () => {
    const {onActionMessage} = await renderControls(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    await fireEvent.press(screen.getByText('Generate share link'));
    await waitFor(() => {
      expect(mockRotateShareToken).toHaveBeenCalled();
    });
    expect(onActionMessage).toHaveBeenCalledWith('Share link rotated');
  });

  test('shows public permalink actions', async () => {
    await renderControls(makeRecipeDetail({visibility: 'public'}));
    await fireEvent.press(screen.getByText('Share permalink'));
    expect(Share.share).toHaveBeenCalled();
  });

  test('opens the privacy policy from consent copy', async () => {
    await renderControls();
    await fireEvent.press(screen.getByText('Unlisted link'));
    await fireEvent.press(screen.getByText('Privacy Policy', {exact: false}));
    expect(Linking.openURL).toHaveBeenCalled();
  });

  test('shares unlisted links after a token is generated', async () => {
    const {onActionMessage} = await renderControls(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    await fireEvent.press(screen.getByText('Generate share link'));
    await waitFor(() => {
      expect(screen.getByText('Share link')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Share link'));
    expect(Share.share).toHaveBeenCalled();
    expect(onActionMessage).not.toHaveBeenCalledWith('Share link copied');
  });

  test('shows public warning before saving', async () => {
    await renderControls();
    await fireEvent.press(screen.getByText('Public'));
    expect(
      screen.getByText(/This recipe will be discoverable by anyone/i),
    ).toBeTruthy();
  });

  test('can switch back to private visibility', async () => {
    mockPatchSharing.mockResolvedValue(
      makeRecipeDetail({visibility: 'private'}),
    );
    const {onActionMessage} = await renderControls(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    await fireEvent.press(screen.getByText('Private'));
    await fireEvent.press(screen.getByText('Save sharing settings'));
    await waitFor(() => {
      expect(mockPatchSharing).toHaveBeenCalled();
    });
    expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
  });

  test('ignores rotate responses without a share token', async () => {
    mockRotateShareToken.mockResolvedValue(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    await renderControls(makeRecipeDetail({visibility: 'unlisted'}));
    await fireEvent.press(screen.getByText('Generate share link'));
    await waitFor(() => {
      expect(mockRotateShareToken).toHaveBeenCalled();
    });
    expect(screen.queryByText('Share link')).toBeNull();
  });
});
