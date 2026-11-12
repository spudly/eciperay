/**
 * Splits a free-text ingredient line (as found in schema.org `recipeIngredient`
 * strings, which are a single flat string) into the structured fields Eciperay
 * stores: quantity, unit, name, and notes.
 *
 * Examples:
 *
 * - "1/4 cup dill, fresh chopped" -> {quantity: 0.25, unit: "cup", name: "dill",
 *   notes: "fresh chopped"} — a trailing comma-separated preparation qualifier
 *   moves to notes (#498; see splitPreparationQualifier)
 * - "200g pasta" -> {quantity: 200, unit: "g", name: "pasta"}
 * - "Salt and pepper to taste" -> {quantity: null, unit: null, name: "Salt and
 *   pepper to taste"}
 *
 * A quantity range ("1-2 tbsp …", "1 to 2 tbsp …") cannot be stored in the
 * single numeric quantity field, so the lower bound is used as the quantity and
 * the range as written is preserved in notes.
 */

export type ParsedIngredientText = {
  quantity: number | null;
  unit: string | null;
  name: string;
  notes: string | null;
};

export type ParsedIngredientAmount = {
  quantity: number | null;
  notes: string | null;
};

/**
 * Preparation words that turn a trailing comma segment of an ingredient name
 * into a preparation qualifier belonging in `notes` (#498): "3 carrots,
 * chopped" is the ingredient "carrots" prepared "chopped", and the qualifier
 * must not stay glued to the name (where it reads as part of the ingredient) or
 * vanish.
 */
const PREPARATION_QUALIFIER_WORDS = new Set([
  'beaten',
  'chopped',
  'cooked',
  'crumbled',
  'crushed',
  'cubed',
  'cut',
  'deveined',
  'diced',
  'divided',
  'drained',
  'grated',
  'ground',
  'halved',
  'juiced',
  'mashed',
  'melted',
  'minced',
  'peeled',
  'pitted',
  'quartered',
  'rinsed',
  'seeded',
  'shredded',
  'sifted',
  'sliced',
  'softened',
  'thawed',
  'torn',
  'trimmed',
  'washed',
  'whisked',
  'zested',
]);

const isPreparationQualifier = (segment: string): boolean => {
  const normalized = segment.trim().toLowerCase().replace(/\.$/, '');
  if (!normalized) {
    return false;
  }
  if (normalized === 'to taste') {
    return true;
  }
  const words = normalized.split(/\s+/);
  const first = words[0] ?? '';
  const last = words[words.length - 1] ?? '';
  return (
    PREPARATION_QUALIFIER_WORDS.has(first) ||
    PREPARATION_QUALIFIER_WORDS.has(last)
  );
};

/**
 * Moves trailing comma-separated preparation qualifiers from an ingredient name
 * into its notes (#498). Shared by the deterministic parser below and the LLM
 * import parse, which can return the qualifier glued to the name despite the
 * prompt. Only applies when notes is empty — existing notes (e.g. a quantity
 * range) always win.
 */
export const splitPreparationQualifier = (
  name: string,
  notes: string | null,
): {name: string; notes: string | null} => {
  if (notes !== null && notes !== '') {
    return {name, notes};
  }
  let currentName = name;
  let qualifier: string | null = null;
  for (;;) {
    const commaIndex = currentName.lastIndexOf(',');
    if (commaIndex < 0) {
      break;
    }
    const head = currentName.slice(0, commaIndex).trim();
    const tail = currentName.slice(commaIndex + 1).trim();
    if (!head || !isPreparationQualifier(tail)) {
      break;
    }
    qualifier = qualifier === null ? tail : `${tail}, ${qualifier}`;
    currentName = head;
  }
  if (qualifier === null) {
    return {name, notes};
  }
  return {name: currentName, notes: qualifier};
};

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 1 / 4,
  '½': 1 / 2,
  '¾': 3 / 4,
  '⅐': 1 / 7,
  '⅑': 1 / 9,
  '⅒': 1 / 10,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
};

const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join('');

// Capture groups: 1-3 mixed number (whole, numerator, denominator),
// 4-5 plain fraction, 6-7 integer + unicode fraction, 8 unicode fraction
// alone, 9 plain integer/decimal.
const AMOUNT_PATTERN = new RegExp(
  `^(?:(\\d+)\\s+(\\d+)\\/(\\d+)|(\\d+)\\/(\\d+)|(\\d+)\\s*([${FRACTION_CHARS}])|([${FRACTION_CHARS}])|(\\d+(?:\\.\\d+)?|\\.\\d+))(?![\\d.,%])`,
);

const RANGE_SEPARATOR_PATTERN = /^\s*(?:[-–—]\s*|to\s+)/i;

const UNITS = new Set([
  'tsp',
  'teaspoon',
  'teaspoons',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'cup',
  'cups',
  'ml',
  'milliliter',
  'milliliters',
  'millilitre',
  'millilitres',
  'l',
  'liter',
  'liters',
  'litre',
  'litres',
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'kilograms',
  'oz',
  'ounce',
  'ounces',
  'lb',
  'lbs',
  'pound',
  'pounds',
  'pint',
  'pints',
  'quart',
  'quarts',
  'gallon',
  'gallons',
  'pinch',
  'pinches',
  'dash',
  'dashes',
  'drop',
  'drops',
  'can',
  'cans',
  'jar',
  'jars',
  'bottle',
  'bottles',
  'box',
  'boxes',
  'bag',
  'bags',
  'package',
  'packages',
  'pkg',
  'bunch',
  'bunches',
  'head',
  'heads',
  'clove',
  'cloves',
  'slice',
  'slices',
  'piece',
  'pieces',
  'stalk',
  'stalks',
  'sprig',
  'sprigs',
  'leaf',
  'leaves',
  'scoop',
  'scoops',
  'sheet',
  'sheets',
  'handful',
  'handfuls',
  'stick',
  'sticks',
  'container',
  'containers',
  'small',
  'medium',
  'large',
  'whole',
]);

const TWO_WORD_UNITS = new Set(['fl oz', 'fluid ounce', 'fluid ounces']);

type AmountMatch = {value: number; end: number};

const matchAmount = (text: string): AmountMatch | null => {
  const match = AMOUNT_PATTERN.exec(text);
  if (!match) {
    return null;
  }
  const [
    ,
    mixedWhole,
    mixedNumerator,
    mixedDenominator,
    numerator,
    denominator,
    intBeforeFraction,
    unicodeAfterInt,
    unicodeAlone,
    plain,
  ] = match;
  if (mixedWhole !== undefined) {
    const den = Number(mixedDenominator);
    if (den === 0) {
      return null;
    }
    return {
      value: Number(mixedWhole) + Number(mixedNumerator) / den,
      end: match[0].length,
    };
  }
  if (numerator !== undefined) {
    const den = Number(denominator);
    if (den === 0) {
      return null;
    }
    return {value: Number(numerator) / den, end: match[0].length};
  }
  if (intBeforeFraction !== undefined) {
    /* c8 ignore next -- the regex only matches chars that are map keys */
    const fraction = UNICODE_FRACTIONS[unicodeAfterInt ?? ''] ?? 0;
    return {value: Number(intBeforeFraction) + fraction, end: match[0].length};
  }
  if (unicodeAlone !== undefined) {
    /* c8 ignore next -- the regex only matches chars that are map keys */
    const fraction = UNICODE_FRACTIONS[unicodeAlone] ?? 0;
    return {value: fraction, end: match[0].length};
  }
  return {value: Number(plain), end: match[0].length};
};

type AmountPrefix = AmountMatch & {notes: string | null};

/** Matches a leading amount, including a "1-2" / "1 to 2" range. */
const matchAmountPrefix = (text: string): AmountPrefix | null => {
  const first = matchAmount(text);
  if (!first) {
    return null;
  }
  const rest = text.slice(first.end);
  const separator = RANGE_SEPARATOR_PATTERN.exec(rest);
  if (separator) {
    const second = matchAmount(rest.slice(separator[0].length));
    if (second) {
      const end = first.end + separator[0].length + second.end;
      return {value: first.value, end, notes: text.slice(0, end).trim()};
    }
  }
  return {...first, notes: null};
};

/**
 * Parses a string that is only an amount (e.g. the amount span WP Recipe Maker
 * renders separately), such as "1/4", "1 1/2", or "1-2".
 */
export const parseIngredientAmount = (text: string): ParsedIngredientAmount => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {quantity: null, notes: null};
  }
  const amount = matchAmountPrefix(trimmed);
  if (!amount) {
    return {quantity: null, notes: null};
  }
  return {quantity: amount.value, notes: amount.notes};
};

type UnitMatch = {unit: string; end: number};

const matchUnit = (text: string): UnitMatch | null => {
  const twoWords = /^([A-Za-z]+)\.?\s+([A-Za-z]+)\.?/.exec(text);
  if (twoWords) {
    const candidate = `${twoWords[1]?.toLowerCase()} ${twoWords[2]?.toLowerCase()}`;
    if (TWO_WORD_UNITS.has(candidate)) {
      return {unit: candidate, end: twoWords[0].length};
    }
  }
  const oneWord = /^([A-Za-z]+)\.?/.exec(text);
  if (!oneWord) {
    return null;
  }
  /* c8 ignore next -- the regex guarantees capture group 1 on a match */
  const candidate = oneWord[1]?.toLowerCase() ?? '';
  if (!UNITS.has(candidate)) {
    return null;
  }
  return {unit: candidate, end: oneWord[0].length};
};

/** Splits a free-text ingredient line into quantity, unit, name, notes. */
export const parseIngredientText = (raw: string): ParsedIngredientText => {
  const text = raw.trim();
  const amount = matchAmountPrefix(text);
  if (!amount) {
    const split = splitPreparationQualifier(text, null);
    return {quantity: null, unit: null, name: split.name, notes: split.notes};
  }
  // A hyphen that is not part of a range ("1-inch piece …") is not part of
  // the name either.
  const afterAmount = text
    .slice(amount.end)
    .trimStart()
    .replace(/^[-–—]\s*/, '');
  const unitMatch = matchUnit(afterAmount);
  let name = afterAmount;
  let unit: string | null = null;
  if (unitMatch) {
    unit = unitMatch.unit;
    name = afterAmount
      .slice(unitMatch.end)
      .trimStart()
      .replace(/^,\s*/, '')
      .replace(/^of\s+/i, '');
  }
  name = name.trim();
  if (!name) {
    return {quantity: null, unit: null, name: text, notes: null};
  }
  const split = splitPreparationQualifier(name, amount.notes);
  return {quantity: amount.value, unit, name: split.name, notes: split.notes};
};
