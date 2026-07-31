import type {AddRecipeMenuOption} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {AddRecipeMenuView} from '../components/add/AddRecipeMenuView';
import type {AddStackParamList} from '../navigation/types';

type AddProps = NativeStackScreenProps<AddStackParamList, 'AddScreen'>;

const OPTIONS: AddRecipeMenuOption[] = [
  {
    label: 'Manual entry',
    description: 'Type your recipe from scratch',
    target: 'ManualEntry',
  },
  {
    label: 'Import from URL',
    description: 'Paste a link to any recipe website',
    target: 'ImportUrl',
  },
  {
    label: 'Import from image',
    description: 'Take a photo or use your library',
    target: 'ImportImage',
  },
  {
    label: 'Import from text',
    description: 'Paste rich text from Word or the web',
    target: 'ImportText',
  },
  {
    label: 'Generate with AI',
    description: 'Describe the recipe you want and let AI create it',
    target: 'GenerateAi',
  },
];

export const AddScreen = ({navigation}: AddProps) => (
  <AddRecipeMenuView
    options={OPTIONS}
    onSelect={target => {
      navigation.navigate(
        target as keyof Omit<AddStackParamList, 'AddScreen' | 'ImportReview'>,
      );
    }}
  />
);
