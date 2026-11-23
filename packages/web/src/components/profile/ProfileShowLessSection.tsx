import {errorMessage, queryKeys, useAuth} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {Button, Text, XStack, YStack} from 'tamagui';

import {eciperay} from '../../lib/api.js';

// "Show less like this" (#623): the review/reset surface for the soft
// negative signal. Each entry is a source recipe the user asked to see
// less of; Undo removes the entry and restores the ranking of similar
// recipes. Mirrors the Hidden recipes concept (hard hide) — this list
// is the soft counterpart, sitting next to it in Settings. Entries
// persist until undone; there is no decay.

export const ProfileShowLessSection = () => {
  const {session} = useAuth();
  // Scope the cache entry to the account (as ProfilePage does for the
  // entitlement): the shared QueryClient outlives an account switch.
  const userId = session?.user.id ?? 'anonymous';
  const queryClient = useQueryClient();
  const [undoError, setUndoError] = useState<string | null>(null);

  const {
    data: entries = [],
    isLoading,
    isError: loadFailed,
    error: loadError,
  } = useQuery({
    queryKey: queryKeys.showLess(userId),
    queryFn: () => eciperay.discovery.listShowLess(),
  });

  const undoMutation = useMutation({
    mutationFn: (sourceRecipeId: string) =>
      eciperay.discovery.undoShowLess(sourceRecipeId),
    onSuccess: () => {
      setUndoError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.showLess(userId),
      });
      // The undo restores similar recipes' ranking in discovery.
      void queryClient.invalidateQueries({
        queryKey: ['publicRecipeDiscovery'],
      });
    },
    onError: error => {
      setUndoError(errorMessage(error));
    },
  });

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
          Show less like this
        </Text>
      </YStack>
      <YStack gap={tokens.spacing[3]}>
        <Text fontSize={tokens.typography.fontSize.sm} color="$textMuted">
          Recipes you marked “Show less like this”. You’ll see fewer recipes
          like each one — similar recipes are shown less often, never
          removed. Undo an entry to restore them.
        </Text>
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
              {`Could not load your show-less list: ${errorMessage(loadError)}. Reload the page to try again.`}
            </Text>
          </YStack>
        ) : isLoading ? (
          <Text fontSize={tokens.typography.fontSize.sm} color="$textMuted">
            Loading…
          </Text>
        ) : entries.length === 0 ? (
          <Text fontSize={tokens.typography.fontSize.sm} color="$textMuted">
            You haven’t marked any recipes yet. When you choose “Show less
            like this” on a recipe, it will appear here.
          </Text>
        ) : (
          entries.map(entry => (
            <XStack
              key={entry.sourceRecipeId}
              alignItems="center"
              justifyContent="space-between"
              gap={tokens.spacing[3]}
              minHeight={44}
            >
              <Text fontSize={tokens.typography.fontSize.md}>
                {entry.title}
              </Text>
              <Button
                backgroundColor="$surface"
                borderColor="$borderColor"
                borderWidth={1}
                borderRadius={tokens.radii.md}
                color="$color"
                fontSize={tokens.typography.fontSize.sm}
                fontWeight={tokens.typography.fontWeight.semibold}
                paddingHorizontal={tokens.spacing[3]}
                paddingVertical={tokens.spacing[2]}
                disabled={undoMutation.isPending}
                onPress={() => {
                  undoMutation.mutate(entry.sourceRecipeId);
                }}
                aria-label={`Undo show less for ${entry.title}`}
              >
                Undo
              </Button>
            </XStack>
          ))
        )}
        {undoError ? (
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
              {undoError}
            </Text>
          </YStack>
        ) : null}
      </YStack>
    </YStack>
  );
};
