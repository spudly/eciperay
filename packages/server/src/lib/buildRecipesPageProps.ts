import {formatDiscoveryListMeta} from '@eciperay/client/recipeListDisplay';
import {resizedImageUrl} from '@eciperay/client/resizedImageUrl';
import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import type {RecipesPageProps} from '@spudly/ui';

/**
 * SSR view-model for the unified browse page at /recipes (#622).
 *
 * Maps the public discovery feed's first page (loadPublicRecipes) to the design
 * system's RecipesPage props in its public variant — the one unified browse
 * page — for the anonymous, first-paint render. The mapping mirrors the web
 * host's signed-out mapping (packages/web/src/pages/RecipesPage.tsx) so the
 * server HTML and the client-rendered page agree: same subtitle composition
 * (author byline when there is one, plus the discovery meta), same 400px image
 * resize, same permalink hrefs, default filter state, and the shared footer
 * data (mirrored here, as in buildPublicRecipePageProps, because the server
 * cannot import from the web package). Intent callbacks are inert in server
 * HTML: the client re-renders the page with live callbacks on mount, and
 * signed-in personalization applies client-side once auth resolves.
 */

// The web host's shared footer data (legalDocumentData.ts sharedFooter).
const recipesFooter: NonNullable<RecipesPageProps['footer']> = {
  brand: {label: 'Eciperay', href: '/'},
  columns: [
    {
      title: 'Explore',
      links: [
        {label: 'Discover', href: '/recipes'},
        {label: 'Home', href: '/'},
      ],
    },
    {
      title: 'Account',
      links: [
        {label: 'Sign in', href: '/login'},
        {label: 'Create account', href: '/signup'},
        {label: 'Pricing', href: '/pay'},
      ],
    },
    {
      title: 'Legal',
      links: [
        {label: 'Privacy Policy', href: '/privacy'},
        {label: 'Terms of Service', href: '/terms'},
        {
          label: 'Do Not Sell or Share My Personal Information',
          href: '/privacy/consent',
        },
      ],
    },
  ],
  storeLinks: [],
  socialLinks: [],
};

const noop = () => {};

const formatAuthorName = (authorDisplayName: string | null): string | null => {
  const trimmed = authorDisplayName?.trim();
  return trimmed ? trimmed : null;
};

export const buildRecipesPageProps = (
  recipes: PublicRecipeDiscoveryItem[],
): RecipesPageProps => ({
  variant: 'public',
  footer: recipesFooter,
  title: 'Discover recipes',
  searchPlaceholder: 'Search public recipes…',
  emptyMessage:
    'No public recipes yet — new dishes show up here as cooks share them.',
  errorMessage: null,
  recipes: recipes.map(recipe => {
    const authorName = formatAuthorName(recipe.authorDisplayName);
    return {
      id: recipe.id,
      title: recipe.title,
      subtitle: `${authorName ? `By ${authorName} · ` : ''}${formatDiscoveryListMeta(recipe, 'No ratings yet')}`,
      imageUrl: resizedImageUrl(recipe.imageUrl, 400),
      href: `/recipe/${recipe.id}/${recipe.slug}`,
    };
  }),
  loading: false,
  isFetchingNextPage: false,
  onLoadMore: noop,
  search: '',
  onSearchChange: noop,
  statusFilter: 'all',
  onStatusFilterChange: noop,
  showStatusFilter: true,
  ingredient: '',
  onIngredientChange: noop,
  minCalories: '',
  onMinCaloriesChange: noop,
  maxCalories: '',
  onMaxCaloriesChange: noop,
  minSatiety: '',
  onMinSatietyChange: noop,
  maxSatiety: '',
  onMaxSatietyChange: noop,
  sort: 'newest',
  onSortChange: noop,
  sortDir: 'desc',
  onSortDirChange: noop,
});
