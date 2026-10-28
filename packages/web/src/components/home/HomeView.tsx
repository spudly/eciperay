import {
  HOME_ADD_LABEL,
  HOME_BROWSE_LABEL,
  HOME_EMPTY_MESSAGE,
  HOME_RECIPES_SECTION_TITLE,
  HOME_SHARED_WITH_ME_LABEL,
  HOME_SUBTITLE,
  HOME_TITLE,
  type HomeViewProps,
} from '@eciperay/client';
import {makeRecipeDetail} from '@eciperay/client';

import {RecipeListCard} from '../RecipeListCard.js';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {EmptyMessage} from '../ui/EmptyMessage.js';
import {PageTitle} from '../ui/PageTitle.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {ScreenScroll} from '../ui/ScreenScroll.js';
import {SecondaryButton} from '../ui/SecondaryButton.js';

type HomeViewOwnProps = HomeViewProps & {
  deleteError?: string | null;
  deleteErrorRecipeId?: string | null;
  isDeletePending?: boolean;
};

export const HomeView = ({
  isLoading,
  recipes,
  onBrowsePress,
  onAddPress,
  onSharedWithMePress,
  onRecipePress,
  onRecipeDelete,
  deleteError,
  deleteErrorRecipeId,
  isDeletePending = false,
}: HomeViewOwnProps) => (
  <ScreenScroll>
    <div className="py-4 text-center">
      <PageTitle
        size="auth"
        spacing="auth"
      >
        {HOME_TITLE}
      </PageTitle>
      <p className="text-muted mbe-8">{HOME_SUBTITLE}</p>
      <div className="flex flex-wrap justify-center gap-4">
        <div className="inline-block">
          <PrimaryButton
            label={HOME_BROWSE_LABEL}
            onPress={onBrowsePress}
          />
        </div>
        <div className="inline-block">
          <SecondaryButton
            label={HOME_ADD_LABEL}
            onPress={onAddPress}
          />
        </div>
        <div className="inline-block">
          <SecondaryButton
            label={HOME_SHARED_WITH_ME_LABEL}
            onPress={onSharedWithMePress}
          />
        </div>
      </div>
    </div>

    <PageTitle
      size="section"
      spacing="section"
    >
      {HOME_RECIPES_SECTION_TITLE}
    </PageTitle>
    {isLoading ? (
      <InlineLoadingIndicator
        loading
        className="mbs-8"
      />
    ) : recipes.length === 0 ? (
      <EmptyMessage spacing="list">{HOME_EMPTY_MESSAGE}</EmptyMessage>
    ) : (
      recipes.map(recipe => (
        <RecipeListCard
          key={recipe.id}
          recipe={recipe}
          isDeleting={isDeletePending}
          deleteError={deleteErrorRecipeId === recipe.id ? deleteError : null}
          onPress={() => {
            onRecipePress(recipe.id);
          }}
          onDelete={id => {
            const match = recipes.find(item => item.id === id);
            if (match) {
              onRecipeDelete(match);
            }
          }}
        />
      ))
    )}
  </ScreenScroll>
);

if (import.meta.env.DEV) {
  HomeView.demo = function HomeViewDemo() {
    const mockRecipe = makeRecipeDetail();

    return (
      <HomeView
        isLoading={false}
        recipes={[mockRecipe]}
        onBrowsePress={() => {
          void 0;
        }}
        onAddPress={() => {
          void 0;
        }}
        onSharedWithMePress={() => {
          void 0;
        }}
        onRecipePress={() => {
          void 0;
        }}
        onRecipeDelete={() => {
          void 0;
        }}
      />
    );
  };
}
