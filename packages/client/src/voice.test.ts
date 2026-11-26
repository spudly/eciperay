import {eciperayVoice} from './voice';

describe('eciperayVoice', () => {
  it('fills the plain shared labels', () => {
    expect(eciperayVoice.common.cancelLabel).toBe('Cancel');
    expect(eciperayVoice.common.saveLabel).toBe('Save');
    expect(eciperayVoice.signInPage.heading).toBe('Welcome back');
    expect(eciperayVoice.ratingForm.title).toBe('How did it go?');
  });

  it('keeps error copy plain', () => {
    expect(eciperayVoice.routeErrorPage.errorTitle).toBe(
      'Something went wrong',
    );
    expect(eciperayVoice.routeErrorPage.notFoundTitle).toBe('Page not found');
  });

  it('formats the selection and row formatters', () => {
    expect(eciperayVoice.bulkSelectToolbar.selectedLabel(3)).toBe('3 selected');
    expect(eciperayVoice.recipeIngredientRowView.quantityLabel(2)).toBe(
      'Ingredient 2 quantity',
    );
    expect(eciperayVoice.recipeIngredientRowView.unitLabel(2)).toBe(
      'Ingredient 2 unit',
    );
    expect(eciperayVoice.recipeIngredientRowView.nameLabel(2)).toBe(
      'Ingredient 2 name',
    );
    expect(eciperayVoice.recipeIngredientRowView.removeIngredientLabel(2)).toBe(
      'Remove ingredient 2',
    );
    expect(eciperayVoice.recipeInstructionRowView.stepLabel(4)).toBe('Step 4');
    expect(eciperayVoice.recipeInstructionRowView.removeStepLabel(4)).toBe(
      'Remove step 4',
    );
  });

  it('formats the page and picker formatters', () => {
    expect(
      eciperayVoice.legalDocumentPage.lastUpdatedLabel('Nov 1, 2026'),
    ).toBe('Last updated: Nov 1, 2026');
    expect(eciperayVoice.autocompletePicker.resultsAvailableLabel(1)).toBe(
      '1 result available',
    );
    expect(eciperayVoice.autocompletePicker.resultsAvailableLabel(5)).toBe(
      '5 results available',
    );
    expect(eciperayVoice.autocompletePicker.removeItemLabel('Salt')).toBe(
      'Remove Salt',
    );
    expect(eciperayVoice.colorPickerField.selectColorLabel('Red')).toBe(
      'Select color Red',
    );
    expect(eciperayVoice.starRatingInput.ratedLabel(4)).toBe(
      'Rated 4 out of 5 stars',
    );
    expect(eciperayVoice.starRatingInput.rateLabel(5)).toBe(
      'Rate 5 out of 5 stars',
    );
  });
});
