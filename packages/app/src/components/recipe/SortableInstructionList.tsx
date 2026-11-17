import {createFormRowKey, type FormInstructionRow} from '@eciperay/client';
import {eciperayTheme, RecipeInstructionRowView, tokens} from '@spudly/ui';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

export const resolveDragIndex = (getIndex: () => number | undefined): number =>
  getIndex() ?? 0;

/**
 * B7 T5 native tranche (#555): the DraggableFlatList container stays host-side
 * (Stephen's 2026-11-09 boundary — no drag library enters the DS) and renders
 * the DS `RecipeInstructionRowView` from its renderItem, binding the host drag
 * handle into the row. The list header (title + add intent) is list chrome the
 * host still owns: @spudly/ui exports the row views only, not the list view.
 */
const styles = {
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
      <RecipeInstructionRowView
        row={{key: item.key, body: item.body}}
        index={index}
        dragHandle={
          <TouchableOpacity
            accessibilityLabel={`Reorder step ${index + 1}`}
            style={styles.dragHandle}
            onLongPress={drag}
            delayLongPress={0}
          >
            <Text style={styles.dragLabel}>Drag</Text>
          </TouchableOpacity>
        }
        onBodyChange={(_rowKey: string, value: string) => {
          onUpdate(index, value);
        }}
        onRemove={() => {
          onChange(instructions.filter(entry => entry.key !== item.key));
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
