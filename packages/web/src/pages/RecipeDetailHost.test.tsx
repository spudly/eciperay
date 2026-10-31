import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {useState} from 'react';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';

import {eciperay} from '../lib/api.js';
import {
  makeCookLog,
  makeRecipeDetail,
  makeRecipeVersionSummary,
} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {RecipeDetailHost} from './RecipeDetailHost.js';

/**
 * The page's stateful shell, minus its queries: servings and version
 * selection live here exactly as the page holds them, so version
 * switches and scaling flow through the host the way they do in the
 * page.
 */
const Harness = ({
  recipe,
  versions,
}: {
  recipe: RecipeDetail;
  versions: RecipeVersionSummary[];
}) => {
  const [servings, setServings] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState(recipe.versionId);
  const displayRecipe =
    selectedVersionId === recipe.versionId
      ? recipe
      : {...recipe, versionId: selectedVersionId};
  const currentServings = servings ?? displayRecipe.servings;

  return (
    <RecipeDetailHost
      recipe={recipe}
      displayRecipe={displayRecipe}
      versions={versions}
      selectedVersionId={selectedVersionId}
      onSelectVersion={setSelectedVersionId}
      currentServings={currentServings}
      scaleFactor={currentServings / displayRecipe.servings}
      onServingsChange={setServings}
    />
  );
};

const renderHost = async (
  overrides: Partial<RecipeDetail> = {},
  versions: RecipeVersionSummary[] = [makeRecipeVersionSummary()],
) => {
  const recipe = makeRecipeDetail(overrides);
  const utils = await renderWithProviders(
    <Harness
      recipe={recipe}
      versions={versions}
    />,
  );
  return {recipe, ...utils};
};

describe('RecipeDetailHost', () => {
  describe('lifecycle actions', () => {
    test('shows tweak actions for editable recipes', async () => {
      await renderHost();
      expect(await screen.findByText('Tweak manually')).toBeInTheDocument();
      expect(screen.getByText('Tweak with AI')).toBeInTheDocument();
    });

    test('hides the lifecycle section for abandoned recipes without candidates', async () => {
      await renderHost({status: 'abandoned'}, []);
      expect(await screen.findByText('Test Recipe')).toBeInTheDocument();
      expect(screen.queryByText('Tweak manually')).not.toBeInTheDocument();
      expect(screen.queryByText('Tweak with AI')).not.toBeInTheDocument();
    });

    test('activates candidate versions and shows the action message', async () => {
      const activate = vi
        .spyOn(eciperay.versions, 'activate')
        .mockResolvedValue(makeRecipeDetail());
      await renderHost({}, [
        makeRecipeVersionSummary({
          id: 'v2',
          versionNumber: 2,
          derivedRole: 'candidate',
          changeSummary: 'More spice',
        }),
      ]);
      await userEvent.click(await screen.findByText('Activate'));
      expect(activate).toHaveBeenCalledWith('recipe-uuid-1', 'v2');
      expect(await screen.findByText('Version activated')).toBeInTheDocument();
    });

    test('marks recipe perfected and abandoned', async () => {
      const patchStatus = vi
        .spyOn(eciperay.recipes, 'patchStatus')
        .mockResolvedValue(makeRecipeDetail());
      await renderHost();
      await userEvent.click(await screen.findByText('Mark perfected'));
      await userEvent.click(screen.getByText('Abandon'));
      expect(patchStatus).toHaveBeenCalledWith('recipe-uuid-1', 'perfected');
      expect(patchStatus).toHaveBeenCalledWith('recipe-uuid-1', 'abandoned');
    });

    test('tweak manually creates a version and selects it', async () => {
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
      const onSelectVersion = vi.fn();
      const recipe = makeRecipeDetail();
      await renderWithProviders(
        <RecipeDetailHost
          recipe={recipe}
          displayRecipe={recipe}
          versions={[makeRecipeVersionSummary()]}
          selectedVersionId={recipe.versionId}
          onSelectVersion={onSelectVersion}
          currentServings={recipe.servings}
          scaleFactor={1}
          onServingsChange={() => {}}
        />,
      );
      await userEvent.click(await screen.findByText('Tweak manually'));
      await waitFor(() => {
        expect(onSelectVersion).toHaveBeenCalledWith('version-draft-1');
      });
    });
  });

  describe('create-a-draft (#264)', () => {
    test('offers only the create-draft action for perfected recipes without candidates', async () => {
      await renderHost({status: 'perfected'}, []);
      expect(await screen.findByText('Edit draft')).toBeInTheDocument();
      expect(screen.queryByText('Tweak manually')).not.toBeInTheDocument();
      expect(screen.queryByText('Tweak with AI')).not.toBeInTheDocument();
      expect(screen.queryByText('Mark perfected')).not.toBeInTheDocument();
      expect(screen.queryByText('Abandon')).not.toBeInTheDocument();
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
      const recipe = makeRecipeDetail({status: 'perfected'});
      await renderWithProviders(
        <Routes>
          <Route
            path="/"
            element={
              <RecipeDetailHost
                recipe={recipe}
                displayRecipe={recipe}
                versions={[makeRecipeVersionSummary()]}
                selectedVersionId={recipe.versionId}
                onSelectVersion={() => {}}
                currentServings={recipe.servings}
                scaleFactor={1}
                onServingsChange={() => {}}
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
      await userEvent.click(await screen.findByText('Edit draft'));
      expect(await screen.findByText('Edit draft page')).toBeInTheDocument();
    });

    test('hides create draft when a non-active version is displayed', async () => {
      const recipe = makeRecipeDetail({status: 'perfected'});
      const displayRecipe = makeRecipeDetail({
        status: 'perfected',
        versionId: 'v-old',
      });
      await renderWithProviders(
        <RecipeDetailHost
          recipe={recipe}
          displayRecipe={displayRecipe}
          versions={[makeRecipeVersionSummary()]}
          selectedVersionId="v-old"
          onSelectVersion={() => {}}
          currentServings={displayRecipe.servings}
          scaleFactor={1}
          onServingsChange={() => {}}
        />,
      );
      expect(await screen.findByText('Test Recipe')).toBeInTheDocument();
      expect(screen.queryByText('Edit draft')).not.toBeInTheDocument();
    });

    test('shows candidates alongside create draft for perfected recipes', async () => {
      await renderHost({status: 'perfected'}, [
        makeRecipeVersionSummary({
          id: 'v2',
          versionNumber: 2,
          derivedRole: 'candidate',
        }),
      ]);
      expect(await screen.findByText('Edit draft')).toBeInTheDocument();
      expect(screen.getByText('Activate')).toBeInTheDocument();
      expect(screen.queryByText('Tweak manually')).not.toBeInTheDocument();
    });

    test('shows feedback when creating a draft fails', async () => {
      server.use(
        http.post('http://localhost:8080/api/recipes/:id/versions', () =>
          HttpResponse.json({error: 'Server exploded'}, {status: 500}),
        ),
      );
      await renderHost({status: 'perfected'}, []);
      await userEvent.click(await screen.findByText('Edit draft'));
      expect(
        await screen.findByText('Could not create a draft. Please try again.'),
      ).toBeInTheDocument();
      // No navigation happened: the detail page is still shown.
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  describe('cook history', () => {
    test('renders cook log entries with their ratings', async () => {
      await renderHost();
      expect(await screen.findByText('Turned out great')).toBeInTheDocument();
      expect(screen.getByLabelText('4 stars')).toBeInTheDocument();
      expect(screen.getByText('Log a cook')).toBeInTheDocument();
    });

    test('shows the empty state when no cooks exist', async () => {
      server.use(
        http.get(
          'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
          () => HttpResponse.json([]),
        ),
      );
      await renderHost();
      expect(
        await screen.findByText(/No cooks logged yet/),
      ).toBeInTheDocument();
    });

    test('logs a cook through the design-system RatingForm slot', async () => {
      server.use(
        http.get(
          'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
          () => HttpResponse.json([]),
        ),
      );
      server.use(
        http.post(
          'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
          () => HttpResponse.json(makeCookLog(), {status: 201}),
        ),
      );
      await renderHost();
      await userEvent.click(await screen.findByText('Log a cook'));
      // Scope the form's controls to the form itself: the page's own
      // "Your rating" input carries the same star labels, so unscoped
      // queries match both rating controls.
      const formTitle = await screen.findByText('How did it go?');
      const form = within(formTitle.parentElement as HTMLElement);
      await userEvent.click(
        form.getByRole('radio', {name: 'Rate 5 out of 5 stars'}),
      );
      await userEvent.type(
        form.getByPlaceholderText('Notes from this cook (optional)'),
        'Quick weeknight cook',
      );
      await userEvent.click(form.getByText('Save'));
      await waitFor(() => {
        expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Log a cook')).toBeInTheDocument();
    });

    test('dismisses the cook log form via Skip', async () => {
      await renderHost();
      await userEvent.click(await screen.findByText('Log a cook'));
      await userEvent.click(await screen.findByText('Skip'));
      await waitFor(() => {
        expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
      });
    });

    test('deletes a cook log entry after confirmation (#266)', async () => {
      let deleted = false;
      server.use(
        http.get(
          'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
          () => HttpResponse.json(deleted ? [] : [makeCookLog()]),
        ),
        http.delete(
          'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks/:cookLogId',
          () => {
            deleted = true;
            return new HttpResponse(null, {status: 204});
          },
        ),
      );
      await renderHost();
      await userEvent.click(
        await screen.findByRole('button', {name: /Delete cook log 1 from/}),
      );
      // The confirmation dialog is up; nothing is deleted yet.
      expect(await screen.findByText('Confirm delete')).toBeInTheDocument();
      expect(deleted).toBe(false);
      expect(screen.getByText('Turned out great')).toBeInTheDocument();
      await userEvent.click(screen.getByText('Confirm delete'));
      await waitFor(() => {
        expect(screen.queryByText('Turned out great')).not.toBeInTheDocument();
      });
      expect(deleted).toBe(true);
      expect(
        await screen.findByText(/No cooks logged yet/),
      ).toBeInTheDocument();
    });

    test('cancelling the delete confirmation keeps the entry (#266)', async () => {
      await renderHost();
      await userEvent.click(
        await screen.findByRole('button', {name: /Delete cook log 1 from/}),
      );
      await userEvent.click(await screen.findByText('Cancel'));
      await waitFor(() => {
        expect(screen.queryByText('Confirm delete')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Turned out great')).toBeInTheDocument();
    });

    test('surfaces an error when deleting a cook log fails (#266)', async () => {
      server.use(
        http.delete(
          'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks/:cookLogId',
          () => HttpResponse.json({error: 'Server exploded'}, {status: 500}),
        ),
      );
      await renderHost();
      await userEvent.click(
        await screen.findByRole('button', {name: /Delete cook log 1 from/}),
      );
      await userEvent.click(await screen.findByText('Confirm delete'));
      expect(
        await screen.findByText(/Could not delete entry/),
      ).toBeInTheDocument();
      // The entry stays listed on failure.
      expect(screen.getByText('Turned out great')).toBeInTheDocument();
    });

    test('renders cook logs without ratings or notes', async () => {
      server.use(
        http.get(
          'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
          () =>
            HttpResponse.json([
              makeCookLog({authorStarRating: null, notes: null}),
            ]),
        ),
      );
      await renderHost();
      expect(await screen.findByText(/2024/)).toBeInTheDocument();
      expect(screen.queryByLabelText('4 stars')).not.toBeInTheDocument();
    });
  });
});
