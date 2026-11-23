import type {ShowLessItem} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {Text, XStack} from 'tamagui';

import {SectionAlert, SectionButton, SectionCard} from './profileSection';

/**
 * "Show less like this" (#623): the review/reset surface for the soft
 * negative signal. Each entry is a source recipe the user asked to see
 * less of; Undo removes the entry and restores the ranking of similar
 * recipes. Mirrors FamilySharingForm's contract: the screen keeps the
 * query and the undo mutation, the form renders entries and errors.
 * Entries persist until undone; there is no decay.
 */

export type ShowLessFormProps = {
  entries: ShowLessItem[];
  isLoading?: boolean;
  loadFailed?: boolean;
  undoingId?: string | null;
  error?: string | null;
  onUndo: (sourceRecipeId: string) => void;
};

export const ShowLessForm = ({
  entries,
  isLoading = false,
  loadFailed = false,
  undoingId = null,
  error,
  onUndo,
}: ShowLessFormProps) => (
  <SectionCard title="Show less like this">
    <Text fontSize={tokens.typography.fontSize.sm} color="$textMuted">
      Recipes you marked “Show less like this”. You’ll see fewer recipes
      like each one — similar recipes are shown less often, never removed.
      Undo an entry to restore them.
    </Text>
    {loadFailed ? (
      <SectionAlert
        severity="error"
        message="Could not load your show-less list. Try again later."
      />
    ) : isLoading ? (
      <Text fontSize={tokens.typography.fontSize.sm} color="$textMuted">
        Loading…
      </Text>
    ) : entries.length === 0 ? (
      <Text fontSize={tokens.typography.fontSize.sm} color="$textMuted">
        You haven’t marked any recipes yet. When you choose “Show less like
        this” on a recipe, it will appear here.
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
          <Text fontSize={tokens.typography.fontSize.md}>{entry.title}</Text>
          <SectionButton
            variant="secondary"
            disabled={undoingId !== null}
            onPress={() => {
              onUndo(entry.sourceRecipeId);
            }}
          >
            Undo
          </SectionButton>
        </XStack>
      ))
    )}
    {error ? <SectionAlert severity="error" message={error} /> : null}
  </SectionCard>
);
