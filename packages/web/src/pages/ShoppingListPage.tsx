import {
  queryKeys,
  readShoppingListCheckedKeys,
  shoppingListCheckedStorageKey,
  useAuth,
  writeShoppingListCheckedKeys,
} from '@eciperay/client';
import {ShoppingListPage as ShoppingListPageView} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useCallback, useEffect, useRef, useState} from 'react';
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
  // True once a write has failed (storage unavailable): later toggles then
  // keep basing themselves on the in-memory set, which holds checks that
  // never reached storage, instead of re-reading the stale stored set.
  const writeFailedRef = useRef(false);
  const persist = useCallback(
    (keys: ReadonlySet<string>) => {
      writeFailedRef.current = !writeShoppingListCheckedKeys(
        userId,
        planId,
        keys,
      );
    },
    [userId, planId],
  );

  const {data, isFetchedAfterMount, isLoading} = useQuery({
    queryKey: queryKeys.mealPlanShoppingList(planId),
    queryFn: () => eciperay.mealPlans.shoppingList(planId),
    enabled: planId.length > 0,
  });
  const lines = data ?? [];

  // Once the current list is known, drop stored checks for lines that are
  // no longer on it (the plan changed since they were checked), so a stale
  // check cannot silently resurrect if the ingredient returns later. Only
  // prune on a list fetched after this mount: a remount can briefly serve
  // a cached list that predates checks another tab just stored for newer
  // lines, and pruning from it would delete those valid checks.
  useEffect(() => {
    if (!data || !isFetchedAfterMount) {
      return;
    }
    const lineKeys = new Set(data.map(line => line.key));
    if ([...checkedKeys].every(key => lineKeys.has(key))) {
      return;
    }
    const pruned = new Set([...checkedKeys].filter(key => lineKeys.has(key)));
    setCheckedKeys(pruned);
    persist(pruned);
  }, [data, isFetchedAfterMount, checkedKeys, persist]);

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
        // Base the write on the latest stored set so a check saved by
        // another tab since this page loaded is not clobbered; the clicked
        // key's new value still comes from what this page displays. If a
        // previous write failed, the stored set is stale by definition —
        // fall back to the in-memory set, which holds those unsaved checks.
        const base = writeFailedRef.current
          ? checkedKeys
          : readShoppingListCheckedKeys(userId, planId);
        const next = new Set(base);
        if (checkedKeys.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        setCheckedKeys(next);
        persist(next);
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
