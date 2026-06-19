import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {makeRecipeVersionSummary} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {VersionPicker} from './VersionPicker.js';

describe('VersionPicker', () => {
  test('shows version number when only one version exists', async () => {
    await renderWithProviders(
      <VersionPicker
        recipeId="recipe-uuid-1"
        versions={[makeRecipeVersionSummary()]}
        selectedVersionId="version-uuid-1"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Version 1')).toBeInTheDocument();
  });

  test('renders a select when multiple versions exist', async () => {
    const onSelect = vi.fn();
    await renderWithProviders(
      <VersionPicker
        recipeId="recipe-uuid-1"
        versions={[
          makeRecipeVersionSummary(),
          makeRecipeVersionSummary({
            id: 'version-uuid-2',
            versionNumber: 2,
            derivedRole: 'draft',
            changeSummary: 'More spice',
          }),
        ]}
        selectedVersionId="version-uuid-1"
        onSelect={onSelect}
      />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    await userEvent.selectOptions(select, 'version-uuid-2');
    expect(onSelect).toHaveBeenCalledWith('version-uuid-2');
  });

  test('fetches versions from the API', async () => {
    await renderWithProviders(
      <VersionPicker
        recipeId="recipe-uuid-1"
        versions={[]}
        selectedVersionId="version-uuid-1"
        onSelect={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Version 1')).toBeInTheDocument();
    });
  });
});
