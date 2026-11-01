import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {delay, http, HttpResponse} from 'msw';

import {applyTagsPatch, resetTagsFixture} from '../test/msw/handlers.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {TagsPage} from './TagsPage.js';

const API = 'http://localhost:8080';

describe('TagsPage', () => {
  beforeEach(() => {
    // The mock tags API is stateful; start each test from the defaults.
    resetTagsFixture();
  });

  test('lists, creates, and deletes tags', async () => {
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText('Tag name'), 'Lunch');
    await userEvent.click(screen.getByText('Add'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tag name')).toHaveValue('');
    });
    const deleteButtons = screen.getAllByText('Delete');
    await userEvent.click(deleteButtons[0]!);
  });

  test('renames a tag in place through the inline edit form', async () => {
    // Capture the PATCH body: a rename-only save must send the name
    // and no color key, so the stored color survives untouched.
    let patchBody: {name?: string; color?: string} | undefined;
    server.use(
      http.patch(`${API}/api/tags/:id`, async ({request, params}) => {
        patchBody = (await request.json()) as {name?: string; color?: string};
        const updated = applyTagsPatch(String(params['id']), patchBody);
        if (!updated) {
          return HttpResponse.json({error: 'Tag not found'}, {status: 404});
        }
        return HttpResponse.json(updated);
      }),
    );
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Quick')).toBeInTheDocument();
    });
    // Rows render in list order: Dinner first, Quick second. Quick is
    // the tag the mock API lets the caller update (PATCH 404s others).
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[1]!);
    // The edit form is seeded from the tag: its current name in the
    // field and its current color (green) pressed among the swatches
    // (the second green swatch — the first belongs to the create form).
    const editField = screen.getByDisplayValue('Quick');
    const greenSwatches = screen.getAllByRole('button', {
      name: 'Select color green',
    });
    expect(greenSwatches).toHaveLength(2);
    expect(greenSwatches[1]).toHaveAttribute('aria-pressed', 'true');
    await userEvent.clear(editField);
    await userEvent.type(editField, 'Fast');
    await userEvent.click(screen.getByRole('button', {name: 'Save'}));
    // A successful save closes the edit form (a failed PATCH would
    // leave it open, since only onSuccess clears the edit state).
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {name: 'Save'}),
      ).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Edit')).toHaveLength(2);
    // The tags refetch after the save shows the renamed tag (the mock
    // API persists the PATCH, like the real one).
    expect(await screen.findByText('Fast')).toBeInTheDocument();
    expect(screen.queryByText('Quick')).not.toBeInTheDocument();
    expect(patchBody).toEqual({name: 'Fast'});
  });

  test('saving an unchanged edit sends no update and closes the editor', async () => {
    let patchBody: {name?: string; color?: string} | undefined;
    server.use(
      http.patch(`${API}/api/tags/:id`, async ({request, params}) => {
        patchBody = (await request.json()) as {name?: string; color?: string};
        const updated = applyTagsPatch(String(params['id']), patchBody);
        if (!updated) {
          return HttpResponse.json({error: 'Tag not found'}, {status: 404});
        }
        return HttpResponse.json(updated);
      }),
    );
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Quick')).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[1]!);
    await userEvent.click(screen.getByRole('button', {name: 'Save'}));
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {name: 'Save'}),
      ).not.toBeInTheDocument();
    });
    expect(patchBody).toBeUndefined();
  });

  test('ignores edit starts while a save is pending', async () => {
    server.use(
      http.patch(`${API}/api/tags/:id`, async () => {
        await delay(600);
        return HttpResponse.json({
          id: 'tag-2',
          userId: 'user-uuid-1',
          name: 'Fast',
          color: '#22c55e',
          isPreset: false,
        });
      }),
    );
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Quick')).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[1]!);
    const editField = screen.getByDisplayValue('Quick');
    await userEvent.clear(editField);
    await userEvent.type(editField, 'Fast');
    await userEvent.click(screen.getByRole('button', {name: 'Save'}));
    // The save is in flight (the mock PATCH takes 600 ms). Starting
    // another row's edit now is ignored, so the pending draft is not
    // discarded when the save lands.
    const remainingEditButtons = screen.getAllByText('Edit');
    await userEvent.click(remainingEditButtons[0]!);
    expect(screen.getByDisplayValue('Fast')).toBeInTheDocument();
    await waitFor(
      () => {
        expect(
          screen.queryByRole('button', {name: 'Save'}),
        ).not.toBeInTheDocument();
      },
      {timeout: 3000},
    );
  });

  test('recolors a tag through the inline edit form', async () => {
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Quick')).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[1]!);
    // Pick red in the edit form (the second red swatch — the first
    // belongs to the create form) and save without renaming.
    const redSwatches = screen.getAllByRole('button', {
      name: 'Select color red',
    });
    expect(redSwatches).toHaveLength(2);
    await userEvent.click(redSwatches[1]!);
    await userEvent.click(screen.getByRole('button', {name: 'Save'}));
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {name: 'Save'}),
      ).not.toBeInTheDocument();
    });
    // Reopening the editor shows the persisted color: red is now the
    // pressed swatch for Quick.
    const editButtonsAfter = screen.getAllByText('Edit');
    await userEvent.click(editButtonsAfter[1]!);
    expect(screen.getByDisplayValue('Quick')).toBeInTheDocument();
    const redSwatchesAfter = screen.getAllByRole('button', {
      name: 'Select color red',
    });
    expect(redSwatchesAfter[1]).toHaveAttribute('aria-pressed', 'true');
  });

  test('cancelling an edit discards the draft', async () => {
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[0]!);
    const editField = screen.getByDisplayValue('Dinner');
    await userEvent.clear(editField);
    await userEvent.type(editField, 'Supper');
    await userEvent.click(screen.getByRole('button', {name: 'Cancel'}));
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {name: 'Save'}),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Supper')).not.toBeInTheDocument();
  });

  test('ignores empty tag name and updates color', async () => {
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });
    // The design system color picker renders its swatches as buttons
    // labelled "Select color <name>" — @spudly/ui 1.15 names colors by
    // their TagColorName (this swatch was "#ef4444" before the bump)
    // and lands the label in a real aria-label.
    const swatch = () => screen.getByRole('button', {name: 'Select color red'});
    expect(swatch()).toBeInTheDocument();
    await userEvent.click(swatch());
    expect(swatch()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: 'Add'})).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByPlaceholderText('Tag name')).toHaveValue('');
  });
});
