import {
  AddRecipeMenuPage,
  type AddRecipeMenuPageOption,
} from '@spudly/ui/pages';

// Navigation crosses as hrefs (#248): each option carries its route
// and the page renders real links — no press callback.
const OPTIONS: AddRecipeMenuPageOption[] = [
  {
    label: 'Manual entry',
    description: 'Type in a recipe from scratch',
    href: '/add/manual',
  },
  {
    label: 'Import from URL',
    description: 'Paste a recipe link',
    href: '/add/url',
  },
  {
    label: 'Import from image',
    description: 'Upload a photo of a recipe',
    href: '/add/image',
  },
  {
    label: 'Import from text',
    description: 'Paste rich text from Word or the web',
    href: '/add/text',
  },
  {
    label: 'Generate with AI',
    description: 'Describe the recipe you want and let AI create it',
    href: '/add/ai',
  },
];

export const AddPage = () => <AddRecipeMenuPage options={OPTIONS} />;
