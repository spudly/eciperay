import {jest} from '@jest/globals';
import {createElement, Suspense} from 'react';
import {renderToPipeableStream} from 'react-dom/server';

import {makePublicRecipeResponse} from '../test/fixtures/publicRecipeResponse.js';
import {renderStreamToHtml} from '../test/renderStreamToHtml.js';

import {renderPublicRecipeStream} from './renderPublicRecipe.js';

describe('renderPublicRecipeStream', () => {
  test('renders the public recipe page to HTML in-process (SSR spike)', async () => {
    const html = await renderStreamToHtml(options =>
      renderPublicRecipeStream(makePublicRecipeResponse(), options),
    );

    expect(html).toContain('Test Recipe');
    expect(html).toContain('2 cups Flour');
    expect(html).toContain('Mix the ingredients together.');
  });

  test('renders a canonical link tag for the slugged canonical URL', async () => {
    const html = await renderStreamToHtml(options =>
      renderPublicRecipeStream(makePublicRecipeResponse(), options),
    );

    expect(html).toContain('rel="canonical"');
    expect(html).toContain(
      'href="https://www.eciperay.com/recipe/recipe-uuid-1/test-recipe"',
    );
  });
});

const renderError = new Error('controlled render failure');

const ThrowingChild = (): never => {
  throw renderError;
};

describe('renderStreamToHtml', () => {
  test('rejects when a component throws inside a Suspense boundary', async () => {
    // React logs the render error; keep the test output clean.
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      // Without the helper's onError rejection, React recovers inside the
      // Suspense boundary and this resolves with fallback HTML instead of
      // rejecting — so this test fails if that wiring is removed.
      await expect(
        renderStreamToHtml(options =>
          renderToPipeableStream(
            createElement(
              Suspense,
              {fallback: createElement('p', null, 'fallback')},
              createElement(ThrowingChild),
            ),
            options,
          ),
        ),
      ).rejects.toThrow(renderError);
    } finally {
      consoleError.mockRestore();
    }
  });
});
