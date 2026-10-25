// Parity note (design-system#124, B3a): the app renders the design
// system EditRecipePage shell; this web shell remains until B7.
import type {EditRecipeViewProps, ShowcaseDemoRenderer} from '@eciperay/client';

import {InfoBanner} from '../ui/InfoBanner.js';
import {PageTitle} from '../ui/PageTitle.js';

export const EditRecipeView = ({children}: EditRecipeViewProps) => (
  <div>
    <PageTitle spacing="section">Edit Recipe</PageTitle>
    {children}
  </div>
);

if (import.meta.env.DEV) {
  const editRecipeViewDemo: ShowcaseDemoRenderer = () => (
    <EditRecipeView>
      <InfoBanner>Recipe form body renders here on the real screen.</InfoBanner>
    </EditRecipeView>
  );
  EditRecipeView.demo = editRecipeViewDemo;
}
