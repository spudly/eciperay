import type {MealsHubViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import type {MealPlan} from '@eciperay/types';
import {Card, Text as DsText, tokens} from '@spudly/ui';
import {MealPlansPage, type MealPlansPageItem} from '@spudly/ui/pages';
import {Pressable} from 'react-native';
import {YStack} from 'tamagui';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {EmptyMessage} from '../ui/EmptyMessage';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {ScreenScroll} from '../ui/ScreenScroll';
import {TabBar} from '../ui/TabBar';
import {TextLinkButton} from '../ui/TextLinkButton';

/* Structural flex only (the old flex-1 min-inline-0): the text block expands
   and may shrink within the card row. No visual values. */
const textBlockStyle = {flex: 1, minWidth: 0} as const;

/**
 * One plan row's meta line, composed app-side for the DS page: the entry count
 * with its pluralization, the plan's date range, and its nutrition summary —
 * the exact string the hub's hand-rolled plan row rendered inline before the
 * rewire. The string crosses the @spudly/ui/pages boundary pre-composed (the
 * RecipesPage subtitle precedent): pluralization and the nutrition formatter
 * are the app's, so the page only renders it.
 */
const formatMealPlanSubtitle = (plan: MealPlan) =>
  `${plan.entryCount} entr${plan.entryCount === 1 ? 'y' : 'ies'}${
    plan.startsOn && plan.endsOn ? ` · ${plan.startsOn} – ${plan.endsOn}` : ''
  }${formatSimpleNutrition(plan.nutrition) ? ` · ${formatSimpleNutrition(plan.nutrition)}` : ''}`;

/**
 * The Meals hub's view. The hub chrome — the "Meals" title and the tab bar —
 * stays app-side: the tab switch is navigation between two pages, not part of
 * either page's view. The Meals tab is unchanged: its hand-rolled rows render
 * inside the hub's ScreenScroll, chrome included, exactly as before.
 *
 * The Meal plans tab renders through MealPlansPage from @spudly/ui/pages (#49,
 * Wave A). The page is a full page — its own scrolling ScreenContainer shell,
 * its "Meal plans" heading, the create action, the loading swap, the empty
 * state, and the plan rows — so it hosts as the tab's root, under the pinned
 * chrome, never nested inside the hub's ScreenScroll: a same-direction
 * ScrollView inside the hub's scroll content would capture the list region's
 * gestures on Android without scrolling the hub (the nested-shell failure shape
 * behind #188). Pinning the chrome on this tab is the composition the page's
 * contract dictates; the page has no slot for chrome inside its scroll. The
 * pinned stack carries the ScreenScroll container's geometry ($4 page padding
 * and rhythm, the gray1 surface) so the two tabs align.
 *
 * This view is the page's app-side host: the plans map to the page's
 * view-models above and the screen's callbacks pass straight through, so the
 * screen keeps the plans query, the delete mutation, and navigation, unchanged.
 * MealPlanForm stays app-side, untouched.
 *
 * The meal rows carry the old ui-thumbnail-list-card chrome (mb-3 flex-row
 * items-center gap-3 rounded-xl bg-white p-4 shadow-sm). They compose the same
 * DS Card treatment the ThumbnailListCard adapter uses — elevated card, row
 * layout, $3 gap and margin — but without the adapter's thumbnail slot: these
 * rows never rendered a thumbnail. Title/meta mirror the adapter's text block
 * (semibold title, hint subtitle). The plan rows carried the same chrome before
 * the rewire; MealPlansPage's rows mirror it in the DS.
 */
export const MealsHubView = ({
  activeTab,
  onSelectTab,
  meals,
  plans,
  isLoading,
  onCreateMeal,
  onCreatePlan,
  onMealPress,
  onPlanPress,
  onDeleteMeal,
  onDeletePlan,
}: MealsHubViewProps) => {
  const planItems: MealPlansPageItem[] = plans.map(plan => ({
    id: plan.id,
    title: plan.title,
    subtitle: formatMealPlanSubtitle(plan),
  }));

  const hubChrome = (
    <>
      <PageTitle spacing="section">Meals</PageTitle>
      <TabBar
        tabs={[
          {key: 'meals', label: 'Meals'},
          {key: 'plans', label: 'Meal plans'},
        ]}
        activeTab={activeTab}
        onTabChange={tab => {
          onSelectTab(tab as MealsHubViewProps['activeTab']);
        }}
      />
    </>
  );

  if (activeTab === 'plans') {
    return (
      <YStack
        flex={1}
        backgroundColor={tokens.colors.gray.gray1}
      >
        <YStack
          paddingHorizontal="$4"
          paddingTop="$4"
          gap="$4"
        >
          {hubChrome}
        </YStack>
        <MealPlansPage
          plans={planItems}
          isLoading={isLoading}
          onPlanPress={onPlanPress}
          onCreatePlan={onCreatePlan}
          onPlanDelete={onDeletePlan}
        />
      </YStack>
    );
  }

  return (
    <ScreenScroll>
      {hubChrome}
      <YStack marginVertical="$4">
        <PrimaryButton
          label="New meal"
          onPress={onCreateMeal}
        />
      </YStack>
      {isLoading ? (
        <InlineLoadingIndicator loading />
      ) : meals.length === 0 ? (
        <EmptyMessage>No meals yet.</EmptyMessage>
      ) : (
        <YStack gap="$2">
          {meals.map(meal => (
            <Card
              key={meal.id}
              variant="elevated"
              flexDirection="row"
              alignItems="center"
              gap="$3"
              marginBottom="$3"
            >
              <Pressable
                style={textBlockStyle}
                onPress={() => {
                  onMealPress(meal.id);
                }}
              >
                <DsText
                  fontSize={tokens.typography.fontSize.md}
                  fontWeight={tokens.typography.fontWeight.semibold}
                  color={tokens.colors.gray.gray10}
                >
                  {meal.title}
                </DsText>
                <DsText
                  variant="hint"
                  marginTop="$1"
                >
                  {meal.memberCount} recipe
                  {meal.memberCount === 1 ? '' : 's'}
                  {formatSimpleNutrition(meal.nutrition)
                    ? ` · ${formatSimpleNutrition(meal.nutrition)}`
                    : ''}
                </DsText>
              </Pressable>
              <TextLinkButton
                label="Delete"
                onPress={() => {
                  onDeleteMeal(meal.id);
                }}
              />
            </Card>
          ))}
        </YStack>
      )}
    </ScreenScroll>
  );
};
