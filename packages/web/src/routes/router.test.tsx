import type {RouteObject} from 'react-router-dom';

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
});
