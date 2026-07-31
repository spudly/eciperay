import type {ProfileViewProps} from '@eciperay/client';

import {LegalLinks} from '../LegalLinks.js';
import {ProfileFeedbackPreference} from '../ProfileFeedbackPreference.js';
import {DestructiveButton} from '../ui/DestructiveButton.js';
import {PageTitle} from '../ui/PageTitle.js';
import {SecondaryButton} from '../ui/SecondaryButton.js';

export const ProfileView = ({
  email,
  onSignOut,
  onComponentShowcasePress,
  sectionsBeforeFeedback,
  sectionsAfterFeedback,
}: ProfileViewProps) => (
  <>
    <PageTitle spacing="section">Profile</PageTitle>
    {email ? <p className="ui-profile-email">{email}</p> : null}
    {onComponentShowcasePress ? (
      <div className="mb-4">
        <SecondaryButton
          label="Component Showcase"
          onPress={onComponentShowcasePress}
        />
      </div>
    ) : null}
    {sectionsBeforeFeedback}
    <ProfileFeedbackPreference />
    {sectionsAfterFeedback}
    <section className="ui-profile-section">
      <h2 className="ui-profile-section-title">Legal</h2>
      <LegalLinks variant="stacked" />
    </section>
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
