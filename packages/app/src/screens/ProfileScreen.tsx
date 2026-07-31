import {useAuth} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {ProfileView} from '../components/profile/ProfileView';
import {supabase} from '../lib/supabase';
import type {ProfileStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>;

const createComponentShowcasePress = (
  navigation: Props['navigation'],
): (() => void) | undefined => {
  /* istanbul ignore next -- production-only branch (Jest runs with __DEV__=true) */
  if (!__DEV__) {
    return undefined;
  }
  return () => {
    navigation.navigate('ComponentShowcase');
  };
};

export const ProfileScreen = ({navigation}: Props) => {
  const {session} = useAuth();

  return (
    <ProfileView
      email={session?.user.email}
      onComponentShowcasePress={createComponentShowcasePress(navigation)}
      onManageTagsPress={() => {
        navigation.navigate('Tags');
      }}
      onSignOut={() => {
        void supabase.auth.signOut();
      }}
    />
  );
};
