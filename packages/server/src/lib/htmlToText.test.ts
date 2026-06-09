import {htmlToText} from './htmlToText.js';

describe('htmlToText', () => {
  test('returns plain text unchanged', () => {
    expect(htmlToText('  Pasta with garlic  ')).toBe('Pasta with garlic');
  });

  test('strips HTML tags and collapses whitespace', () => {
    expect(
      htmlToText('<h1>Pasta</h1><p>Boil <strong>water</strong>.</p>'),
    ).toBe('PastaBoil water.');
  });
});
