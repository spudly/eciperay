import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {server} from '../../test/msw/server.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeVisibilityControls} from './RecipeVisibilityControls.js';

/**
 * The save handler's consent guard, exercised in isolation. The real
 * DS Button suppresses activation while disabled, so no click
 * dispatched to it can reach the handler — the guard (the second line
 * of defense behind the disabled state) is only observable through a
 * Button double that always dispatches onPress, the way a
 * non-suppressing pressable would.
 */
vi.mock('@spudly/ui', async importOriginal => {
  const actual = await importOriginal<typeof import('@spudly/ui')>();
  const React = await import('react');
  type DoubleProps = {
    onPress?: () => void;
    children?: React.ReactNode;
  };
  const ButtonDouble = ({onPress, children}: DoubleProps) =>
    React.createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          onPress?.();
        },
      },
      children,
    );
  return {...actual, Button: ButtonDouble};
});

const API = 'http://localhost:8080';

describe('RecipeVisibilityControls save-handler consent guard', () => {
  test('does not publish when the handler is invoked without consent', async () => {
    let called = false;
    server.use(
      http.patch(`${API}/api/recipes/:id/sharing`, () => {
        called = true;
        return HttpResponse.json(makeRecipeDetail({visibility: 'unlisted'}));
      }),
    );
    // Observe the mutation itself, not only its downstream handler.
    const patchSharing = vi.spyOn(eciperay.recipes, 'patchSharing');

    await renderWithProviders(
      <RecipeVisibilityControls
        recipe={makeRecipeDetail()}
        onActionMessage={() => {}}
      />,
    );

    await userEvent.click(screen.getByLabelText(/Unlisted link/i));
    await userEvent.click(screen.getByText('Save sharing settings'));
    // Let any asynchronous save work settle before asserting none ran.
    await new Promise(resolve => {
      setTimeout(resolve, 100);
    });
    expect(patchSharing).not.toHaveBeenCalled();
    expect(called).toBe(false);
    patchSharing.mockRestore();
  });

  test('publishes through the double once consent is given', async () => {
    const onActionMessage = vi.fn();
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
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith(
        'Sharing settings updated',
      );
    });
  });
});
