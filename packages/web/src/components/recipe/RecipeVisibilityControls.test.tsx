import {screen} from '@testing-library/react';
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
    await userEvent.click(screen.getByText('Save sharing settings'));
    expect(called).toBe(false);
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
