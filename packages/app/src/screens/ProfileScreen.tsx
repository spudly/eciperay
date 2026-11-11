import {
  defaultNutritionGoals,
  errorMessage,
  queryKeys,
  useAuth,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import type {AuthorDisplaySettings, NutritionGoals} from '@eciperay/types';

import {ProfilePage} from '@spudly/ui';

import {LegalLinks} from '../components/LegalLinks';
import {AccessTokensSection} from '../hosts/profile/AccessTokensSection';
import {AuthorDisplayForm} from '../hosts/profile/AuthorDisplayForm';
import {NutritionGoalsForm} from '../hosts/profile/NutritionGoalsForm';
import {ProfileFeedbackPreference} from '../hosts/profile/ProfileFeedbackPreference';
import {api} from '../lib/api';
import {tagsHref} from '../lib/deepLinks';
import {supabase} from '../lib/supabase';

export const ProfileScreen = () => {
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

  const [authorDisplay, setAuthorDisplay] = useState<AuthorDisplaySettings>({
    displayName: '',
    showOnPublicRecipes: true,
  });
  const [authorDisplayError, setAuthorDisplayError] = useState<string | null>(
    null,
  );

  const {data: savedAuthorDisplay} = useQuery({
    queryKey: queryKeys.authorDisplay(),
    queryFn: () => api.account.getAuthorDisplay(),
  });

  useEffect(() => {
    if (savedAuthorDisplay) {
      setAuthorDisplay(savedAuthorDisplay);
    }
  }, [savedAuthorDisplay]);

  const saveAuthorDisplayMutation = useMutation({
    mutationFn: () => api.account.putAuthorDisplay(authorDisplay),
    onSuccess: data => {
      setAuthorDisplay(data);
      setAuthorDisplayError(null);
      void queryClient.invalidateQueries({queryKey: queryKeys.authorDisplay()});
    },
    onError: error => {
      setAuthorDisplayError(errorMessage(error));
    },
  });

  return (
    <ProfilePage
      email={session?.user.email ?? null}
      tagsHref={tagsHref}
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
          <AuthorDisplayForm
            settings={authorDisplay}
            saving={saveAuthorDisplayMutation.isPending}
            error={authorDisplayError}
            onChange={setAuthorDisplay}
            onSave={() => {
              saveAuthorDisplayMutation.mutate();
            }}
          />
          <AccessTokensSection />
        </>
      }
      feedbackPreference={<ProfileFeedbackPreference />}
    />
  );
};
