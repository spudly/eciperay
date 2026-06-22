import type {RecipeExportRecord} from './recipeExport.js';
import type {RecipeShareGrantVia} from './recipe.js';
import type {RecipeStarRating} from './recipeRating.js';

export type AccountExportShareGrant = {
  recipeId: string;
  grantedAt: string;
  via: RecipeShareGrantVia;
};

export type AccountExportCommunityRating = {
  recipeId: string;
  stars: RecipeStarRating;
  contentRevision: number;
  createdAt: string;
};

export type AccountExportComment = {
  id: string;
  recipeId: string;
  body: string;
  contentRevision: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountExportBundle = {
  formatVersion: 1;
  exportedAt: string;
  profile: {email: string; displayName: string | null; createdAt: string};
  recipes: RecipeExportRecord[];
  shareGrants: AccountExportShareGrant[];
  communityRatings: AccountExportCommunityRating[];
  comments: AccountExportComment[];
};
