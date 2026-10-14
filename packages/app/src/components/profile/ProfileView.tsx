import type {ProfileViewProps} from '@eciperay/client';
import {Text, View} from 'react-native';

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
    {email ? <Text className="ui-profile-email">{email}</Text> : null}
    {onComponentShowcasePress ? (
      <View className="mbe-4">
        <SecondaryButton
          label="Component Showcase"
          onPress={onComponentShowcasePress}
        />
      </View>
    ) : null}
    {sectionsBeforeFeedback}
    {onManageTagsPress ? (
      <View className="mbe-4">
        <SecondaryButton
          label="Manage Tags"
          onPress={onManageTagsPress}
        />
      </View>
    ) : null}
    <ProfileFeedbackPreference />
    {sectionsAfterFeedback}
    <View className="mbe-8">
      <Text className="ui-profile-section-title">Legal</Text>
      <LegalLinks />
    </View>
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
