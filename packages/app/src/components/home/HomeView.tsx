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
import {Text, View} from 'react-native';
import {makeRecipeDetail} from '@eciperay/client';

import {RecipeListCard} from '../RecipeListCard';
import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {EmptyMessage} from '../ui/EmptyMessage';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {ScreenScroll} from '../ui/ScreenScroll';
import {SecondaryButton} from '../ui/SecondaryButton';

export const HomeView = ({
  isLoading,
  recipes,
  onBrowsePress,
  onAddPress,
  onSharedWithMePress,
  onRecipePress,
  onRecipeDelete,
}: HomeViewProps) => (
  <ScreenScroll>
    <View className="pt-2">
      <PageTitle
        size="auth"
        spacing="auth"
      >
        {HOME_TITLE}
      </PageTitle>
      <Text className="text-muted mb-6 text-center">{HOME_SUBTITLE}</Text>
      <View className="mb-8 gap-3">
        <PrimaryButton
          label={HOME_BROWSE_LABEL}
          onPress={onBrowsePress}
        />
        <SecondaryButton
          label={HOME_ADD_LABEL}
          onPress={onAddPress}
        />
        <SecondaryButton
          label={HOME_SHARED_WITH_ME_LABEL}
          onPress={onSharedWithMePress}
        />
      </View>
      <PageTitle
        size="section"
        spacing="section"
      >
        {HOME_RECIPES_SECTION_TITLE}
      </PageTitle>
    </View>

    <View className="pb-8">
      {isLoading ? (
        <InlineLoadingIndicator
          loading
          className="mt-8"
        />
      ) : recipes.length === 0 ? (
        <EmptyMessage spacing="list">{HOME_EMPTY_MESSAGE}</EmptyMessage>
      ) : (
        recipes.map(recipe => (
          <RecipeListCard
            key={recipe.id}
            recipe={recipe}
            onPress={() => {
              onRecipePress(recipe.id);
            }}
            onDelete={() => {
              onRecipeDelete(recipe);
            }}
          />
        ))
      )}
    </View>
  </ScreenScroll>
);

if (__DEV__) {
  HomeView.demo = () => (
    <HomeView
      isLoading={false}
      recipes={[makeRecipeDetail()]}
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
}
