import {queryKeys} from '@eciperay/client';
import {ShoppingListPage as ShoppingListPageView} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {useParams} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

export const ShoppingListPage = () => {
  const {planId = ''} = useParams();
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() => new Set());

  const {data: lines = [], isLoading} = useQuery({
    queryKey: queryKeys.mealPlanShoppingList(planId),
    queryFn: () => eciperay.mealPlans.shoppingList(planId),
    enabled: planId.length > 0,
  });

  return (
    <ShoppingListPageView
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
