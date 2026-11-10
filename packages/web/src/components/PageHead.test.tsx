import {
  buildAuthenticatedPageHead,
  buildPublicPageHead,
} from '@eciperay/client';
import {waitFor} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {PageHead} from './PageHead.js';

describe('PageHead', () => {
  test('applies a public page config: title, description, canonical, social cards', async () => {
    const config = buildPublicPageHead('https://www.eciperay.com', '/discover');
    if (!config) {
      throw new Error('expected a head config for /discover');
    }

    await renderWithProviders(<PageHead config={config} />, {withAuth: false});

    await waitFor(() => {
      expect(document.title).toBe('Discover recipes | Eciperay');
    });
    expect(
      document.head.querySelector('meta[name="description"]'),
    ).toHaveAttribute('content', expect.stringContaining('public recipes'));
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index, follow',
    );
    expect(
      document.head.querySelector('link[rel="canonical"]'),
    ).toHaveAttribute('href', 'https://www.eciperay.com/discover');
    expect(
      document.head.querySelector('meta[property="og:title"]'),
    ).toHaveAttribute('content', 'Discover recipes | Eciperay');
    expect(
      document.head.querySelector('meta[property="og:type"]'),
    ).toHaveAttribute('content', 'website');
    // No fabricated share image for a page without one.
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull();
    expect(
      document.head.querySelector('meta[name="twitter:card"]'),
    ).toHaveAttribute('content', 'summary');
  });

  test('applies an authenticated config: title and noindex only', async () => {
    const config = buildAuthenticatedPageHead('Recipes');

    await renderWithProviders(<PageHead config={config} />, {withAuth: false});

    await waitFor(() => {
      expect(document.title).toBe('Recipes | Eciperay');
    });
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
