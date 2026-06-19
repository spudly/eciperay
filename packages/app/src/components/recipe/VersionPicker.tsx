import type {RecipeVersionSummary} from '@eciperay/types';
import React, {useState} from 'react';
import {Modal, Pressable, ScrollView, Text, View} from 'react-native';

const ROLE_LABELS: Record<RecipeVersionSummary['derivedRole'], string> = {
  active: 'Active',
  archived: 'Archived',
  draft: 'Draft',
  candidate: 'Candidate',
};

const versionLabel = (version: RecipeVersionSummary) => {
  const role = ROLE_LABELS[version.derivedRole];
  const summary = version.changeSummary ? `: ${version.changeSummary}` : '';
  return `v${version.versionNumber} — ${role}${summary}`;
};

type Props = {
  versions: RecipeVersionSummary[];
  selectedVersionId: string;
  onSelect: (versionId: string) => void;
};

export const VersionPicker = ({
  versions,
  selectedVersionId,
  onSelect,
}: Props) => {
  const [open, setOpen] = useState(false);
  const sorted = [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  );
  const selected = sorted.find(v => v.id === selectedVersionId) ?? sorted[0];

  if (versions.length <= 1) {
    return (
      <Text className="text-muted text-xs">
        Version {versions[0]?.versionNumber ?? 1}
      </Text>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select version"
        className="flex-row items-center gap-2"
        onPress={() => {
          setOpen(true);
        }}
      >
        <Text className="text-muted text-sm">Version</Text>
        <View className="rounded-lg border border-gray-200 px-2 py-1">
          <Text className="text-sm">{versionLabel(selected)}</Text>
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
          className="flex-1 justify-end bg-black/40"
          onPress={() => {
            setOpen(false);
          }}
        >
          <Pressable
            testID="version-picker-sheet"
            className="max-h-80 rounded-t-2xl bg-white"
            onPress={e => {
              e.stopPropagation();
            }}
          >
            <Text
              className="
                border-b border-gray-100 px-4 py-3 text-sm font-medium
                text-gray-900
              "
            >
              Select version
            </Text>
            <ScrollView>
              {sorted.map(version => (
                <Pressable
                  key={version.id}
                  className="border-b border-gray-50 px-4 py-3"
                  onPress={() => {
                    onSelect(version.id);
                    setOpen(false);
                  }}
                >
                  <Text
                    className={
                      version.id === selectedVersionId
                        ? 'text-primary text-sm font-medium'
                        : 'text-sm text-gray-800'
                    }
                  >
                    {versionLabel(version)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
