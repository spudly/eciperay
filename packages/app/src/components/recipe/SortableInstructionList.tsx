import {createFormRowKey, type FormInstructionRow} from '@eciperay/client';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

export const resolveDragIndex = (getIndex: () => number | undefined): number =>
  getIndex() ?? 0;

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
  <View className="mbe-2 flex-row gap-2">
    <TouchableOpacity
      accessibilityLabel={`Reorder step ${index + 1}`}
      className="justify-center rounded-sm border border-gray-300 px-2 py-1"
      onLongPress={drag}
      delayLongPress={0}
    >
      <Text className="text-xs text-gray-700">Drag</Text>
    </TouchableOpacity>
    <Text className="text-muted pbs-2 text-sm">{index + 1}.</Text>
    <TextInput
      className="flex-1 rounded-sm border border-gray-300 px-2 py-1 text-sm"
      multiline
      value={instruction.body}
      onChangeText={val => {
        onUpdate(index, val);
      }}
    />
    <TouchableOpacity onPress={onRemove}>
      <Text className="text-sm text-red-600">Remove</Text>
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
      <View className="mbe-2 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-700">Instructions</Text>
        <TouchableOpacity onPress={onAdd}>
          <Text className="text-primary text-sm">+ Add</Text>
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
