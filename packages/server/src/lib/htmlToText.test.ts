import {htmlToText} from './htmlToText.js';

describe('htmlToText', () => {
  test('returns plain text unchanged', () => {
    expect(htmlToText('  Pasta with garlic  ')).toBe('Pasta with garlic');
  });

  test('strips HTML tags and collapses whitespace', () => {
    expect(
      htmlToText('<h1>Pasta</h1><p>Boil <strong>water</strong>.</p>'),
    ).toBe('Pasta\nBoil water.');
  });

  test('preserves ordered list steps on separate lines', () => {
    expect(
      htmlToText(
        '<ol><li>Preheat oven</li><li>Mix batter</li><li>Bake</li></ol>',
      ),
    ).toBe('1. Preheat oven\n2. Mix batter\n3. Bake');
  });

  test('preserves unordered list items on separate lines', () => {
    expect(htmlToText('<ul><li>Flour</li><li>Sugar</li></ul>')).toBe(
      '• Flour\n• Sugar',
    );
  });
});
