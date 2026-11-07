import type {NutritionGoals} from '@eciperay/types';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {ProfileNutritionGoalsSection} from './ProfileNutritionGoalsSection.js';

const emptyGoals: NutritionGoals = {
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  satietyScore: null,
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

    const caloriesField = await screen.findByLabelText('Calories');
    await user.type(caloriesField, '1.5');
    expect(caloriesField).toHaveValue('1.5');

    await user.click(screen.getByRole('button', {name: 'Save goals'}));
    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledWith({...emptyGoals, calories: 1.5});
    });
    expect(caloriesField).toHaveValue('1.5');
  });
});
