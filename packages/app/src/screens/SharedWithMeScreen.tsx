import {SHARED_WITH_ME_TITLE} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useEffect} from 'react';

import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'SharedWithMe'>;

/**
 * The standalone Shared-with-me screen is retired by the unified
 * Recipes browse (#412): shared recipes now render in the Recipes
 * tab's own section, after the user's created recipes. This screen
 * survives only as a redirect so the existing `shared-with-me` deep
 * link (and any already-installed build's navigation to it) lands on
 * the Recipes list instead of a dead end. It renders nothing of its
 * own — the replace fires on mount and the screen leaves the stack.
 */
export const SharedWithMeScreen = ({navigation}: Props) => {
  useEffect(() => {
    navigation.replace('RecipesList');
  }, [navigation]);

  return null;
};

export const sharedWithMeScreenOptions = {title: SHARED_WITH_ME_TITLE};
