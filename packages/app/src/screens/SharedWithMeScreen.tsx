import type {I18n} from '@lingui/core';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useEffect} from 'react';

import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'SharedWithMe'>;

/**
 * The standalone Shared-with-me screen is retired by the unified Recipes browse
 * (#412): shared recipes now render in the Recipes tab's own section, after the
 * user's created recipes. This screen survives only as a redirect so the
 * existing `shared-with-me` deep link (and any already-installed build's
 * navigation to it) lands on the Recipes list instead of a dead end. It renders
 * nothing of its own — the replace fires on mount and the screen leaves the
 * stack.
 */
export const SharedWithMeScreen = ({navigation}: Props) => {
  useEffect(() => {
    navigation.replace('RecipesList');
  }, [navigation]);

  return null;
};

// Navigation options are resolved outside a React render, so
// `useLingui` cannot run here: following the foundation's
// `recipeCountLabel(i18n, …)` pattern (#465), the options take the
// caller's i18n instance and resolve the title from the Lingui
// catalogs (explicit id `sharedWithMe.title`) — the navigator, which
// renders inside the app's I18nProvider, supplies it via `useLingui`.
export const sharedWithMeScreenOptions = (i18n: I18n) => ({
  title: i18n._({id: 'sharedWithMe.title', message: 'Shared with me'}),
});
