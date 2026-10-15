import type {MealDetailViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import type {MealRecipeMember} from '@eciperay/types';

import {PageTitle} from '../ui/PageTitle.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {ScreenScroll} from '../ui/ScreenScroll.js';
import {SecondaryButton} from '../ui/SecondaryButton.js';
import {SectionCard} from '../ui/SectionCard.js';

const formatMemberNutrition = (member: MealRecipeMember): string | null => {
  const parts: string[] = [];
  if (member.calories !== null) {
    parts.push(`${Math.round(member.calories)} cal`);
  }
  if (member.proteinG !== null) {
    parts.push(`${Math.round(member.proteinG)}g protein`);
  }
  if (member.satietyScore !== null) {
    parts.push(`satiety ${Math.round(member.satietyScore)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

export const MealDetailView = ({
  meal,
  onEdit,
  onCook,
  onRecipePress,
}: MealDetailViewProps) => (
  <ScreenScroll>
    <PageTitle spacing="section">{meal.title}</PageTitle>
    {meal.notes ? (
      <p className="text-muted mbe-4 text-sm">{meal.notes}</p>
    ) : null}
    {formatSimpleNutrition(meal.nutrition) ? (
      <p className="mbe-4 text-sm text-gray-800">
        {formatSimpleNutrition(meal.nutrition)}
      </p>
    ) : null}
    <div className="mbe-6 flex flex-wrap gap-3">
      <PrimaryButton
        label="Cook meal"
        onPress={onCook}
      />
      <SecondaryButton
        label="Edit"
        onPress={onEdit}
      />
    </div>
    <SectionCard title="Recipes">
      <ul className="divide-y divide-gray-100">
        {meal.members.map(member => (
          <li key={member.recipeId}>
            <button
              type="button"
              className="py-3 text-start inline-full"
              disabled={member.accessLost}
              onClick={() => {
                onRecipePress(member.recipeId);
              }}
            >
              <p className="text-base font-medium text-gray-900">
                {member.title}
                {member.accessLost ? ' (unavailable)' : ''}
              </p>
              <p className="text-muted text-sm">
                {member.servings} serving
                {member.servings === 1 ? '' : 's'}
                {formatMemberNutrition(member)
                  ? ` · ${formatMemberNutrition(member)}`
                  : ''}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  </ScreenScroll>
);
