import {useLingui} from '@lingui/react';
import {AddRecipeMenuPage, type AddRecipeMenuPageOption} from '@spudly/ui';

// The menu options' labels and descriptions are page-unique copy and
// flow through the Lingui catalogs (#465 tranche 9: explicit ids
// `add.<option>Label` / `add.<option>Description`); the page chrome
// itself is rendered by the design system's AddRecipeMenuPage, whose
// copy is DS-owned. Navigation crosses as hrefs (#248): each option
// carries its route and the page renders real links — no press
// callback.
export const AddPage = () => {
  const {i18n} = useLingui();

  const options: AddRecipeMenuPageOption[] = [
    {
      label: i18n._({id: 'add.manualEntryLabel', message: 'Manual entry'}),
      description: i18n._({
        id: 'add.manualEntryDescription',
        message: 'Type in a recipe from scratch',
      }),
      href: '/add/manual',
    },
    {
      label: i18n._({id: 'add.importUrlLabel', message: 'Import from URL'}),
      description: i18n._({
        id: 'add.importUrlDescription',
        message: 'Paste a recipe link',
      }),
      href: '/add/url',
    },
    {
      label: i18n._({id: 'add.importImageLabel', message: 'Import from image'}),
      description: i18n._({
        id: 'add.importImageDescription',
        message: 'Upload a photo of a recipe',
      }),
      href: '/add/image',
    },
    {
      label: i18n._({id: 'add.importTextLabel', message: 'Import from text'}),
      description: i18n._({
        id: 'add.importTextDescription',
        message: 'Paste rich text from Word or the web',
      }),
      href: '/add/text',
    },
    {
      label: i18n._({id: 'add.generateAiLabel', message: 'Generate with AI'}),
      description: i18n._({
        id: 'add.generateAiDescription',
        message: 'Describe what’s in your head (or your fridge) and let AI draft the recipe',
      }),
      href: '/add/ai',
    },
  ];

  return <AddRecipeMenuPage options={options} />;
};
