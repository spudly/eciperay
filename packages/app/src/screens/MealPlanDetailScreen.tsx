import {queryKeys} from '@eciperay/client';
import type {MealPlanDetail} from '@eciperay/types';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';

import {MealPlanDetailView} from '../hosts/meals/MealPlanDetailView';
import {MealPlanEntryPicker} from '../hosts/meals/MealPlanEntryPicker';
import {useMealPlanInlineEditing} from '../hosts/meals/useMealPlanInlineEditing';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import {
  mealHref,
  mealPlanEditHref,
  profileHref,
  recipeHref,
  shoppingListHref,
} from '../lib/deepLinks';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealPlanDetail'>;

// Navigation crosses into the DS page as deep-link hrefs (#248,
// @spudly/ui 1.15.0), so this screen no longer takes navigation
// callbacks through the view — it composes the destinations.
export const MealPlanDetailScreen = ({route}: Props) => {
  const {planId} = route.params;

  const {data: plan, isLoading} = useQuery({
    queryKey: queryKeys.mealPlan(planId),
    queryFn: () => api.mealPlans.get(planId),
  });

  return (
    <ScreenLoadingGate pending={isLoading || !plan}>
      {plan ? (
        <MealPlanDetailContent plan={plan} planId={planId} />
      ) : null}
    </ScreenLoadingGate>
  );
};

/**
 * The loaded plan's content: the detail view wired for inline
 * editing (#646, tranche 1) plus the entry picker panel when an
 * Add intent is open. Split from the screen so the editing hook
 * only runs with a loaded plan.
 */
const MealPlanDetailContent = ({
  plan,
  planId,
}: {
  plan: MealPlanDetail;
  planId: string;
}) => {
  const inlineEditing = useMealPlanInlineEditing(plan);
  return (
    <>
      <MealPlanDetailView
        plan={plan}
        editHref={mealPlanEditHref(planId)}
        shoppingListHref={shoppingListHref(planId)}
        goalsHref={profileHref}
        entryHref={(kind, targetId, title) =>
          kind === 'meal'
            ? mealHref(targetId)
            : recipeHref({id: targetId, title})
        }
        inlineEditing={inlineEditing}
      />
      {inlineEditing.picker ? (
        <MealPlanEntryPicker
          request={inlineEditing.picker}
          searchText={inlineEditing.searchText}
          onSearchTextChange={inlineEditing.setSearchText}
          isSearching={inlineEditing.isSearching}
          options={inlineEditing.pickerOptions}
          onSelect={inlineEditing.selectPickerOption}
          onClose={inlineEditing.closePicker}
        />
      ) : null}
    </>
  );
};
