import {queryKeys} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ShoppingListPage} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';

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
    <ShoppingListPage
      isLoading={isLoading}
      lines={lines.map(line => ({
        key: line.key,
        name: line.name,
        quantityLabel:
          line.quantity === null
            ? null
            : `${line.quantity}${line.unit ? ` ${line.unit}` : ''}`,
        isOptional: line.isOptional,
        isChecked: checkedKeys.has(line.key),
      }))}
      onToggleLine={key => {
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
