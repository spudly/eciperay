import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Linking, Share} from 'react-native';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {api} from '../../lib/api';

import {RecipeVisibilityControls} from './RecipeVisibilityControls';

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));
jest.spyOn(Share, 'share').mockResolvedValue({action: 'sharedAction'});

jest.mock('../../lib/api', () => ({
  api: {recipes: {patchSharing: jest.fn(), rotateShareToken: jest.fn()}},
}));

const mockPatchSharing = jest.mocked(api.recipes.patchSharing);
const mockRotateShareToken = jest.mocked(api.recipes.rotateShareToken);

const renderControls = (recipe = makeRecipeDetail()) => {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  const onActionMessage = jest.fn();
  render(
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

  test('renders sharing options', () => {
    renderControls();
    expect(screen.getByText('Sharing')).toBeTruthy();
    expect(screen.getByText('Private')).toBeTruthy();
    expect(screen.getByText('Public')).toBeTruthy();
  });

  test('requires consent before saving a first publish', () => {
    renderControls();
    fireEvent.press(screen.getByText('Unlisted link'));
    fireEvent.press(screen.getByText('Save sharing settings'));
    expect(screen.getByText(/Privacy Policy/i)).toBeTruthy();
    expect(mockPatchSharing).not.toHaveBeenCalled();
  });

  test('saves visibility after publishing consent', async () => {
    const {onActionMessage} = renderControls();
    fireEvent.press(screen.getByText('Unlisted link'));
    fireEvent(screen.getByLabelText('Publishing consent'), 'valueChange', true);
    fireEvent.press(screen.getByText('Save sharing settings'));
    await waitFor(() => {
      expect(mockPatchSharing).toHaveBeenCalled();
    });
    expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
  });

  test('rotates share links for unlisted recipes', async () => {
    const {onActionMessage} = renderControls(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    fireEvent.press(screen.getByText('Generate share link'));
    await waitFor(() => {
      expect(mockRotateShareToken).toHaveBeenCalled();
    });
    expect(onActionMessage).toHaveBeenCalledWith('Share link rotated');
  });

  test('shows public permalink actions', async () => {
    renderControls(makeRecipeDetail({visibility: 'public'}));
    fireEvent.press(screen.getByText('Share permalink'));
    expect(Share.share).toHaveBeenCalled();
  });

  test('opens the privacy policy from consent copy', () => {
    renderControls();
    fireEvent.press(screen.getByText('Unlisted link'));
    fireEvent.press(screen.getByText('Privacy Policy', {exact: false}));
    expect(Linking.openURL).toHaveBeenCalled();
  });

  test('shares unlisted links after a token is generated', async () => {
    const {onActionMessage} = renderControls(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    fireEvent.press(screen.getByText('Generate share link'));
    await waitFor(() => {
      expect(screen.getByText('Share link')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Share link'));
    expect(Share.share).toHaveBeenCalled();
    expect(onActionMessage).not.toHaveBeenCalledWith('Share link copied');
  });

  test('shows public warning before saving', () => {
    renderControls();
    fireEvent.press(screen.getByText('Public'));
    expect(
      screen.getByText(/This recipe will be discoverable by anyone/i),
    ).toBeTruthy();
  });

  test('can switch back to private visibility', async () => {
    mockPatchSharing.mockResolvedValue(
      makeRecipeDetail({visibility: 'private'}),
    );
    const {onActionMessage} = renderControls(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    fireEvent.press(screen.getByText('Private'));
    fireEvent.press(screen.getByText('Save sharing settings'));
    await waitFor(() => {
      expect(mockPatchSharing).toHaveBeenCalled();
    });
    expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
  });

  test('ignores rotate responses without a share token', async () => {
    mockRotateShareToken.mockResolvedValue(
      makeRecipeDetail({visibility: 'unlisted'}),
    );
    renderControls(makeRecipeDetail({visibility: 'unlisted'}));
    fireEvent.press(screen.getByText('Generate share link'));
    await waitFor(() => {
      expect(mockRotateShareToken).toHaveBeenCalled();
    });
    expect(screen.queryByText('Share link')).toBeNull();
  });
});
