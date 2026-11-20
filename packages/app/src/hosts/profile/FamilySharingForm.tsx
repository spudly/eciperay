import type {FamilyShareGrant} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {Text, XStack, YStack} from 'tamagui';

import {
  LabeledTextInput,
  SectionAlert,
  SectionButton,
  SectionCard,
} from './profileSection';

/**
 * Family sharing (#617, tranche 2): the owner designates another
 * Eciperay account by email; while the designation stands, that person
 * automatically sees the owner's whole recipe library — existing and
 * future recipes, private included — in Shared With Me, view/clone
 * only. Removing a designation ends that access immediately.
 * Mirrors AuthorDisplayForm's contract: the screen keeps the query,
 * the email state, and the mutations; removal is confirmed by the
 * screen (native has no window.confirm).
 */

export type FamilySharingFormProps = {
  grants: FamilyShareGrant[];
  isLoading?: boolean;
  /** The initial load failed: the list is unknown, not empty. */
  loadFailed?: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  adding?: boolean;
  removingId?: string | null;
  error?: string | null;
  onAdd: () => void;
  onRemove: (grant: FamilyShareGrant) => void;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const grantLabel = (grant: FamilyShareGrant): string =>
  grant.recipientDisplayName
    ? `${grant.recipientDisplayName} (${grant.recipientEmail})`
    : grant.recipientEmail;

export const FamilySharingForm = ({
  grants,
  isLoading = false,
  loadFailed = false,
  email,
  onEmailChange,
  adding = false,
  removingId = null,
  error,
  onAdd,
  onRemove,
}: FamilySharingFormProps) => (
  <SectionCard title="Family sharing">
    <Text
      fontSize={tokens.typography.fontSize.sm}
      color="$textMuted"
    >
      Designate another Eciperay user and they will automatically see all
      of your recipes — including private ones and any you add later — in
      their Shared With Me list. They can view and clone recipes, but not
      edit yours. Removing a person ends that access right away.
    </Text>
    <LabeledTextInput
      label="Email address"
      value={email}
      onChangeText={onEmailChange}
      placeholder="family@example.com"
    />
    <SectionButton
      disabled={!email.trim() || adding}
      onPress={onAdd}
    >
      {adding ? 'Adding…' : 'Add family sharing'}
    </SectionButton>
    {error ? (
      <SectionAlert
        severity="error"
        message={error}
      />
    ) : null}
    {isLoading ? (
      <Text
        fontSize={tokens.typography.fontSize.sm}
        color="$textMuted"
      >
        Loading family sharing…
      </Text>
    ) : loadFailed ? null : grants.length === 0 ? (
      <Text
        fontSize={tokens.typography.fontSize.sm}
        color="$textMuted"
      >
        You have not designated anyone for family sharing yet.
      </Text>
    ) : (
      <YStack>
        {grants.map(grant => (
          <XStack
            key={grant.recipientUserId}
            alignItems="center"
            justifyContent="space-between"
            gap="$3"
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
            <SectionButton
              variant="danger"
              disabled={removingId === grant.recipientUserId}
              onPress={() => {
                onRemove(grant);
              }}
            >
              {removingId === grant.recipientUserId
                ? 'Removing…'
                : 'Remove'}
            </SectionButton>
          </XStack>
        ))}
      </YStack>
    )}
  </SectionCard>
);
