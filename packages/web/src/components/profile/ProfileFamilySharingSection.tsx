import {errorMessage, queryKeys, useAuth} from '@eciperay/client';
import type {FamilyShareGrant} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useId, useState} from 'react';
import {Button, Input, Label, Text, XStack, YStack, styled} from 'tamagui';

import {eciperay} from '../../lib/api.js';

// Family sharing (#617, tranche 2): the owner designates another
// Eciperay account by email; while the designation stands, that person
// automatically sees the owner's whole recipe library — existing and
// future recipes, private included — in Shared With Me, view/clone
// only. Removing a designation ends that access immediately (per-recipe
// grants are unaffected). Mirrors ProfileAuthorDisplaySection's
// structure (host-composed section, query + mutations inside it).

const FieldInput = styled(Input, {
  name: 'FamilySharingTextField',

  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$textMuted',
  borderRadius: tokens.radii.md,
  paddingHorizontal: tokens.spacing[3],
  minHeight: 44,
  fontSize: tokens.typography.fontSize.md,
  color: '$color',
});

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const grantLabel = (grant: FamilyShareGrant): string =>
  grant.recipientDisplayName
    ? `${grant.recipientDisplayName} (${grant.recipientEmail})`
    : grant.recipientEmail;

export const ProfileFamilySharingSection = () => {
  const {session} = useAuth();
  // Scope the cache entry to the account (as ProfilePage does for the
  // entitlement): the shared QueryClient outlives an account switch.
  const userId = session?.user.id ?? 'anonymous';
  const queryClient = useQueryClient();
  const emailFieldId = useId();
  const [email, setEmail] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: grants = [],
    isLoading,
    isError: loadFailed,
    error: loadError,
  } = useQuery({
    queryKey: queryKeys.familySharing(userId),
    queryFn: () => eciperay.account.listFamilySharing(),
  });

  const invalidateGrants = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.familySharing(userId),
    });

  const createMutation = useMutation({
    mutationFn: (nextEmail: string) =>
      eciperay.account.createFamilySharing(nextEmail),
    onSuccess: () => {
      setEmail('');
      setActionError(null);
      void invalidateGrants();
    },
    onError: error => {
      setActionError(errorMessage(error));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (recipientUserId: string) =>
      eciperay.account.deleteFamilySharing(recipientUserId),
    onSuccess: () => {
      setActionError(null);
      void invalidateGrants();
    },
    onError: error => {
      setActionError(errorMessage(error));
    },
  });

  const handleAdd = () => {
    const nextEmail = email.trim();
    if (nextEmail) {
      createMutation.mutate(nextEmail);
    }
  };

  const handleRemove = (grant: FamilyShareGrant) => {
    const confirmed = window.confirm(
      `Remove family sharing for ${grantLabel(grant)}? They will no longer see your private recipes unless a recipe was shared with them individually.`,
    );
    if (confirmed) {
      removeMutation.mutate(grant.recipientUserId);
    }
  };

  const adding = createMutation.isPending;

  return (
    <YStack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={tokens.radii.lg}
      padding={tokens.spacing[4]}
    >
      <YStack paddingBottom={tokens.spacing[3]}>
        <Text
          fontSize={tokens.typography.fontSize.xl}
          fontWeight={tokens.typography.fontWeight.semibold}
        >
          Family sharing
        </Text>
      </YStack>
      <YStack gap={tokens.spacing[3]}>
        <Text
          fontSize={tokens.typography.fontSize.sm}
          color="$textMuted"
        >
          Designate another Eciperay user and they will automatically see
          all of your recipes — including private ones and any you add
          later — in their Shared With Me list. They can view and clone
          recipes, but not edit yours. Removing a person ends that access
          right away.
        </Text>
        <YStack gap={tokens.spacing[1]}>
          <Label
            htmlFor={emailFieldId}
            fontSize={tokens.typography.fontSize.sm}
          >
            Email address
          </Label>
          <FieldInput
            id={emailFieldId}
            value={email}
            onChangeText={setEmail}
            placeholder="family@example.com"
            placeholderTextColor="$textMuted"
          />
        </YStack>
        <YStack>
          <Button
            backgroundColor="$primary"
            borderColor="transparent"
            borderWidth={1}
            borderRadius={tokens.radii.md}
            color="$onPrimary"
            fontSize={tokens.typography.fontSize.md}
            fontWeight={tokens.typography.fontWeight.semibold}
            paddingHorizontal={tokens.spacing[4]}
            paddingVertical={tokens.spacing[3]}
            opacity={!email.trim() || adding ? 0.5 : 1}
            disabled={!email.trim() || adding}
            onPress={handleAdd}
          >
            {adding ? 'Adding…' : 'Add family sharing'}
          </Button>
        </YStack>
        {loadFailed ? (
          <YStack
            borderWidth={1}
            borderRadius={tokens.radii.md}
            padding={tokens.spacing[3]}
            backgroundColor={tokens.colors.danger.danger1}
            borderColor={tokens.colors.danger.danger4}
          >
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color={tokens.colors.danger.danger8}
            >
              {`Could not load your family sharing designations: ${errorMessage(loadError)}. Reload the page to try again.`}
            </Text>
          </YStack>
        ) : null}
        {actionError ? (
          <YStack
            borderWidth={1}
            borderRadius={tokens.radii.md}
            padding={tokens.spacing[3]}
            backgroundColor={tokens.colors.danger.danger1}
            borderColor={tokens.colors.danger.danger4}
          >
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color={tokens.colors.danger.danger8}
            >
              {actionError}
            </Text>
          </YStack>
        ) : null}
        {isLoading ? (
          <Text
            fontSize={tokens.typography.fontSize.sm}
            color="$textMuted"
          >
            Loading family sharing…
          </Text>
        ) : grants.length === 0 ? (
          <Text
            fontSize={tokens.typography.fontSize.sm}
            color="$textMuted"
          >
            You have not designated anyone for family sharing yet.
          </Text>
        ) : (
          <YStack>
            {grants.map(grant => {
              const removing =
                removeMutation.isPending &&
                removeMutation.variables === grant.recipientUserId;
              return (
                <XStack
                  key={grant.recipientUserId}
                  alignItems="center"
                  justifyContent="space-between"
                  gap="$3"
                  borderBottomWidth={1}
                  borderBottomColor={tokens.colors.gray.gray2}
                  paddingVertical="$3"
                >
                  <YStack
                    flex={1}
                    minWidth={0}
                  >
                    <Text
                      fontSize={tokens.typography.fontSize.sm}
                      fontWeight={tokens.typography.fontWeight.medium}
                    >
                      {grantLabel(grant)}
                    </Text>
                    <Text
                      fontSize={tokens.typography.fontSize.xs}
                      color="$textMuted"
                    >
                      {`Added ${formatDate(grant.createdAt)}`}
                    </Text>
                  </YStack>
                  <Button
                    backgroundColor={tokens.colors.danger.danger7}
                    borderColor="transparent"
                    borderWidth={1}
                    borderRadius={tokens.radii.md}
                    color="#ffffff"
                    fontSize={tokens.typography.fontSize.md}
                    fontWeight={tokens.typography.fontWeight.semibold}
                    paddingHorizontal={tokens.spacing[4]}
                    paddingVertical={tokens.spacing[3]}
                    opacity={removing ? 0.5 : 1}
                    disabled={removing}
                    onPress={() => {
                      handleRemove(grant);
                    }}
                    aria-label={`Remove family sharing for ${grantLabel(grant)}`}
                  >
                    {removing ? 'Removing…' : 'Remove'}
                  </Button>
                </XStack>
              );
            })}
          </YStack>
        )}
      </YStack>
    </YStack>
  );
};
