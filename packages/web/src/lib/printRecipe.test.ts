import {makeRecipeDetail} from '../test/fixtures/recipe.js';

import {printRecipe} from './printRecipe.js';

describe('printRecipe', () => {
  test('sets iframe srcdoc and prints on load', () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');

    printRecipe(makeRecipeDetail());

    const frame = appendChild.mock.calls[0]?.[0] as HTMLIFrameElement;
    expect(frame.srcdoc).toContain('Test Recipe');
    expect(frame.style.display).toBe('none');

    const focus = vi.fn();
    const print = vi.fn();
    Object.defineProperty(frame, 'contentWindow', {value: {focus, print}});
    frame.onload!(new Event('load'));

    expect(focus).toHaveBeenCalled();
    expect(print).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalledWith(frame);
  });
});
