import type {ReactNode, RefObject} from 'react';
import type {
  RecipeDetail,
  RecipeStatus,
  RecipeVersionSummary,
  Tag,
} from '@eciperay/types';

export type RecipeStatusFilterValue = 'all' | RecipeStatus;

export type HomeViewProps = {
  isLoading: boolean;
  recipes: RecipeDetail[];
  onBrowsePress: () => void;
  onAddPress: () => void;
  onSharedWithMePress: () => void;
  onRecipePress: (recipeId: string) => void;
  onRecipeDelete: (recipe: RecipeDetail) => void;
};

export type RecipesListViewProps = {
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  recipes: RecipeDetail[];
  isFetchingNextPage: boolean;
  onRecipePress: (recipeId: string) => void;
  onRecipeDelete: (recipe: RecipeDetail) => void;
  onLoadMore: () => void;
  statusFilter?: RecipeStatusFilterValue;
  onStatusFilterChange?: (value: RecipeStatusFilterValue) => void;
  loadMoreRef?: RefObject<HTMLDivElement | null>;
};

export type SharedWithMeViewProps = {
  isLoading: boolean;
  recipes: RecipeDetail[];
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  showTitle?: boolean;
  loadMoreRef?: RefObject<HTMLDivElement | null>;
};

export type TagsViewProps = {
  tags: Tag[];
  isLoading: boolean;
  name: string;
  color: string;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  isCreating: boolean;
};

export type ProfileViewProps = {
  email?: string | null;
  onSignOut: () => void;
  onManageTagsPress?: () => void;
  onComponentShowcasePress?: () => void;
  sectionsBeforeFeedback?: ReactNode;
  sectionsAfterFeedback?: ReactNode;
};

export type AddRecipeMenuOption = {
  label: string;
  description: string;
  target: string;
};

export type AddRecipeMenuViewProps = {
  options: AddRecipeMenuOption[];
  onSelect?: (target: string) => void;
};

export type FeedbackViewProps = {route?: string; onSubmitted?: () => void};

export type ImportImageViewProps = {
  loading: boolean;
  error?: string | null;
  onPickCamera?: () => void;
  onPickLibrary?: () => void;
  onFileSelected?: (file: File) => void;
};

export type ImportReviewViewProps = {
  versionLabel: string;
  imageUrl?: string | null;
  imageAlt?: string;
  preview: ReactNode;
  error?: string | null;
  busy: boolean;
  acceptPending: boolean;
  editsPending: boolean;
  onAccept: () => void;
  onStartEdits: () => void;
};

export type ImportTextViewProps = {
  loading: boolean;
  error?: string | null;
  onSubmit: (text: string) => void;
};

export type ImportUrlViewProps = {
  url: string;
  onUrlChange: (value: string) => void;
  loading: boolean;
  error?: string | null;
  onSubmit: () => void;
};

export type EditRecipeViewProps = {children: ReactNode};

export type EditVersionViewProps = {
  versionNumber: number;
  changeSummary?: string | null;
  showImportBanner?: boolean;
  parentVersionNumber?: number;
  notEditable?: boolean;
  onBack?: () => void;
  children: ReactNode;
};

export type ManualEntryViewProps = {children: ReactNode};

export type RecipeDetailTab =
  | 'overview'
  | 'ingredients'
  | 'instructions'
  | 'history'
  | 'nutrition';

export const RECIPE_DETAIL_TABS: {key: RecipeDetailTab; label: string}[] = [
  {key: 'overview', label: 'Overview'},
  {key: 'ingredients', label: 'Ingredients'},
  {key: 'instructions', label: 'Instructions'},
  {key: 'history', label: 'Cook History'},
  {key: 'nutrition', label: 'Nutrition'},
];

export type RecipeDetailChromeProps = {
  status: RecipeDetail['status'];
  recipeId?: string;
  versions: RecipeVersionSummary[];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
  activeTab: RecipeDetailTab;
  onSelectTab: (tab: RecipeDetailTab) => void;
  children: ReactNode;
};
