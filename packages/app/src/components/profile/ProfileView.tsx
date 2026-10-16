import type {ProfileViewProps} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import {YStack} from 'tamagui';

import {LegalLinks} from '../LegalLinks';
import {ProfileFeedbackPreference} from '../ProfileFeedbackPreference';
import {DestructiveButton} from '../ui/DestructiveButton';
import {PageTitle} from '../ui/PageTitle';
import {ScreenContainer} from '../ui/ScreenContainer';
import {SecondaryButton} from '../ui/SecondaryButton';

export const ProfileView = ({
  email,
  onSignOut,
  onManageTagsPress,
  onComponentShowcasePress,
  sectionsBeforeFeedback,
  sectionsAfterFeedback,
}: ProfileViewProps) => (
  <ScreenContainer variant="padded">
    <PageTitle spacing="section">Profile</PageTitle>
    {email ? (
      /* ui-profile-email: mb-6, gray-700 text */
      <DsText
        marginBlockEnd="$6"
        color={tokens.colors.gray.gray8}
      >
        {email}
      </DsText>
    ) : null}
    {onComponentShowcasePress ? (
      <YStack marginBlockEnd="$4">
        <SecondaryButton
          label="Component Showcase"
          onPress={onComponentShowcasePress}
        />
      </YStack>
    ) : null}
    {sectionsBeforeFeedback}
    {onManageTagsPress ? (
      <YStack marginBlockEnd="$4">
        <SecondaryButton
          label="Manage Tags"
          onPress={onManageTagsPress}
        />
      </YStack>
    ) : null}
    <ProfileFeedbackPreference />
    {sectionsAfterFeedback}
    <YStack marginBlockEnd="$8">
      {/* ui-profile-section-title: mb-3, lg semibold gray-900 text */}
      <DsText
        marginBlockEnd="$3"
        fontSize={tokens.typography.fontSize.lg}
        fontWeight={tokens.typography.fontWeight.semibold}
        color={tokens.colors.gray.gray10}
      >
        Legal
      </DsText>
      <LegalLinks />
    </YStack>
    <DestructiveButton
      label="Sign Out"
      onPress={onSignOut}
    />
  </ScreenContainer>
);

if (__DEV__) {
  ProfileView.demo = () => (
    <ProfileView
      email="chef@example.com"
      onSignOut={() => {
        void 0;
      }}
    />
  );
}
