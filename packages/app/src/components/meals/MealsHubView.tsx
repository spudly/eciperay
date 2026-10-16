import type {MealsHubViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import {Card, Text as DsText, tokens} from '@spudly/ui';
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
 * The hub rows carry the old ui-thumbnail-list-card chrome (mb-3 flex-row
 * items-center gap-3 rounded-xl bg-white p-4 shadow-sm). They compose the same
 * DS Card treatment the ThumbnailListCard adapter uses — elevated card, row
 * layout, $3 gap and margin — but without the adapter's thumbnail slot: these
 * rows never rendered a thumbnail. Title/meta mirror the adapter's text block
 * (semibold title, hint subtitle).
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
}: MealsHubViewProps) => (
  <ScreenScroll>
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
    <YStack marginVertical="$4">
      <PrimaryButton
        label={activeTab === 'meals' ? 'New meal' : 'New meal plan'}
        onPress={activeTab === 'meals' ? onCreateMeal : onCreatePlan}
      />
    </YStack>
    {isLoading ? (
      <InlineLoadingIndicator loading />
    ) : activeTab === 'meals' ? (
      meals.length === 0 ? (
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
      )
    ) : plans.length === 0 ? (
      <EmptyMessage>No meal plans yet.</EmptyMessage>
    ) : (
      <YStack gap="$2">
        {plans.map(plan => (
          <Card
            key={plan.id}
            variant="elevated"
            flexDirection="row"
            alignItems="center"
            gap="$3"
            marginBottom="$3"
          >
            <Pressable
              style={textBlockStyle}
              onPress={() => {
                onPlanPress(plan.id);
              }}
            >
              <DsText
                fontSize={tokens.typography.fontSize.md}
                fontWeight={tokens.typography.fontWeight.semibold}
                color={tokens.colors.gray.gray10}
              >
                {plan.title}
              </DsText>
              <DsText
                variant="hint"
                marginTop="$1"
              >
                {plan.entryCount} entr
                {plan.entryCount === 1 ? 'y' : 'ies'}
                {plan.startsOn && plan.endsOn
                  ? ` · ${plan.startsOn} – ${plan.endsOn}`
                  : ''}
                {formatSimpleNutrition(plan.nutrition)
                  ? ` · ${formatSimpleNutrition(plan.nutrition)}`
                  : ''}
              </DsText>
            </Pressable>
            <TextLinkButton
              label="Delete"
              onPress={() => {
                onDeletePlan(plan.id);
              }}
            />
          </Card>
        ))}
      </YStack>
    )}
  </ScreenScroll>
);
