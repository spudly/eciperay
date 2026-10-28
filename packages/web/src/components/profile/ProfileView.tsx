import type {ProfileViewProps} from '@eciperay/client';
import {SectionCard, Text as DSText} from '@spudly/ui';

import {LegalLinks} from '../LegalLinks.js';
import {ProfileFeedbackPreference} from '../ProfileFeedbackPreference.js';
import {DestructiveButton} from '../ui/DestructiveButton.js';
import {PageTitle} from '../ui/PageTitle.js';

export const ProfileView = ({
  email,
  onSignOut,
  sectionsBeforeFeedback,
  sectionsAfterFeedback,
}: ProfileViewProps) => (
  <>
    <PageTitle spacing="section">Profile</PageTitle>
    {email ? (
      <DSText
        marginBottom="$6"
        color="$textMuted"
      >
        {email}
      </DSText>
    ) : null}
    {sectionsBeforeFeedback}
    <ProfileFeedbackPreference />
    {sectionsAfterFeedback}
    <SectionCard
      title="Legal"
      marginBottom="$8"
    >
      <LegalLinks variant="stacked" />
    </SectionCard>
    <DestructiveButton
      label="Sign Out"
      onPress={onSignOut}
    />
  </>
);

if (import.meta.env.DEV) {
  ProfileView.demo = function ProfileViewDemo() {
    return (
      <ProfileView
        email="chef@example.com"
        onSignOut={() => {
          void 0;
        }}
      />
    );
  };
}
