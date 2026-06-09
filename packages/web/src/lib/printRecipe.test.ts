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

  test('cleans up when the iframe has no content window', () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    printRecipe(makeRecipeDetail());
    const frame = appendChild.mock.calls[0]?.[0] as HTMLIFrameElement;
    Object.defineProperty(frame, 'contentWindow', {value: null});
    frame.onload!(new Event('load'));
    expect(removeChild).toHaveBeenCalledWith(frame);
  });

  test('cleans up through the afterprint handler', () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    printRecipe(makeRecipeDetail());
    const frame = appendChild.mock.calls[0]?.[0] as HTMLIFrameElement;
    let afterPrintHandler: (() => void) | undefined;
    const addEventListener = vi.fn((event, handler: () => void) => {
      if (event === 'afterprint') {
        afterPrintHandler = handler;
      }
    });
    Object.defineProperty(frame, 'contentWindow', {
      value: {focus: vi.fn(), print: vi.fn(), addEventListener},
    });
    frame.onload!(new Event('load'));
    afterPrintHandler?.();
    expect(removeChild).toHaveBeenCalledWith(frame);
  });
});
