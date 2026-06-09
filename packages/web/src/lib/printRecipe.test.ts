import {makeRecipeDetail} from '../test/fixtures/recipe.js';

import {printRecipe} from './printRecipe.js';

describe('printRecipe', () => {
  test('sets iframe srcdoc and prints on load', () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');

    printRecipe(makeRecipeDetail());

    const frame = appendChild.mock.calls[0]?.[0] as HTMLIFrameElement;
    expect(frame.srcdoc).toContain('Test Recipe');

    const focus = vi.fn();
    const print = vi.fn();
    const addEventListener = vi.fn();
    Object.defineProperty(frame, 'contentWindow', {
      value: {focus, print, addEventListener},
    });
    frame.onload!(new Event('load'));

    expect(focus).toHaveBeenCalled();
    expect(print).toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledWith(
      'afterprint',
      expect.any(Function),
      {once: true},
    );
    expect(removeChild).not.toHaveBeenCalled();
  });
});
