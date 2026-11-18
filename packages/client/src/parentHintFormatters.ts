import type {RecipeVersionDetail} from '@eciperay/types';

import type {VersionScalarField} from './compareVersionToParent.js';

const imageUrlHint = (url: string | null): string => {
  if (!url) {
    return '(no image)';
  }
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop();
    return filename && filename.length > 0 ? filename : url;
  } catch {
    return url;
  }
};

const timeHint = (minutes: number | null): string =>
  minutes === null ? '(none)' : `${minutes} min`;

export const formatParentScalarHint = (
  parent: RecipeVersionDetail,
  field: VersionScalarField,
): string => {
  switch (field) {
    case 'title': {
      return parent.title;
    }
    case 'description': {
      return parent.description?.trim() ? parent.description : '(empty)';
    }
    case 'servings': {
      return String(parent.servings);
    }
    case 'prepTimeMin': {
      return timeHint(parent.prepTimeMin);
    }
    case 'cookTimeMin': {
      return timeHint(parent.cookTimeMin);
    }
    case 'imageUrl': {
      return imageUrlHint(parent.imageUrl);
    }
    case 'sourceUrl': {
      return parent.sourceUrl?.trim() ? parent.sourceUrl : '(none)';
    }
  }
};

export const formatParentTagNames = (parent: RecipeVersionDetail): string => {
  if (parent.tags.length === 0) {
    return '(none)';
  }
  return parent.tags.map(tag => tag.name).join(', ');
};

export type ParentListSummaryParts = {
  /**
   * Number of entries the summary counts: entries with an empty
   * ingredient name, or an instruction body that is empty after
   * trimming, are excluded — this is NOT the raw list length.
   */
  count: number;
  /**
   * Comma-joined preview of the first counted entries. Ingredient names
   * are kept as entered; instruction bodies are trimmed, so their
   * preview is not the text exactly as entered.
   */
  preview: string;
  /** Entries beyond the preview, folded into the overflow suffix. */
  overflowCount: number;
};

/**
 * The parent list summary as structured parts, so hosts can compose the
 * prose from their own Lingui catalogs (#465): the counts and overflow are
 * host-localized, while the preview keeps the parent's ingredient names
 * as entered (instruction previews are trimmed — see the type above).
 * `formatParentListSummary` below is
 * the en-US composition of these parts for locale-free callers.
 */
export const parentListSummaryParts = (
  parent: RecipeVersionDetail,
  list: 'ingredients' | 'instructions',
): ParentListSummaryParts => {
  if (list === 'ingredients') {
    const names = [...parent.ingredients]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(ingredient => ingredient.name)
      .filter(Boolean);
    return {
      count: names.length,
      preview: names.slice(0, 2).join(', '),
      overflowCount: Math.max(0, names.length - 2),
    };
  }
  const steps = [...parent.instructions]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map(instruction => instruction.body.trim())
    .filter(Boolean);
  return {
    count: steps.length,
    preview: steps[0] ?? '',
    overflowCount: Math.max(0, steps.length - 1),
  };
};

export const formatParentListSummary = (
  parent: RecipeVersionDetail,
  list: 'ingredients' | 'instructions',
): string => {
  const parts = parentListSummaryParts(parent, list);
  if (list === 'ingredients') {
    if (parts.count === 0) {
      return 'Parent had no ingredients';
    }
    const suffix =
      parts.overflowCount > 0 ? ` (+${parts.overflowCount} more)` : '';
    return `Parent had ${parts.count} ingredients: ${parts.preview}${suffix}`;
  }
  if (parts.count === 0) {
    return 'Parent had no steps';
  }
  const suffix =
    parts.overflowCount > 0 ? ` (+${parts.overflowCount} more)` : '';
  return `Parent had ${parts.count} steps: ${parts.preview}${suffix}`;
};
