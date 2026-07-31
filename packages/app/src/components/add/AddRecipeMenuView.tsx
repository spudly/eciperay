import type {AddRecipeMenuViewProps} from '@eciperay/client';

import {OptionCard} from '../ui/OptionCard';
import {PageTitle} from '../ui/PageTitle';
import {ScreenContainer} from '../ui/ScreenContainer';

export const AddRecipeMenuView = ({
  options,
  onSelect,
}: AddRecipeMenuViewProps) => (
  <ScreenContainer variant="padded">
    <PageTitle spacing="section">Add Recipe</PageTitle>
    {options.map(option => (
      <OptionCard
        key={option.target}
        title={option.label}
        description={option.description}
        onPress={() => {
          onSelect?.(option.target);
        }}
      />
    ))}
  </ScreenContainer>
);

if (__DEV__) {
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

  AddRecipeMenuView.demo = () => (
    <AddRecipeMenuView
      options={mockAddRecipeOptions}
      onSelect={() => {
        void 0;
      }}
    />
  );
}
