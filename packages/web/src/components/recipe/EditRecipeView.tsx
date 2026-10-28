// Parity note (design-system#124, B3a): the app renders the design
// system EditRecipePage shell; this web shell remains until B7.
import type {EditRecipeViewProps} from '@eciperay/client';

import {PageTitle} from '../ui/PageTitle.js';

export const EditRecipeView = ({children}: EditRecipeViewProps) => (
  <div>
    <PageTitle spacing="section">Edit Recipe</PageTitle>
    {children}
  </div>
);
