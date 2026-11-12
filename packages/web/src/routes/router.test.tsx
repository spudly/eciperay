import {buildRecipePath} from '@eciperay/client';
import type {JSX} from 'react';
import {matchRoutes, type RouteObject} from 'react-router-dom';

import {CookingModePage} from '../pages/CookingModePage.js';
import {EditRecipePage} from '../pages/EditRecipePage.js';
import {RecipeDetailPage} from '../pages/RecipeDetailPage.js';
import {TweakAiPage} from '../pages/TweakAiPage.js';

import {router} from './router.js';

const collectPaths = (routes: RouteObject[] | undefined): string[] => {
  if (!routes) {
    return [];
  }
  return routes.flatMap(route => [
    ...(route.path ? [route.path] : []),
    ...collectPaths(route.children),
  ]);
};

const leafElementType = (pathname: string): unknown => {
  const matches = matchRoutes(router.routes, pathname);
  const leaf = matches?.at(-1)?.route;
  return (leaf?.element as JSX.Element | undefined)?.type;
};

describe('router', () => {
  test('exports browser router', () => {
    expect(router).toBeDefined();
    expect(typeof router.subscribe).toBe('function');
  });

  test('routes the bare /meal-plans list path (eciperay#257)', () => {
    // /meal-plans/new and /meal-plans/:planId existed, but the bare
    // list path 404'd; it now redirects to the Meals hub plans tab.
    expect(collectPaths(router.routes)).toContain('/meal-plans');
  });

  test('root route carries an app-level error element (eciperay#257)', () => {
    expect(router.routes[0]?.errorElement).toBeDefined();
  });

  // #419 reserved slugs: a recipe slug that equals an action segment
  // (cook / edit / tweak-ai) must still land on the detail page through
  // the production route table — buildRecipePath disambiguates it —
  // while the action paths themselves keep their own pages, including
  // when reached from a bare-ID canonical redirect.
  test.each(['cook', 'edit', 'tweak-ai'])(
    'the canonical path for the reserved slug %s selects RecipeDetailPage',
    slug => {
      expect(leafElementType(buildRecipePath({id: 'recipe-1', slug}))).toBe(
        RecipeDetailPage,
      );
    },
  );

  test.each([
    ['/recipes/recipe-1/cook', CookingModePage],
    ['/recipes/recipe-1/edit', EditRecipePage],
    ['/recipes/recipe-1/tweak-ai', TweakAiPage],
  ])('the action path %s keeps its own page', (pathname, page) => {
    expect(leafElementType(pathname)).toBe(page);
  });
});
