import {jest} from '@jest/globals';
import {createElement, Suspense} from 'react';

import {makePublicRecipeResponse} from '../test/fixtures/publicRecipeResponse.js';

import {
  renderElementToHtml,
  renderPublicRecipeHtml,
} from './renderPublicRecipe.js';

describe('renderPublicRecipeHtml', () => {
  test('renders the public recipe page to HTML in-process (SSR spike)', async () => {
    const html = await renderPublicRecipeHtml(makePublicRecipeResponse());

    expect(html).toContain('Test Recipe');
    expect(html).toContain('2 cups Flour');
    expect(html).toContain('Mix the ingredients together.');
  });
});

const renderError = new Error('controlled render failure');

const ThrowingChild = (): never => {
  throw renderError;
};

describe('renderElementToHtml', () => {
  test('rejects when a component throws inside a Suspense boundary', async () => {
    // React logs the render error; keep the test output clean.
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      // Without the renderer's onError rejection, React recovers inside
      // the Suspense boundary and this resolves with fallback HTML
      // instead of rejecting — so this test fails if that wiring is
      // removed.
      await expect(
        renderElementToHtml(
          createElement(
            Suspense,
            {fallback: createElement('p', null, 'fallback')},
            createElement(ThrowingChild),
          ),
        ),
      ).rejects.toThrow(renderError);
    } finally {
      consoleError.mockRestore();
    }
  });
});
