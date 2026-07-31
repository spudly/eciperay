import type {SelectFieldProps} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';
import {Modal, Pressable, ScrollView, Text, View} from 'react-native';

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: SelectFieldProps) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <>
      <View>
        {label ? (
          <Text className="mb-1 text-sm font-medium text-gray-700">
            {label}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          className={clsx('ui-select-field', disabled && 'opacity-50')}
          onPress={() => {
            setOpen(true);
          }}
        >
          <Text className="text-base text-gray-900">
            {selected?.label ?? value}
          </Text>
        </Pressable>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOpen(false);
        }}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => {
            setOpen(false);
          }}
        >
          <Pressable
            className="max-h-80 rounded-t-2xl bg-white"
            onPress={event => {
              event.stopPropagation();
            }}
          >
            <ScrollView>
              {options.map(option => (
                <Pressable
                  key={option.value}
                  className="border-b border-gray-50 px-4 py-3"
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    className={clsx('text-sm', {
                      'text-primary font-medium': option.value === value,
                      'text-gray-800': option.value !== value,
                    })}
                  >
                    {option.label}
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

if (__DEV__) {
  const SelectFieldDemo = () => {
    const [value, setValue] = useState('a');

    return (
      <SelectField
        label="Choose one"
        value={value}
        onChange={setValue}
        options={[
          {value: 'a', label: 'Option A'},
          {value: 'b', label: 'Option B'},
        ]}
      />
    );
  };

  SelectField.demo = () => <SelectFieldDemo />;
}
