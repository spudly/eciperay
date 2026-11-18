import {useLingui} from '@lingui/react';
import {AddRecipeMenuPage, type AddRecipeMenuPageOption} from '@spudly/ui';

import {addOptionHrefs} from '../lib/deepLinks';

// The menu options' labels and descriptions are page-unique copy and
// flow through the Lingui catalogs (#465 tranche 9: explicit ids
// `add.<option>Label` / `add.<option>Description`, shared with web but
// with this platform's own wording in its catalogs where the two
// platforms differ); the page chrome itself is rendered by the design
// system's AddRecipeMenuPage, whose copy is DS-owned. Navigation
// crosses as hrefs (#248): each option carries its in-app deep link
// (routed by the linking config in RootNavigator) and the page renders
// real links — no press callback, so this screen no longer needs its
// navigation prop.
export const AddScreen = () => {
  const {i18n} = useLingui();

  const options: AddRecipeMenuPageOption[] = [
    {
      label: i18n._({id: 'add.manualEntryLabel', message: 'Manual entry'}),
      description: i18n._({
        id: 'add.manualEntryDescription',
        message: 'Type your recipe from scratch',
      }),
      href: addOptionHrefs.manual,
    },
    {
      label: i18n._({id: 'add.importUrlLabel', message: 'Import from URL'}),
      description: i18n._({
        id: 'add.importUrlDescription',
        message: 'Paste a link to any recipe website',
      }),
      href: addOptionHrefs.url,
    },
    {
      label: i18n._({id: 'add.importImageLabel', message: 'Import from image'}),
      description: i18n._({
        id: 'add.importImageDescription',
        message: 'Take a photo or use your library',
      }),
      href: addOptionHrefs.image,
    },
    {
      label: i18n._({id: 'add.importTextLabel', message: 'Import from text'}),
      description: i18n._({
        id: 'add.importTextDescription',
        message: 'Paste rich text from Word or the web',
      }),
      href: addOptionHrefs.text,
    },
    {
      label: i18n._({id: 'add.generateAiLabel', message: 'Generate with AI'}),
      description: i18n._({
        id: 'add.generateAiDescription',
        message: 'Describe the recipe you want and let AI create it',
      }),
      href: addOptionHrefs.ai,
    },
  ];

  return <AddRecipeMenuPage options={options} />;
};
