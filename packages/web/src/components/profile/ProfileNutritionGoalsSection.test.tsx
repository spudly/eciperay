import type {NutritionGoals} from '@eciperay/types';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {ProfileNutritionGoalsSection} from './ProfileNutritionGoalsSection.js';

const emptyGoals: NutritionGoals = {
  caloriesMin: null,
  caloriesMax: null,
  proteinGMin: null,
  proteinGMax: null,
  carbsGMin: null,
  carbsGMax: null,
  fatGMin: null,
  fatGMax: null,
  satietyScoreMin: null,
  satietyScoreMax: null,
};

describe('ProfileNutritionGoalsSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('allows typing a decimal goal and saves the decimal value', async () => {
    const user = userEvent.setup();
    vi.spyOn(eciperay.account, 'getNutritionGoals').mockResolvedValue(
      emptyGoals,
    );
    const putSpy = vi
      .spyOn(eciperay.account, 'putNutritionGoals')
      .mockImplementation(async goals => goals);
    await renderWithProviders(<ProfileNutritionGoalsSection />, {
      withAuth: false,
    });

    const caloriesField = await screen.findByLabelText('Calories min');
    await user.type(caloriesField, '1.5');
    expect(caloriesField).toHaveValue('1.5');

    await user.click(screen.getByRole('button', {name: 'Save goals'}));
    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledWith({...emptyGoals, caloriesMin: 1.5});
    });
    expect(caloriesField).toHaveValue('1.5');
  });
});
