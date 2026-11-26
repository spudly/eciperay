import {
  CONSENT_PREFERENCES_URL,
  defaultNutritionGoals,
  errorMessage,
  PRIVACY_POLICY_URL,
  queryKeys,
  TERMS_OF_SERVICE_URL,
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

import {useAccessTokensProps} from '../hosts/profile/AccessTokensSection';
import {AuthorDisplayForm} from '../hosts/profile/AuthorDisplayForm';
import {
  FamilySharingForm,
  grantLabel,
} from '../hosts/profile/FamilySharingForm';
import {ShowLessForm} from '../hosts/profile/ShowLessForm';
import {ProfileFeedbackPreference} from '../hosts/profile/ProfileFeedbackPreference';
import {SectionAlert, SectionButton} from '../hosts/profile/profileSection';
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

  // Tag management is admin-only (#621): the Tags link on the profile
  // page is only offered to admins.
  const {
    data: me,
    isError: meLoadFailed,
    error: meLoadError,
    refetch: refetchMe,
  } = useQuery({
    queryKey: queryKeys.currentUser(session?.user?.id ?? 'anonymous'),
    queryFn: () => api.auth.me(),
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
  const authorDisplayUserId = session?.user?.id ?? 'anonymous';
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

  // --- Show less like this (#623) ---
  const showLessUserId = session?.user?.id ?? 'anonymous';
  const [showLessError, setShowLessError] = useState<string | null>(null);

  const {
    data: showLessEntries = [],
    isLoading: showLessLoading,
    isError: showLessLoadFailed,
  } = useQuery({
    queryKey: queryKeys.showLess(showLessUserId),
    queryFn: () => api.discovery.listShowLess(),
  });

  const undoShowLessMutation = useMutation({
    mutationFn: (sourceRecipeId: string) =>
      api.discovery.undoShowLess(sourceRecipeId),
    onSuccess: () => {
      setShowLessError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.showLess(showLessUserId),
      });
      // The undo restores similar recipes' ranking in discovery.
      void queryClient.invalidateQueries({queryKey: ['publicRecipeDiscovery']});
    },
    onError: error => {
      setShowLessError(errorMessage(error));
    },
  });

  // --- Family sharing (#617) ---
  const familySharingUserId = session?.user?.id ?? 'anonymous';
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
            // Same retry rule as Add: the new request starts clean.
            setFamilyError(null);
            removeFamilyMutation.mutate(grant.recipientUserId);
          },
        },
      ],
    );
  };

  const accessTokens = useAccessTokensProps();

  // DS 14's ProfilePage has no generic section slots (#685): the
  // sections it covers cross as data props (nutritionGoals,
  // accessTokens, legalLinks below), and the host-only sections
  // (profile-load alert, author display, show-less, family sharing,
  // feedback preference) render as siblings after the page.
  return (
    <>
      <ProfilePage
        email={session?.user.email ?? null}
        tagsHref={me?.isAdmin ? tagsHref : undefined}
        onSignOut={() => {
          void supabase.auth.signOut();
        }}
        legalLinks={[
          {label: 'Privacy Policy', href: PRIVACY_POLICY_URL},
          {label: 'Terms of Service', href: TERMS_OF_SERVICE_URL},
          {
            label: 'Do Not Sell or Share My Personal Information',
            href: CONSENT_PREFERENCES_URL,
          },
        ]}
        nutritionGoals={{
          goals: nutritionGoals,
          saving: saveGoalsMutation.isPending,
          error: goalsError,
          onChange: setNutritionGoals,
          onSave: () => {
            saveGoalsMutation.mutate();
          },
        }}
        accessTokens={accessTokens}
      />
      {meLoadFailed ? (
        <>
          <SectionAlert
            severity="error"
            message={`Could not load your profile: ${errorMessage(meLoadError)}`}
          />
          <SectionButton
            onPress={() => {
              void refetchMe();
            }}
          >
            Try again
          </SectionButton>
        </>
      ) : null}
      <AuthorDisplayForm
        settings={authorDisplay}
        saving={saveAuthorDisplayMutation.isPending}
        saveDisabled={!savedAuthorDisplay}
        error={
          authorDisplayError ??
          (authorDisplayLoadFailed
            ? i18n._({
                id: 'profile.authorDisplayLoadError',
                message: 'Could not load your author display settings: {error}',
                values: {error: errorMessage(authorDisplayLoadError)},
              })
            : null)
        }
        onChange={setAuthorDisplay}
        onSave={() => {
          saveAuthorDisplayMutation.mutate();
        }}
      />
      <ShowLessForm
        entries={showLessEntries}
        isLoading={showLessLoading}
        loadFailed={showLessLoadFailed}
        undoingId={
          undoShowLessMutation.isPending ? undoShowLessMutation.variables : null
        }
        error={showLessError}
        onUndo={sourceRecipeId => {
          undoShowLessMutation.mutate(sourceRecipeId);
        }}
      />
      <FamilySharingForm
        grants={familyGrants}
        isLoading={familyLoading}
        loadFailed={familyLoadFailed}
        email={familyEmail}
        onEmailChange={next => {
          setFamilyEmail(next);
          // Editing the address after a failure clears the stale
          // mutation error (query-load errors stay separate).
          setFamilyError(null);
        }}
        adding={addFamilyMutation.isPending}
        removingId={
          removeFamilyMutation.isPending ? removeFamilyMutation.variables : null
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
            // A retry starts clean, mirroring the web section.
            setFamilyError(null);
            addFamilyMutation.mutate(nextEmail);
          }
        }}
        onRemove={handleRemoveFamily}
      />
      <ProfileFeedbackPreference />
    </>
  );
};
