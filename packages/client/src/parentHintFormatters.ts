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

export const formatParentListSummary = (
  parent: RecipeVersionDetail,
  list: 'ingredients' | 'instructions',
): string => {
  if (list === 'ingredients') {
    const names = [...parent.ingredients]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(ingredient => ingredient.name)
      .filter(Boolean);
    if (names.length === 0) {
      return 'Parent had no ingredients';
    }
    const preview = names.slice(0, 2).join(', ');
    const suffix = names.length > 2 ? ` (+${names.length - 2} more)` : '';
    return `Parent had ${names.length} ingredients: ${preview}${suffix}`;
  }
  const steps = [...parent.instructions]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map(instruction => instruction.body.trim())
    .filter(Boolean);
  if (steps.length === 0) {
    return 'Parent had no steps';
  }
  const preview = steps[0];
  const suffix = steps.length > 1 ? ` (+${steps.length - 1} more)` : '';
  return `Parent had ${steps.length} steps: ${preview}${suffix}`;
};
