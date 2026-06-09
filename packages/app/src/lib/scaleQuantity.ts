type ConversionEntry = {
  from: number;
  fromUnit: string;
  to: number;
  toUnit: string;
};

const CONVERSIONS: ConversionEntry[] = [
  {from: 3, fromUnit: 'tsp', to: 1, toUnit: 'tbsp'},
  {from: 4, fromUnit: 'tbsp', to: 0.25, toUnit: 'cup'},
  {from: 8, fromUnit: 'tbsp', to: 0.5, toUnit: 'cup'},
  {from: 12, fromUnit: 'tbsp', to: 0.75, toUnit: 'cup'},
  {from: 16, fromUnit: 'tbsp', to: 1, toUnit: 'cup'},
  {from: 2, fromUnit: 'cup', to: 1, toUnit: 'pint'},
  {from: 4, fromUnit: 'cup', to: 1, toUnit: 'quart'},
  {from: 4, fromUnit: 'quart', to: 1, toUnit: 'gallon'},
];

const FRACTIONS: [number, string][] = [
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
];

const toFraction = (value: number): string => {
  const whole = Math.floor(value);
  const remainder = value - whole;
  if (remainder < 0.04) {
    return String(whole);
  }
  const match = FRACTIONS.find(([v]) => Math.abs(v - remainder) < 0.04);
  const frac = match?.[1] ?? remainder.toFixed(2);
  return whole > 0 ? `${whole} ${frac}` : frac;
};

const convertUnit = (
  qty: number,
  unit: string,
): {qty: number; unit: string} => {
  const match = CONVERSIONS.find(c => c.fromUnit === unit && qty >= c.from);
  return match
    ? {qty: (qty / match.from) * match.to, unit: match.toUnit}
    : {qty, unit};
};

export const scaleQuantity = (
  quantity: number | null,
  unit: string | null,
  factor: number,
): string => {
  if (quantity === null) {
    return '';
  }
  const scaled = quantity * factor;
  const {qty, unit: finalUnit} = unit
    ? convertUnit(scaled, unit)
    : {qty: scaled, unit: ''};
  const display = toFraction(qty);
  return finalUnit ? `${display} ${finalUnit}` : display;
};
