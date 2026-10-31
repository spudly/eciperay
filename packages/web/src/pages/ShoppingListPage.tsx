import {
  queryKeys,
  readShoppingListCheckedKeys,
  shoppingListCheckedStorageKey,
  useAuth,
  writeShoppingListCheckedKeys,
} from '@eciperay/client';
import {ShoppingListPage as ShoppingListPageView} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

type ContentProps = {planId: string; userId: string};

const ShoppingListPageContent = ({planId, userId}: ContentProps) => {
  // Checked-off items persist across reload / navigation (#323): the
  // initial set is restored from localStorage (keyed by user + plan, see
  // @eciperay/client shoppingListChecked) and every toggle writes back.
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() =>
    readShoppingListCheckedKeys(userId, planId),
  );

  const {data, isLoading} = useQuery({
    queryKey: queryKeys.mealPlanShoppingList(planId),
    queryFn: () => eciperay.mealPlans.shoppingList(planId),
    enabled: planId.length > 0,
  });
  const lines = data ?? [];

  // Once the current list is known, drop stored checks for lines that are
  // no longer on it (the plan changed since they were checked), so a stale
  // check cannot silently resurrect if the ingredient returns later.
  useEffect(() => {
    if (!data) {
      return;
    }
    const lineKeys = new Set(data.map(line => line.key));
    if ([...checkedKeys].every(key => lineKeys.has(key))) {
      return;
    }
    const pruned = new Set([...checkedKeys].filter(key => lineKeys.has(key)));
    setCheckedKeys(pruned);
    writeShoppingListCheckedKeys(userId, planId, pruned);
  }, [data, checkedKeys, userId, planId]);

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
        const next = new Set(checkedKeys);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        setCheckedKeys(next);
        writeShoppingListCheckedKeys(userId, planId, next);
      }}
    />
  );
};

export const ShoppingListPage = () => {
  const {planId = ''} = useParams();
  const {session: authSession} = useAuth();
  const userId = authSession?.user.id ?? 'anonymous';
  // Keyed by the storage key (the GenerateAiPage pattern): the key gains
  // its account segment when auth resolves, and the content's restored
  // state is bound to the key it first saw — a remount under the settled
  // key keeps every read and write on the same key. (In production
  // AuthGuard settles auth before this page renders, so the key is stable
  // from the first render.)
  const storageKey = shoppingListCheckedStorageKey(userId, planId);
  return (
    <ShoppingListPageContent
      key={storageKey}
      planId={planId}
      userId={userId}
    />
  );
};
