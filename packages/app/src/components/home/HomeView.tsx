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
import {Text as DsText} from '@spudly/ui';
import {YStack} from 'tamagui';
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
    <YStack paddingBlockStart="$2">
      <PageTitle
        size="auth"
        spacing="auth"
      >
        {HOME_TITLE}
      </PageTitle>
      <DsText
        color="$textMuted"
        marginBlockEnd="$6"
        textAlign="center"
      >
        {HOME_SUBTITLE}
      </DsText>
      <YStack
        marginBlockEnd="$8"
        gap="$3"
      >
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
      </YStack>
      <PageTitle
        size="section"
        spacing="section"
      >
        {HOME_RECIPES_SECTION_TITLE}
      </PageTitle>
    </YStack>

    <YStack paddingBlockEnd="$8">
      {isLoading ? (
        <YStack marginBlockStart="$8">
          <InlineLoadingIndicator loading />
        </YStack>
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
    </YStack>
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
