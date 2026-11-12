import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {server} from '../../test/msw/server.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeVisibilityControls} from './RecipeVisibilityControls.js';

// #460 tranche 1: the former RecipeVisibilityControls.guard.test.tsx
// is merged below. It replaced the DS Button with a double that
// always dispatches onPress; the canonical tests need the real
// Button, so the mock below swaps in the double only while the
// hoisted flag is set (the guard describe sets it in beforeEach).
const buttonDoubleState = vi.hoisted(() => ({enabled: false}));

vi.mock('@spudly/ui', async importOriginal => {
  const actual = await importOriginal<typeof import('@spudly/ui')>();
  const React = await import('react');
  type DoubleProps = {onPress?: () => void; children?: React.ReactNode};
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
  // @spudly/ui no longer exports a Button (the controls in this
  // tree are native elements now); where an actual Button exists it
  // is used whenever the double is not enabled.
  const ActualButton = (actual as Record<string, unknown>)['Button'] as
    React.ComponentType<DoubleProps & Record<string, unknown>> | undefined;
  const Button = (props: DoubleProps & Record<string, unknown>) =>
    buttonDoubleState.enabled || !ActualButton
      ? React.createElement(ButtonDouble, props)
      : React.createElement(ActualButton, props);
  return {...actual, Button};
});

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
    // Retrying the change starts from a clean slate: the consent given
    // for the rejected attempt was cleared along with the selection.
    await userEvent.click(screen.getByLabelText(/Unlisted link/i));
    expect(
      screen.getByRole('checkbox', {name: 'Publishing consent'}),
    ).not.toBeChecked();
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
    // the guard describe below — the real DS Button suppresses
    // activation while disabled, so no click dispatched to it here
    // can reach the handler.
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

// Former RecipeVisibilityControls.guard.test.tsx.
/**
 * The save handler's consent guard, exercised in isolation. The real DS Button
 * suppresses activation while disabled, so no click dispatched to it can reach
 * the handler — the guard (the second line of defense behind the disabled
 * state) is only observable through a Button double that always dispatches
 * onPress, the way a non-suppressing pressable would.
 */
describe('RecipeVisibilityControls save-handler consent guard', () => {
  beforeEach(() => {
    buttonDoubleState.enabled = true;
  });

  afterEach(() => {
    buttonDoubleState.enabled = false;
  });

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
      expect(onActionMessage).toHaveBeenCalledWith('Sharing settings updated');
    });
  });
});
