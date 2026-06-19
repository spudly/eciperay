const CHANGELOG_PATTERNS = [
  /\bchanged\b/i,
  /\bupdated\b/i,
  /\bprevious version\b/i,
  /\bcompared to\b/i,
  /\binstead of\b/i,
  /\bversion\b/i,
  /\btweak\b/i,
];

export const preserveTweakDescription = (
  parentDescription: string | null,
  proposedDescription: string | null,
  ingredientsOrInstructionsChanged: boolean,
): string | null => {
  if (!ingredientsOrInstructionsChanged) {
    return parentDescription;
  }
  if (!proposedDescription?.trim()) {
    return parentDescription;
  }
  const looksLikeChangelog = CHANGELOG_PATTERNS.some(pattern =>
    pattern.test(proposedDescription),
  );
  if (looksLikeChangelog) {
    return parentDescription;
  }
  return proposedDescription.trim();
};

export const ingredientsOrInstructionsChanged = (
  parent: {
    ingredients: {name: string; quantity: number | null; unit: string | null}[];
    instructions: {body: string}[];
  },
  proposed: {
    ingredients: {
      name: string;
      quantity?: number | null;
      unit?: string | null;
    }[];
    instructions: {body: string}[];
  },
): boolean => {
  const parentIng = parent.ingredients
    .map(i => `${i.name}|${i.quantity}|${i.unit}`)
    .join(';');
  const proposedIng = proposed.ingredients
    .map(i => `${i.name}|${i.quantity ?? null}|${i.unit ?? null}`)
    .join(';');
  if (parentIng !== proposedIng) {
    return true;
  }
  const parentSteps = parent.instructions.map(i => i.body).join('|');
  const proposedSteps = proposed.instructions.map(i => i.body).join('|');
  return parentSteps !== proposedSteps;
};
