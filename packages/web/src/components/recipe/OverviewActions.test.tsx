import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
} from '../../test/fixtures/recipe.js';
import {eciperay} from '../../lib/api.js';
import {server} from '../../test/msw/server.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {OverviewActions} from './OverviewActions.js';

describe('OverviewActions', () => {
  test('shows tweak actions for editable recipes', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <OverviewActions
              recipe={makeRecipeDetail()}
              versions={[makeRecipeVersionSummary()]}
              onActionMessage={() => {}}
            />
          }
        />
      </Routes>,
      {route: '/'},
    );
    expect(screen.getByText('Tweak manually')).toBeInTheDocument();
    expect(screen.getByText('Tweak with AI')).toBeInTheDocument();
  });

  test('renders nothing for abandoned recipes without candidates', async () => {
    const {container} = await renderWithProviders(
      <OverviewActions
        recipe={makeRecipeDetail({status: 'abandoned'})}
        versions={[]}
        onActionMessage={() => {}}
      />,
    );
    // TamaguiProvider renders theme context wrappers, so assert on empty text
    // content rather than an empty container.
    expect(container.textContent).toBe('');
  });

  test('offers only create-draft for perfected recipes without candidates', async () => {
    await renderWithProviders(
      <OverviewActions
        recipe={makeRecipeDetail({status: 'perfected'})}
        versions={[]}
        onActionMessage={() => {}}
      />,
    );
    expect(screen.getByText('Create draft')).toBeInTheDocument();
    expect(screen.queryByText('Tweak manually')).not.toBeInTheDocument();
    expect(screen.queryByText('Tweak with AI')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark perfected')).not.toBeInTheDocument();
    expect(screen.queryByText('Abandon')).not.toBeInTheDocument();
  });

  test('hides create draft when a non-active version is displayed', async () => {
    await renderWithProviders(
      <OverviewActions
        recipe={makeRecipeDetail({status: 'perfected', versionId: 'v-old'})}
        versions={[]}
        onActionMessage={() => {}}
        activeVersionId="version-uuid-1"
      />,
    );
    expect(screen.queryByText('Create draft')).not.toBeInTheDocument();
  });

  test('create draft opens the new draft in the version editor', async () => {
    server.use(
      http.post('http://localhost:8080/api/recipes/:id/versions', () =>
        HttpResponse.json(
          makeRecipeVersionSummary({
            id: 'version-draft-1',
            versionNumber: 2,
            derivedRole: 'draft',
            isEditable: true,
            childVersionCount: 0,
          }),
          {status: 201},
        ),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <OverviewActions
              recipe={makeRecipeDetail({status: 'perfected'})}
              versions={[]}
              onActionMessage={() => {}}
            />
          }
        />
        <Route
          path="/recipes/:recipeId/versions/:versionId/edit"
          element={<div>Edit draft page</div>}
        />
      </Routes>,
      {route: '/'},
    );
    await userEvent.click(screen.getByText('Create draft'));
    expect(await screen.findByText('Edit draft page')).toBeInTheDocument();
  });

  test('shows only candidates for perfected recipes', async () => {
    await renderWithProviders(
      <OverviewActions
        recipe={makeRecipeDetail({status: 'perfected'})}
        versions={[
          makeRecipeVersionSummary({
            id: 'v2',
            versionNumber: 2,
            derivedRole: 'candidate',
          }),
        ]}
        onActionMessage={() => {}}
      />,
    );
    expect(screen.queryByText('Tweak manually')).not.toBeInTheDocument();
    expect(screen.getByText('Create draft')).toBeInTheDocument();
    expect(screen.getByText('Activate')).toBeInTheDocument();
  });

  test('activates candidate versions', async () => {
    const onActionMessage = vi.fn();
    const activate = vi
      .spyOn(eciperay.versions, 'activate')
      .mockResolvedValueOnce(makeRecipeDetail());
    await renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <OverviewActions
              recipe={makeRecipeDetail()}
              versions={[
                makeRecipeVersionSummary({
                  id: 'v2',
                  versionNumber: 2,
                  derivedRole: 'candidate',
                  changeSummary: 'More spice',
                }),
              ]}
              onActionMessage={onActionMessage}
            />
          }
        />
      </Routes>,
      {route: '/'},
    );
    await userEvent.click(screen.getByText('Activate'));
    expect(activate).toHaveBeenCalledWith('recipe-uuid-1', 'v2');
    expect(onActionMessage).toHaveBeenCalledWith('Version activated');
  });

  test('marks recipe perfected and abandoned', async () => {
    const patchStatus = vi
      .spyOn(eciperay.recipes, 'patchStatus')
      .mockResolvedValue(makeRecipeDetail());
    await renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <OverviewActions
              recipe={makeRecipeDetail()}
              versions={[]}
              onActionMessage={() => {}}
            />
          }
        />
      </Routes>,
      {route: '/'},
    );
    await userEvent.click(screen.getByText('Mark perfected'));
    await userEvent.click(screen.getByText('Abandon'));
    expect(patchStatus).toHaveBeenCalledWith('recipe-uuid-1', 'perfected');
    expect(patchStatus).toHaveBeenCalledWith('recipe-uuid-1', 'abandoned');
  });

  test('creates a manual draft version', async () => {
    server.use(
      http.post('http://localhost:8080/api/recipes/:id/versions', () =>
        HttpResponse.json(
          makeRecipeVersionSummary({
            id: 'version-draft-1',
            versionNumber: 2,
            derivedRole: 'draft',
            isEditable: true,
            childVersionCount: 0,
          }),
          {status: 201},
        ),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <OverviewActions
              recipe={makeRecipeDetail()}
              versions={[]}
              onActionMessage={() => {}}
            />
          }
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Recipe detail</div>}
        />
      </Routes>,
      {route: '/'},
    );
    await userEvent.click(screen.getByText('Tweak manually'));
    expect(await screen.findByText('Recipe detail')).toBeInTheDocument();
  });
});
