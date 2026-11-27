import {StyleSheet, Text, View} from 'react-native';

type Props = {
  heading: string;
  lines: string[];
};

/**
 * Owner-only recipe warnings (#643 warnings tranche): shown above the
 * recipe detail page whenever the displayed version has warnings.
 * The host computes the warnings and formats the lines; this
 * component only renders them. Colors mirror the web banner's
 * warning tokens (the app host has no shared warning banner yet).
 */
export const RecipeWarningsBanner = ({heading, lines}: Props) => (
  <View accessibilityRole="alert" style={styles.banner}>
    <Text style={styles.heading}>{`⚠ ${heading}`}</Text>
    {lines.map(line => (
      <Text key={line} style={styles.line}>
        {`• ${line}`}
      </Text>
    ))}
  </View>
);

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff8e5',
    borderColor: '#e3b505',
    borderRadius: 8,
    borderWidth: 1,
    margin: 12,
    marginBottom: 0,
    padding: 12,
  },
  heading: {fontWeight: '600', marginBottom: 4},
  line: {marginTop: 2},
});
