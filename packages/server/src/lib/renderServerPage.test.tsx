import {renderStreamToHtml} from '../test/renderStreamToHtml.js';

import {
  renderDeterministically,
  renderServerPageStream,
} from './renderServerPage.js';

describe('renderServerPageStream', () => {
  test('renders the page inside the shared providers', async () => {
    const html = await renderStreamToHtml(options =>
      renderServerPageStream(<p>Shared helper content</p>, options),
    );

    expect(html).toContain('Shared helper content');
  });
});

describe('renderDeterministically', () => {
  test('warms up with one discarded render before the served render', async () => {
    let renders = 0;
    const html = await renderStreamToHtml(options =>
      renderDeterministically(renderOptions => {
        renders += 1;
        return renderServerPageStream(
          <p>Deterministic content</p>,
          renderOptions,
        );
      }, options),
    );

    expect(html).toContain('Deterministic content');
    expect(renders).toBe(2);
  });
});
