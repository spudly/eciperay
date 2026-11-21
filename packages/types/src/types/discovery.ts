import type {PublicRecipeDiscoveryItem} from './recipe.js';

/**
 * Discovery models (#622, tranche 1).
 *
 * A save is a bookmark, not a copy: the recipe stays owned by its author and
 * surfaces in the unified Recipes browse with preferred placement.
 */
export type SavedRecipe = {userId: string; recipeId: string; createdAt: string};

/** A saved recipe joined with the card data the browse surfaces render. */
export type SavedRecipeItem = SavedRecipe & {title: string};

/**
 * Hard hide ("not interested"): the recipe is excluded from every discovery
 * surface for this user until they unhide it from the Hidden recipes list.
 * Distinct from the soft interest signals below.
 */
export type RecipeDisinterest = {
  userId: string;
  recipeId: string;
  createdAt: string;
};

/** A hidden recipe joined with its title for the Hidden recipes list. */
export type HiddenRecipeItem = RecipeDisinterest & {title: string};

/** A follow relationship: followerId follows followeeId. */
export type UserFollow = {
  followerId: string;
  followeeId: string;
  followeeEmail: string;
  followeeDisplayName: string | null;
  createdAt: string;
};

/**
 * Soft engagement signal (Stephen's approval amendment, 2026-11-21): dwell /
 * engagement with a recipe in the swipe deck is 'interest' (not a save);
 * swiping past quickly is 'disinterest' (not a hide). Signals feed discovery
 * ranking only.
 */
export type RecipeInterestSignalKind = 'interest' | 'disinterest';

export type RecipeInterestSignal = {
  id: string;
  userId: string;
  recipeId: string;
  signal: RecipeInterestSignalKind;
  dwellMs: number | null;
  createdAt: string;
};

export type RecordInterestSignalInput = {
  signal: RecipeInterestSignalKind;
  dwellMs?: number | null;
};

/**
 * One discovery-feed card: the public discovery item plus the ranking facts the
 * feed query computed for the requesting user.
 */
export type DiscoveryFeedItem = PublicRecipeDiscoveryItem & {
  /** Higher ranks first; see the feed query for the (simple) formula. */
  discoveryScore: number;
  /** True when the author is someone the requester follows. */
  fromFollowee: boolean;
  /** True when a user the requester follows saved this recipe. */
  savedByFollowee: boolean;
};
