import type {RecipeStatus} from '@eciperay/types';
import {Text, View} from 'react-native';
import {RECIPE_STATUS_LABELS} from '@eciperay/client';

const STATUS_STYLES: Record<RecipeStatus, string> = {
  idea: 'bg-gray-100 text-gray-700',
  evolving: 'bg-blue-100 text-blue-800',
  perfected: 'bg-green-100 text-green-800',
  abandoned: 'bg-red-100 text-red-700',
};

type Props = {status: RecipeStatus};

export const RecipeStatusBadge = ({status}: Props) => (
  <View
    className={`
      rounded-full px-2.5 py-0.5
      ${STATUS_STYLES[status]}
    `}
  >
    <Text className="text-xs font-medium">{RECIPE_STATUS_LABELS[status]}</Text>
  </View>
);
