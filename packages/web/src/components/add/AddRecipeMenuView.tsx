import type {
  AddRecipeMenuViewProps,
  ShowcaseFrameProps,
} from '@eciperay/client';
import type {ComponentType} from 'react';

import {OptionCard} from '../ui/OptionCard.js';
import {PageTitle} from '../ui/PageTitle.js';

export const AddRecipeMenuView = ({options}: AddRecipeMenuViewProps) => (
  <div>
    <PageTitle spacing="section">Add Recipe</PageTitle>
    <div className="space-y-3">
      {options.map(option => (
        <OptionCard
          key={option.target}
          title={option.label}
          description={option.description}
          to={option.target}
        />
      ))}
    </div>
  </div>
);

if (import.meta.env.DEV) {
  AddRecipeMenuView.demo = function AddRecipeMenuViewDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    const mockAddRecipeOptions = [
      {
        label: 'Manual entry',
        description: 'Type a recipe from scratch',
        target: '/add/manual',
      },
      {
        label: 'Import URL',
        description: 'Paste a link to a recipe page',
        target: '/add/url',
      },
    ];

    return (
      <Frame>
        <AddRecipeMenuView options={mockAddRecipeOptions} />
      </Frame>
    );
  };
}
