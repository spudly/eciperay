import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {server} from '../../test/msw/server.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeVisibilityControls} from './RecipeVisibilityControls.js';

const API = 'http://localhost:8080';

describe('RecipeVisibilityControls', () => {
  test('updates visibility after publishing consent', async () => {
    const onActionMessage = vi.fn();
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

    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail()}
        onActionMessage={onActionMessage}
      />,
    );

    await userEvent.click(screen.getByLabelText(/Unlisted link/i));
    await userEvent.click(
      screen.getByRole('checkbox', {name: 'Publishing consent'}),
    );
    await userEvent.click(screen.getByText('Save sharing settings'));

    expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
    expect(screen.getByText('Copy share link')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Copy share link'));
    expect(onActionMessage).toHaveBeenCalledWith('Share link copied');
  });

  test('surfaces a rejected sharing change and clears the pending selection (#418)', async () => {
    const onActionMessage = vi.fn();
    server.use(
      http.patch(`${API}/api/recipes/:id/sharing`, () =>
        HttpResponse.json(
          {error: 'Recipe cannot be modified in its current status'},
          {status: 409},
        ),
      ),
    );

    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail()}
        onActionMessage={onActionMessage}
      />,
    );

    await userEvent.click(screen.getByLabelText(/Unlisted link/i));
    await userEvent.click(
      screen.getByRole('checkbox', {name: 'Publishing consent'}),
    );
    await userEvent.click(screen.getByText('Save sharing settings'));

    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith(
        'Could not update sharing settings: Recipe cannot be modified in its current status',
      );
    });
    // The failed change is not left looking saved: the pending selection
    // (and its Save button) is gone, matching the server's visibility.
    await waitFor(() => {
      expect(
        screen.queryByText('Save sharing settings'),
      ).not.toBeInTheDocument();
    });
  });

  test('surfaces a rejected share-link rotation (#418)', async () => {
    const onActionMessage = vi.fn();
    server.use(
      http.post(`${API}/api/recipes/:id/sharing/rotate-token`, () =>
        HttpResponse.json(
          {error: 'Recipe cannot be modified in its current status'},
          {status: 409},
        ),
      ),
    );

    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail({visibility: 'unlisted'})}
        onActionMessage={onActionMessage}
      />,
    );

    await userEvent.click(screen.getByText('Generate share link'));
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith(
        'Could not rotate the share link: Recipe cannot be modified in its current status',
      );
    });
    expect(onActionMessage).not.toHaveBeenCalledWith('Share link rotated');
  });

  test('shows public warning and permalink copy for public recipes', async () => {
    const onActionMessage = vi.fn();
    const writeText = vi.fn().mockImplementation(() => Promise.resolve());
    Object.assign(navigator, {clipboard: {writeText}});

    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail({visibility: 'public'})}
        onActionMessage={onActionMessage}
      />,
    );

    expect(screen.getByText(/\/recipe\/recipe-uuid-1\//)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Copy'));
    expect(writeText).toHaveBeenCalled();
    expect(onActionMessage).toHaveBeenCalledWith('Permalink copied');
  });

  test('rotates share links for unlisted recipes', async () => {
    const onActionMessage = vi.fn();
    server.use(
      http.post(`${API}/api/recipes/:id/sharing/rotate-token`, () =>
        HttpResponse.json({
          ...makeRecipeDetail({visibility: 'unlisted'}),
          shareToken: 'rotated-token',
        }),
      ),
    );

    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail({visibility: 'unlisted'})}
        onActionMessage={onActionMessage}
      />,
    );

    await userEvent.click(screen.getByText('Generate share link'));
    expect(onActionMessage).toHaveBeenCalledWith('Share link rotated');
    expect(screen.getByText('Rotate share link')).toBeInTheDocument();
  });

  test('blocks save when publishing consent is missing', async () => {
    let called = false;
    server.use(
      http.patch(`${API}/api/recipes/:id/sharing`, () => {
        called = true;
        return HttpResponse.json(makeRecipeDetail({visibility: 'unlisted'}));
      }),
    );

    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail()}
        onActionMessage={() => {}}
      />,
    );

    await userEvent.click(screen.getByLabelText(/Unlisted link/i));
    // The save control is disabled until consent is given (a click on a
    // disabled DS Button's label is not even dispatchable — its content
    // renders pointer-events: none), and no request is made.
    expect(
      screen.getByRole('button', {name: 'Save sharing settings'}),
    ).toBeDisabled();
    expect(called).toBe(false);
    // The save handler's own consent guard is exercised separately in
    // RecipeVisibilityControls.guard.test.tsx — the real DS Button
    // suppresses activation while disabled, so no click dispatched to
    // it here can reach the handler.
  });

  test('can return a recipe to private visibility', async () => {
    const onActionMessage = vi.fn();
    server.use(
      http.patch(`${API}/api/recipes/:id/sharing`, () =>
        HttpResponse.json(makeRecipeDetail({visibility: 'private'})),
      ),
    );

    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail({visibility: 'unlisted'})}
        onActionMessage={onActionMessage}
      />,
    );

    await userEvent.click(screen.getByLabelText(/Private/i));
    await userEvent.click(screen.getByText('Save sharing settings'));
    expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
    expect(screen.queryByText('Generate share link')).not.toBeInTheDocument();
  });

  test('updates visibility without consent after first publish', async () => {
    const onActionMessage = vi.fn();
    server.use(
      http.patch(`${API}/api/recipes/:id/sharing`, () =>
        HttpResponse.json(makeRecipeDetail({visibility: 'public'})),
      ),
    );

    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail({visibility: 'unlisted'})}
        onActionMessage={onActionMessage}
      />,
    );

    await userEvent.click(screen.getByLabelText(/Public/i));
    await userEvent.click(screen.getByText('Save sharing settings'));
    expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
  });

  test('shows public warning before saving', async () => {
    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail()}
        onActionMessage={() => {}}
      />,
    );

    await userEvent.click(screen.getByLabelText(/Public/i));
    expect(
      screen.getByText(/This recipe will be discoverable by anyone/i),
    ).toBeInTheDocument();
  });
});
