import {
  defaultNutritionGoals,
  errorMessage,
  queryKeys,
  useAuth,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import type {NutritionGoals} from '@eciperay/types';

import {LegalLinks} from '../components/LegalLinks';
import {AccessTokensSection} from '../hosts/profile/AccessTokensSection';
import {NutritionGoalsForm} from '@spudly/ui';
import {ProfilePage} from '@spudly/ui/pages';
import {api} from '../lib/api';
import {supabase} from '../lib/supabase';
import type {ProfileStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>;

const createComponentShowcasePress = (
  navigation: Props['navigation'],
): (() => void) | undefined => {
  /* istanbul ignore next -- production-only branch (Jest runs with __DEV__=true) */
  if (!__DEV__) {
    return undefined;
  }
  return () => {
    navigation.navigate('ComponentShowcase');
  };
};

export const ProfileScreen = ({navigation}: Props) => {
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>(
    defaultNutritionGoals(),
  );
  const [goalsError, setGoalsError] = useState<string | null>(null);

  const {data: savedGoals} = useQuery({
    queryKey: queryKeys.nutritionGoals(),
    queryFn: () => api.account.getNutritionGoals(),
  });

  useEffect(() => {
    if (savedGoals) {
      setNutritionGoals(savedGoals);
    }
  }, [savedGoals]);

  const saveGoalsMutation = useMutation({
    mutationFn: () => api.account.putNutritionGoals(nutritionGoals),
    onSuccess: data => {
      setNutritionGoals(data);
      setGoalsError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nutritionGoals(),
      });
      void queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
    },
    onError: error => {
      setGoalsError(errorMessage(error));
    },
  });

  return (
    <ProfilePage
      email={session?.user.email ?? null}
      onComponentShowcasePress={createComponentShowcasePress(navigation)}
      onManageTagsPress={() => {
        navigation.navigate('Tags');
      }}
      onSignOut={() => {
        void supabase.auth.signOut();
      }}
      legalLinks={<LegalLinks />}
      sectionsBeforeFeedback={
        <>
          <NutritionGoalsForm
            goals={nutritionGoals}
            saving={saveGoalsMutation.isPending}
            error={goalsError}
            onChange={setNutritionGoals}
            onSave={() => {
              saveGoalsMutation.mutate();
            }}
          />
          <AccessTokensSection />
        </>
      }
    />
  );
};
