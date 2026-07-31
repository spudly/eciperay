import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
  type LegalLinksProps,
} from '@eciperay/client';
import {Linking, Text, TouchableOpacity, View} from 'react-native';

const openUrl = (url: string) => {
  void Linking.openURL(url);
};

export const LegalLinks = ({variant = 'stacked'}: LegalLinksProps) => {
  if (variant === 'inline') {
    return (
      <Text className="text-muted mt-4 text-center text-sm leading-5">
        By creating an account, you agree to our{' '}
        <Text
          className="ui-link"
          onPress={() => {
            openUrl(TERMS_OF_SERVICE_URL);
          }}
        >
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text
          className="ui-link"
          onPress={() => {
            openUrl(PRIVACY_POLICY_URL);
          }}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    );
  }

  return (
    <View className="gap-2">
      <TouchableOpacity
        onPress={() => {
          openUrl(PRIVACY_POLICY_URL);
        }}
      >
        <Text className="ui-link text-base">Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          openUrl(TERMS_OF_SERVICE_URL);
        }}
      >
        <Text className="ui-link text-base">Terms of Service</Text>
      </TouchableOpacity>
    </View>
  );
};

if (__DEV__) {
  LegalLinks.demo = () => <LegalLinks variant="stacked" />;
}
