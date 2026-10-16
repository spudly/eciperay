/* eslint-disable max-lines -- draggable instruction rows with showcase demo */
import {createFormRowKey, type FormInstructionRow} from '@eciperay/client';
import {eciperayTheme, tokens} from '@spudly/ui';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

export const resolveDragIndex = (getIndex: () => number | undefined): number =>
  getIndex() ?? 0;

/**
 * This list also renders without a TamaguiProvider (its unit test uses a plain
 * render), so rows stay on RN primitives with every visual value sourced from
 * @spudly/ui tokens — the BookLoadingSpinner pattern.
 */
const styles = {
  row: {
    marginBottom: tokens.spacing[2],
    flexDirection: 'row',
    gap: tokens.spacing[2],
  } as const,
  dragHandle: {
    justifyContent: 'center',
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.gray.gray4,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
  } as const,
  dragLabel: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray.gray8,
  } as const,
  stepNumber: {
    color: eciperayTheme.semantic.textMuted,
    paddingTop: tokens.spacing[2],
    fontSize: tokens.typography.fontSize.sm,
  } as const,
  input: {
    flex: 1,
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.gray.gray4,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
    fontSize: tokens.typography.fontSize.sm,
  } as const,
  removeLabel: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.danger.danger7,
  } as const,
  header: {
    marginBottom: tokens.spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const,
  headerTitle: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.gray.gray8,
  } as const,
  addLabel: {
    fontSize: tokens.typography.fontSize.sm,
    color: eciperayTheme.semantic.primary,
  } as const,
};

type RowProps = {
  instruction: FormInstructionRow;
  index: number;
  drag: () => void;
  onUpdate: (index: number, body: string) => void;
  onRemove: () => void;
};

const InstructionRow = ({
  instruction,
  index,
  drag,
  onUpdate,
  onRemove,
}: RowProps) => (
  <View style={styles.row}>
    <TouchableOpacity
      accessibilityLabel={`Reorder step ${index + 1}`}
      style={styles.dragHandle}
      onLongPress={drag}
      delayLongPress={0}
    >
      <Text style={styles.dragLabel}>Drag</Text>
    </TouchableOpacity>
    <Text style={styles.stepNumber}>{index + 1}.</Text>
    <TextInput
      style={styles.input}
      multiline
      value={instruction.body}
      onChangeText={val => {
        onUpdate(index, val);
      }}
    />
    <TouchableOpacity onPress={onRemove}>
      <Text style={styles.removeLabel}>Remove</Text>
    </TouchableOpacity>
  </View>
);

type Props = {
  instructions: FormInstructionRow[];
  onChange: (instructions: FormInstructionRow[]) => void;
  onUpdate: (index: number, body: string) => void;
  onAdd: () => void;
};

export const SortableInstructionList = ({
  instructions,
  onChange,
  onUpdate,
  onAdd,
}: Props) => {
  const renderItem = ({
    item,
    getIndex,
    drag,
  }: RenderItemParams<FormInstructionRow>) => {
    const index = resolveDragIndex(getIndex);
    return (
      <InstructionRow
        instruction={item}
        index={index}
        drag={drag}
        onUpdate={onUpdate}
        onRemove={() => {
          onChange(instructions.filter((_, idx) => idx !== index));
        }}
      />
    );
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Instructions</Text>
        <TouchableOpacity onPress={onAdd}>
          <Text style={styles.addLabel}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <DraggableFlatList
        data={instructions}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        scrollEnabled={false}
        onDragEnd={({data}) => {
          onChange(data);
        }}
      />
    </View>
  );
};

export const createEmptyInstructionRow = (
  stepNumber: number,
): FormInstructionRow => ({key: createFormRowKey(), stepNumber, body: ''});

if (__DEV__) {
  const SortableInstructionListDemo = () => {
    const [instructions, setInstructions] = useState<FormInstructionRow[]>(
      () => [{...createEmptyInstructionRow(1), body: 'Mix dry ingredients.'}],
    );

    return (
      <SortableInstructionList
        instructions={instructions}
        onChange={setInstructions}
        onUpdate={(index, body) => {
          setInstructions(prev =>
            prev.map((row, rowIndex) =>
              rowIndex === index ? {...row, body} : row,
            ),
          );
        }}
        onAdd={() => {
          setInstructions(prev => [
            ...prev,
            createEmptyInstructionRow(prev.length + 1),
          ]);
        }}
      />
    );
  };

  SortableInstructionList.demo = () => <SortableInstructionListDemo />;
}
