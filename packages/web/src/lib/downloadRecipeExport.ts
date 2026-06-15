import type {RecipeExportBundle} from '@recipoo/types';

export const downloadRecipeExportBundle = (bundle: RecipeExportBundle) => {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `recipoo-recipes-${bundle.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
