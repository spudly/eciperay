import {queryKeys} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';

import {ShoppingListView} from '../components/meals/ShoppingListView';
import type {MealsStackParamList} from '../navigation/types';
import {api} from '../lib/api';

type Props = NativeStackScreenProps<MealsStackParamList, 'ShoppingList'>;

export const ShoppingListScreen = ({route}: Props) => {
  const {planId} = route.params;
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() => new Set());

  const {data: lines = [], isLoading} = useQuery({
    queryKey: queryKeys.mealPlanShoppingList(planId),
    queryFn: () => api.mealPlans.shoppingList(planId),
  });

  return (
    <ShoppingListView
      lines={lines}
      isLoading={isLoading}
      checkedKeys={checkedKeys}
      onToggleChecked={key => {
        setCheckedKeys(previous => {
          const next = new Set(previous);
          if (next.has(key)) {
            next.delete(key);
          } else {
            next.add(key);
          }
          return next;
        });
      }}
    />
  );
};
