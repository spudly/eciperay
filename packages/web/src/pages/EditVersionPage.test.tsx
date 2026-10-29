import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {makeRecipeVersionDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {EditVersionPage} from './EditVersionPage.js';

const renderEditVersion = (versionId = 'version-draft-1') =>
  renderWithProviders(
    <Routes>
      <Route
        path="/recipes/:recipeId/versions/:versionId/edit"
        element={<EditVersionPage />}
      />
      <Route
        path="/recipes/:recipeId"
        element={<div>Saved</div>}
      />
    </Routes>,
    {route: `/recipes/recipe-uuid-1/versions/${versionId}/edit`},
  );

// The design system form labels its title input "Title"; in jsdom the
// label lands in the accessibilitylabel attribute rather than an ARIA
// role/name (the same leak the TagsPage tests work around).
const titleField = () =>
  document.querySelector<HTMLInputElement>('[accessibilitylabel="Title"]');

describe('EditVersionPage', () => {
  test('blocks editing non-draft versions', async () => {
    await renderEditVersion('version-uuid-1');
    expect(
      await screen.findByText('This version can no longer be edited.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText('Back to recipe'));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  test('loads and saves draft versions', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId',
        () =>
          HttpResponse.json(
            makeRecipeVersionDetail({
              id: 'version-draft-1',
              derivedRole: 'draft',
              isEditable: true,
              versionNumber: 2,
              changeSummary: 'Manual tweak',
            }),
          ),
      ),
    );
    await renderEditVersion();
    await waitFor(() => {
      expect(screen.getByText('Edit Draft (v2)')).toBeInTheDocument();
      expect(screen.getByText('Manual tweak')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Save Draft'));
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  test('renders draft editor without a change summary', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId',
        () =>
          HttpResponse.json(
            makeRecipeVersionDetail({
              id: 'version-draft-1',
              derivedRole: 'draft',
              isEditable: true,
              versionNumber: 2,
              changeSummary: null,
            }),
          ),
      ),
    );
    await renderEditVersion();
    await waitFor(() => {
      expect(screen.getByText('Edit Draft (v2)')).toBeInTheDocument();
    });
    expect(screen.queryByText('Manual tweak')).not.toBeInTheDocument();
  });

  test('shows import review banner for import review drafts', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId',
        ({params}) => {
          if (params['versionId'] === 'version-draft-1') {
            return HttpResponse.json(
              makeRecipeVersionDetail({
                id: 'version-draft-1',
                derivedFromVersionId: 'version-uuid-1',
                derivedRole: 'draft',
                isEditable: true,
                versionNumber: 2,
                createdVia: 'import_review',
              }),
            );
          }
          return HttpResponse.json(
            makeRecipeVersionDetail({id: 'version-uuid-1', versionNumber: 1}),
          );
        },
      ),
    );
    await renderEditVersion();
    expect(
      await screen.findByText(/Editing draft \(v2\) based on imported v1/),
    ).toBeInTheDocument();
  });

  test('loads parent version for diff UI when editing a derived draft', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId',
        ({params}) => {
          if (params['versionId'] === 'version-draft-1') {
            return HttpResponse.json(
              makeRecipeVersionDetail({
                id: 'version-draft-1',
                derivedFromVersionId: 'version-uuid-1',
                derivedRole: 'draft',
                isEditable: true,
                versionNumber: 2,
                title: 'Changed draft title',
              }),
            );
          }
          return HttpResponse.json(
            makeRecipeVersionDetail({
              id: 'version-uuid-1',
              title: 'Parent title',
            }),
          );
        },
      ),
    );
    await renderEditVersion();
    await waitFor(() => {
      expect(titleField()).toHaveValue('Changed draft title');
    });
    // The "Revert to:" action renders only after the parent-version
    // query resolves (a second request, after the draft query that
    // fills the Title field), so assert asynchronously — the previous
    // synchronous assertion raced that query and flaked under load.
    // The design system renders the action as a pressable view whose
    // role leaks as a raw attribute in jsdom, so match its text.
    expect(await screen.findByText(/Revert to:/)).toBeInTheDocument();
  });
});
