import {queryKeys} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {useParams} from 'react-router-dom';

import {ShoppingListView} from '../components/meals/ShoppingListView.js';
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
