/* eslint-disable max-lines -- version picker modal sheet with showcase demo */
import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
  type ShowcaseDemoRenderer,
  truncateChangeSummary,
} from '@eciperay/client';
import type {RecipeVersionSummary} from '@eciperay/types';
import {eciperayTheme, Text as DsText, tokens} from '@spudly/ui';
import {useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, View} from 'react-native';

const ROLE_LABELS: Record<RecipeVersionSummary['derivedRole'], string> = {
  active: 'Active',
  archived: 'Archived',
  draft: 'Draft',
  candidate: 'Candidate',
};

const versionLabel = (version: RecipeVersionSummary) => {
  const role = ROLE_LABELS[version.derivedRole];
  const summary = version.changeSummary
    ? `: ${truncateChangeSummary(version.changeSummary)}`
    : '';
  return `v${version.versionNumber} — ${role}${summary}`;
};

type Props = {
  versions: RecipeVersionSummary[];
  selectedVersionId: string;
  onSelect: (versionId: string) => void;
};

/**
 * The modal sheet keeps RN Modal/Pressable (tests drive the sheet and backdrop
 * through their press handlers and testIDs); every visual value comes from
 * @spudly/ui tokens. The scrim is the DS shadow color at 40% alpha (the old
 * bg-black/40), composed with an alpha suffix the way TagPill composes data
 * colors. Sheet max height (320, the old max-block-80) is layout geometry with
 * no step on the DS spacing scale.
 */
const styles = {
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[2],
  } as const,
  chip: {
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.gray.gray3,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
  } as const,
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: `${tokens.shadows.md.shadowColor}66`,
  } as const,
  sheet: {
    borderTopLeftRadius: tokens.radii.xl,
    borderTopRightRadius: tokens.radii.xl,
    backgroundColor: eciperayTheme.semantic.surface,
    maxHeight: 320,
  } as const,
  row: {
    borderBottomWidth: 1,
    borderColor: tokens.colors.gray.gray1,
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
  } as const,
};

export const VersionPicker = ({
  versions,
  selectedVersionId,
  onSelect,
}: Props) => {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () => [...versions].sort((a, b) => b.versionNumber - a.versionNumber),
    [versions],
  );
  const selected = sorted.find(v => v.id === selectedVersionId) ?? sorted[0];

  if (versions.length <= 1) {
    return (
      <DsText
        fontSize={tokens.typography.fontSize.xs}
        color="$textMuted"
      >
        Version {versions[0]?.versionNumber ?? 1}
      </DsText>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select version"
        style={styles.trigger}
        onPress={() => {
          setOpen(true);
        }}
      >
        <DsText variant="hint">Version</DsText>
        <View style={styles.chip}>
          <DsText
            fontSize={tokens.typography.fontSize.sm}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {versionLabel(selected)}
          </DsText>
        </View>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOpen(false);
        }}
      >
        <Pressable
          testID="version-picker-backdrop"
          style={styles.backdrop}
          onPress={() => {
            setOpen(false);
          }}
        >
          <Pressable
            testID="version-picker-sheet"
            style={styles.sheet}
            onPress={e => {
              e.stopPropagation();
            }}
          >
            <DsText
              fontSize={tokens.typography.fontSize.sm}
              fontWeight={tokens.typography.fontWeight.medium}
              paddingHorizontal="$4"
              paddingVertical="$3"
              borderBottomWidth={1}
              borderColor={tokens.colors.gray.gray2}
            >
              Select version
            </DsText>
            <ScrollView>
              {sorted.map(version => (
                <Pressable
                  key={version.id}
                  style={styles.row}
                  onPress={() => {
                    onSelect(version.id);
                    setOpen(false);
                  }}
                >
                  <DsText
                    fontSize={tokens.typography.fontSize.sm}
                    fontWeight={
                      version.id === selectedVersionId
                        ? tokens.typography.fontWeight.medium
                        : undefined
                    }
                    color={
                      version.id === selectedVersionId
                        ? '$primary'
                        : tokens.colors.gray.gray9
                    }
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {versionLabel(version)}
                  </DsText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

if (__DEV__) {
  const versionPickerDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <VersionPicker
        versions={[
          makeRecipeVersionSummary(),
          makeRecipeVersionSummary({
            id: 'version-uuid-2',
            versionNumber: 2,
            derivedRole: 'candidate',
          }),
        ]}
        selectedVersionId={makeRecipeDetail().versionId}
        onSelect={() => {
          void 0;
        }}
      />
    </Frame>
  );
  VersionPicker.demo = versionPickerDemo;
}
