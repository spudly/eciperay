import {
  defaultNutritionGoals,
  errorMessage,
  queryKeys,
  useAuth,
} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import type {
  AuthorDisplaySettings,
  FamilyShareGrant,
  NutritionGoals,
} from '@eciperay/types';

import {ProfilePage} from '@spudly/ui';

import {LegalLinks} from '../components/LegalLinks';
import {AccessTokensSection} from '../hosts/profile/AccessTokensSection';
import {AuthorDisplayForm} from '../hosts/profile/AuthorDisplayForm';
import {
  FamilySharingForm,
  grantLabel,
} from '../hosts/profile/FamilySharingForm';
import {NutritionGoalsForm} from '../hosts/profile/NutritionGoalsForm';
import {ProfileFeedbackPreference} from '../hosts/profile/ProfileFeedbackPreference';
import {api} from '../lib/api';
import {tagsHref} from '../lib/deepLinks';
import {supabase} from '../lib/supabase';

export const ProfileScreen = () => {
  const {i18n} = useLingui();
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

  // Scope the cache entry to the account, as the web profile does for
  // its account-scoped keys: a shared QueryClient outlives a switch.
  const authorDisplayUserId = session?.user.id ?? 'anonymous';
  const {
    data: savedAuthorDisplay,
    isError: authorDisplayLoadFailed,
    error: authorDisplayLoadError,
  } = useQuery({
    queryKey: queryKeys.authorDisplay(authorDisplayUserId),
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.authorDisplay(authorDisplayUserId),
      });
      void queryClient.invalidateQueries({queryKey: ['publicRecipeDiscovery']});
    },
    onError: error => {
      setAuthorDisplayError(errorMessage(error));
    },
  });

  // --- Family sharing (#617) ---
  const familySharingUserId = session?.user.id ?? 'anonymous';
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyError, setFamilyError] = useState<string | null>(null);

  const {
    data: familyGrants = [],
    isLoading: familyLoading,
    isError: familyLoadFailed,
    error: familyLoadError,
  } = useQuery({
    queryKey: queryKeys.familySharing(familySharingUserId),
    queryFn: () => api.account.listFamilySharing(),
  });

  const invalidateFamily = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.familySharing(familySharingUserId),
    });

  const addFamilyMutation = useMutation({
    mutationFn: (email: string) => api.account.createFamilySharing(email),
    onSuccess: () => {
      setFamilyEmail('');
      setFamilyError(null);
      void invalidateFamily();
    },
    onError: error => {
      setFamilyError(errorMessage(error));
    },
  });

  const removeFamilyMutation = useMutation({
    mutationFn: (recipientUserId: string) =>
      api.account.deleteFamilySharing(recipientUserId),
    onSuccess: () => {
      setFamilyError(null);
      void invalidateFamily();
    },
    onError: error => {
      setFamilyError(errorMessage(error));
    },
  });

  const handleRemoveFamily = (grant: FamilyShareGrant) => {
    Alert.alert(
      'Remove family sharing',
      `Remove family sharing for ${grantLabel(grant)}? They will no longer see your private recipes unless a recipe was shared with them individually.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeFamilyMutation.mutate(grant.recipientUserId);
          },
        },
      ],
    );
  };

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
            saveDisabled={!savedAuthorDisplay}
            error={
              authorDisplayError ??
              (authorDisplayLoadFailed
                ? i18n._({
                    id: 'profile.authorDisplayLoadError',
                    message:
                      'Could not load your author display settings: {error}',
                    values: {error: errorMessage(authorDisplayLoadError)},
                  })
                : null)
            }
            onChange={setAuthorDisplay}
            onSave={() => {
              saveAuthorDisplayMutation.mutate();
            }}
          />
          <FamilySharingForm
            grants={familyGrants}
            isLoading={familyLoading}
            email={familyEmail}
            onEmailChange={setFamilyEmail}
            adding={addFamilyMutation.isPending}
            removingId={
              removeFamilyMutation.isPending
                ? removeFamilyMutation.variables
                : null
            }
            error={
              familyError ??
              (familyLoadFailed
                ? `Could not load your family sharing designations: ${errorMessage(familyLoadError)}`
                : null)
            }
            onAdd={() => {
              const nextEmail = familyEmail.trim();
              if (nextEmail) {
                addFamilyMutation.mutate(nextEmail);
              }
            }}
            onRemove={handleRemoveFamily}
          />
          <AccessTokensSection />
        </>
      }
      feedbackPreference={<ProfileFeedbackPreference />}
    />
  );
};
