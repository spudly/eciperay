export const slugifyRecipeTitle = (title: string): string => {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');

  if (slug.length > 0) {
    return slug;
  }

  return 'recipe';
};
