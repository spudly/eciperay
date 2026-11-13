import {jest} from '@jest/globals';
import {createElement, Suspense} from 'react';
import {renderToPipeableStream} from 'react-dom/server';

import {makePublicRecipeResponse} from '../test/fixtures/publicRecipeResponse.js';
import {renderStreamToHtml} from '../test/renderStreamToHtml.js';

import {
  renderPublicRecipeStream,
  renderPublicRecipeStreamDeterministic,
} from './renderPublicRecipe.js';

describe('renderPublicRecipeStream', () => {
  test('renders the public recipe page to HTML in-process (SSR spike)', async () => {
    const html = await renderStreamToHtml(options =>
      renderPublicRecipeStream(makePublicRecipeResponse(), options),
    );

    expect(html).toContain('Test Recipe');
    expect(html).toContain('2 cups Flour');
    expect(html).toContain('Mix the ingredients together.');
  });

  test('deterministic renders are byte-identical, including the first', async () => {
    // Raw renders are not: in a cold process the first render's hoisted
    // Tamagui <style> block snapshots the CSS registry before the page's
    // own styles register, so render 1 differs from render 2 (renders 2+
    // agree). The deterministic renderer's warm-up pass absorbs that —
    // without it, the first assertion pair here is exactly the pair that
    // diverges in a cold process.
    const first = await renderStreamToHtml(async options =>
      renderPublicRecipeStreamDeterministic(
        makePublicRecipeResponse(),
        options,
      ),
    );
    const second = await renderStreamToHtml(async options =>
      renderPublicRecipeStreamDeterministic(
        makePublicRecipeResponse(),
        options,
      ),
    );

    expect(first).toBe(second);
    expect(first).toContain('Test Recipe');
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
