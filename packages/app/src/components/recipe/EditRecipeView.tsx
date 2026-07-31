import type {EditRecipeViewProps, ShowcaseDemoRenderer} from '@eciperay/client';

import {InfoBanner} from '../ui/InfoBanner';
import {PageTitle} from '../ui/PageTitle';
import {ScreenContainer} from '../ui/ScreenContainer';

export const EditRecipeView = ({children}: EditRecipeViewProps) => (
  <ScreenContainer>
    <PageTitle spacing="section">Edit Recipe</PageTitle>
    {children}
  </ScreenContainer>
);

if (__DEV__) {
  const editRecipeViewDemo: ShowcaseDemoRenderer = () => (
    <EditRecipeView>
      <InfoBanner>Recipe form body renders here on the real screen.</InfoBanner>
    </EditRecipeView>
  );
  EditRecipeView.demo = editRecipeViewDemo;
}
