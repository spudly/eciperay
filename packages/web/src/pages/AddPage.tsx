import type {AddRecipeMenuOption} from '@eciperay/client';
import {useNavigate} from 'react-router-dom';

import {AddRecipeMenuPage} from '@spudly/ui/pages';

const OPTIONS: AddRecipeMenuOption[] = [
  {
    label: 'Manual entry',
    description: 'Type in a recipe from scratch',
    target: '/add/manual',
  },
  {
    label: 'Import from URL',
    description: 'Paste a recipe link',
    target: '/add/url',
  },
  {
    label: 'Import from image',
    description: 'Upload a photo of a recipe',
    target: '/add/image',
  },
  {
    label: 'Import from text',
    description: 'Paste rich text from Word or the web',
    target: '/add/text',
  },
  {
    label: 'Generate with AI',
    description: 'Describe the recipe you want and let AI create it',
    target: '/add/ai',
  },
];

export const AddPage = () => {
  const navigate = useNavigate();

  return (
    <AddRecipeMenuPage
      options={OPTIONS}
      onSelect={target => {
        void navigate(target);
      }}
    />
  );
};
