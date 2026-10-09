export type SatietyNutrition = {
  calories: number; // kcal
  protein: number; // grams
  fat: number; // grams
  totalCarbs: number; // grams, including fiber
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // milligrams
  weight: number; // grams, prepared edible weight
};

export type SatietyResult = {
  score: number;
  proteinScore: number;
  energyDensityScore: number;
  fiberScore: number;
  hedonicPenalty: number;
};

const WEIGHTS = {protein: 0.45, energyDensity: 0.4, fiber: 0.15};

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));

/**
 * Smooth interpolation between 0 and 1.
 *
 * Returns:
 *
 * - 0 when value <= start
 * - 1 when value >= end
 * - Smooth transition between start and end
 */
const smoothstep = (start: number, end: number, value: number): number => {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * PROTEIN — 45% of total score
 *
 * Diminishing returns. Half-saturation at 25% protein calories.
 *
 * Returns 0–100.
 */
const scoreProtein = (n: SatietyNutrition): number => {
  const proteinPct = clamp((n.protein * 4) / n.calories, 0, 1);
  const halfSaturation = 0.25;
  const raw = 1 - 2 ** (-proteinPct / halfSaturation);
  const maximum = 1 - 2 ** (-1 / halfSaturation);
  return (100 * raw) / maximum;
};

/**
 * ENERGY DENSITY — 40% of total score
 *
 * Linear decline from 0.6 to 4.0 kcal/g. Lower density = higher score.
 *
 * Returns 0–100.
 */
const scoreEnergyDensity = (n: SatietyNutrition): number => {
  const density = n.calories / n.weight;
  const best = 0.6;
  const worst = 4;
  return 100 * clamp((worst - density) / (worst - best), 0, 1);
};

/**
 * FIBER — 15% of total score
 *
 * Diminishing returns. Half-saturation at 1g fiber per 100 kcal.
 *
 * Returns 0–100.
 */
const scoreFiber = (n: SatietyNutrition): number => {
  const fiberPer100Cal = (n.fiber * 100) / n.calories;
  return 100 * (1 - 2 ** -fiberPer100Cal);
};

/**
 * HEDONIC PENALTY — up to 10 points
 *
 * Adapted from Fazzino et al. (2019).
 *
 * Evaluates three hyper-palatability combinations:
 *
 * - Fat + sodium
 * - Fat + sugar
 * - Digestible carbohydrates + sodium
 *
 * Uses smoothstep to avoid abrupt score changes. Evaluated on the complete
 * meal.
 */
const scoreHedonicPenalty = (n: SatietyNutrition): number => {
  const digestibleCarbs = Math.max(0, n.totalCarbs - n.fiber);
  const fatPct = (n.fat * 9) / n.calories;
  const carbPct = (digestibleCarbs * 4) / n.calories;
  const sugarPct = (n.sugar * 4) / n.calories;
  const sodiumPct = n.sodium / 1000 / n.weight;

  const fatSodium =
    smoothstep(0.2, 0.35, fatPct) * smoothstep(0.002, 0.004, sodiumPct);
  const fatSugar =
    smoothstep(0.15, 0.3, fatPct) * smoothstep(0.15, 0.3, sugarPct);
  const carbSodium =
    smoothstep(0.3, 0.5, carbPct) * smoothstep(0.001, 0.003, sodiumPct);

  const hedonicRisk = Math.max(fatSodium, fatSugar, carbSodium);
  return 10 * hedonicRisk;
};

/**
 * Calculate satiety for a food or complete meal.
 *
 * Returns a score from 0–100 plus component scores.
 */
export const calculateSatiety = (n: SatietyNutrition): SatietyResult => {
  if (
    !Number.isFinite(n.calories) ||
    !Number.isFinite(n.weight) ||
    n.calories <= 0 ||
    n.weight <= 0
  ) {
    throw new Error('Calories and weight must be positive finite numbers');
  }

  const proteinScore = scoreProtein(n);
  const energyDensityScore = scoreEnergyDensity(n);
  const fiberScore = scoreFiber(n);
  const hedonicPenalty = scoreHedonicPenalty(n);

  const rawScore =
    proteinScore * WEIGHTS.protein +
    energyDensityScore * WEIGHTS.energyDensity +
    fiberScore * WEIGHTS.fiber -
    hedonicPenalty;

  return {
    score: Math.round(clamp(rawScore)),
    proteinScore: Math.round(proteinScore),
    energyDensityScore: Math.round(energyDensityScore),
    fiberScore: Math.round(fiberScore),
    hedonicPenalty: Math.round(hedonicPenalty * 10) / 10,
  };
};

/**
 * Calculate satiety for an entire recipe.
 *
 * Ingredients contain their individual nutrition. finalWeightGrams is the
 * cooked, edible weight of the entire finished recipe.
 *
 * The score is unchanged by dividing the recipe into proportional servings.
 */
export const calculateRecipeSatiety = (
  ingredients: SatietyNutrition[],
  finalWeightGrams: number,
): SatietyResult => {
  if (!Number.isFinite(finalWeightGrams) || finalWeightGrams <= 0) {
    throw new Error('Final weight must be a positive number');
  }

  const totals = ingredients.reduce<SatietyNutrition>(
    (sum, n) => ({
      calories: sum.calories + n.calories,
      protein: sum.protein + n.protein,
      fat: sum.fat + n.fat,
      totalCarbs: sum.totalCarbs + n.totalCarbs,
      fiber: sum.fiber + n.fiber,
      sugar: sum.sugar + n.sugar,
      sodium: sum.sodium + n.sodium,
      weight: 0,
    }),
    {
      calories: 0,
      protein: 0,
      fat: 0,
      totalCarbs: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      weight: 0,
    },
  );

  return calculateSatiety({...totals, weight: finalWeightGrams});
};
