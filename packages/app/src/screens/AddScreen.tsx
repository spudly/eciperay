import {
  AddRecipeMenuPage,
  type AddRecipeMenuPageOption,
} from '@spudly/ui/pages';

import {addOptionHrefs} from '../lib/deepLinks';

// Navigation crosses as hrefs (#248): each option carries its
// in-app deep link (routed by the linking config in RootNavigator)
// and the page renders real links — no press callback, so this
// screen no longer needs its navigation prop.
const OPTIONS: AddRecipeMenuPageOption[] = [
  {
    label: 'Manual entry',
    description: 'Type your recipe from scratch',
    href: addOptionHrefs.manual,
  },
  {
    label: 'Import from URL',
    description: 'Paste a link to any recipe website',
    href: addOptionHrefs.url,
  },
  {
    label: 'Import from image',
    description: 'Take a photo or use your library',
    href: addOptionHrefs.image,
  },
  {
    label: 'Import from text',
    description: 'Paste rich text from Word or the web',
    href: addOptionHrefs.text,
  },
  {
    label: 'Generate with AI',
    description: 'Describe the recipe you want and let AI create it',
    href: addOptionHrefs.ai,
  },
];

export const AddScreen = () => <AddRecipeMenuPage options={OPTIONS} />;
