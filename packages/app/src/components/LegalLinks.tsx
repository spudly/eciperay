import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
  type LegalLinksProps,
} from '@eciperay/client';
import {eciperayTheme, tokens} from '@spudly/ui';
import {Linking, Text, TouchableOpacity, View} from 'react-native';

const openUrl = (url: string) => {
  void Linking.openURL(url);
};

/**
 * Legal links composed from DS token values on RN primitives — the
 * BookLoadingSpinner pattern: this component renders without a TamaguiProvider
 * (its unit test uses a plain render), so the DS TextLink element can't be used
 * here. The link treatment replicates the ui-link and DS TextLink values from
 * tokens: the semantic link color and the medium weight token. (The DS TextLink
 * underlines by default; ui-link underlined only on web hover, which native
 * never sees, so the treatments here keep the token color and weight without
 * underline.)
 */
const styles = {
  stacked: {gap: tokens.spacing[2]} as const,
  link: {
    color: eciperayTheme.semantic.link,
    fontWeight: tokens.typography.fontWeight.medium,
  } as const,
  stackedLink: {
    color: eciperayTheme.semantic.link,
    fontWeight: tokens.typography.fontWeight.medium,
    fontSize: tokens.typography.fontSize.md,
  } as const,
  inline: {
    marginTop: tokens.spacing[4],
    textAlign: 'center',
    fontSize: tokens.typography.fontSize.sm,
    lineHeight: 20,
    color: eciperayTheme.semantic.textMuted,
  } as const,
};

export const LegalLinks = ({variant = 'stacked'}: LegalLinksProps) => {
  if (variant === 'inline') {
    return (
      <Text style={styles.inline}>
        By creating an account, you agree to our{' '}
        <Text
          style={styles.link}
          onPress={() => {
            openUrl(TERMS_OF_SERVICE_URL);
          }}
        >
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text
          style={styles.link}
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
    <View style={styles.stacked}>
      <TouchableOpacity
        onPress={() => {
          openUrl(PRIVACY_POLICY_URL);
        }}
      >
        <Text style={styles.stackedLink}>Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          openUrl(TERMS_OF_SERVICE_URL);
        }}
      >
        <Text style={styles.stackedLink}>Terms of Service</Text>
      </TouchableOpacity>
    </View>
  );
};
