import type {NutritionGoals} from '@eciperay/types';
import {act, renderHook, waitFor} from '@testing-library/react';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {createWrapper} from '../../test/testUtils.js';

import {useProfileNutritionGoalsProps} from './ProfileNutritionGoalsSection.js';

// DS 14: the section is a hook returning ProfilePage's nutritionGoals
// data prop; the DS form owns field rendering/parsing, so the tests
// pin the host logic — saved goals load into the prop and onSave
// persists the whole-goals state the prop's onChange accumulated.
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

describe('useProfileNutritionGoalsProps', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('loads saved goals and saves an edited decimal value', async () => {
    vi.spyOn(eciperay.account, 'getNutritionGoals').mockResolvedValue(
      emptyGoals,
    );
    const putSpy = vi
      .spyOn(eciperay.account, 'putNutritionGoals')
      .mockImplementation(async goals => goals);
    const {Wrapper} = createWrapper({withAuth: false});
    const {result} = renderHook(() => useProfileNutritionGoalsProps(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.goals).toEqual(emptyGoals);
    });

    act(() => {
      result.current.onChange({...emptyGoals, caloriesMin: 1.5});
    });
    act(() => {
      result.current.onSave();
    });
    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledWith({...emptyGoals, caloriesMin: 1.5});
    });
    expect(result.current.error).toBeNull();
  });

  test('surfaces a save error on the prop', async () => {
    vi.spyOn(eciperay.account, 'getNutritionGoals').mockResolvedValue(
      emptyGoals,
    );
    vi.spyOn(eciperay.account, 'putNutritionGoals').mockRejectedValue(
      new Error('Goals failed'),
    );
    const {Wrapper} = createWrapper({withAuth: false});
    const {result} = renderHook(() => useProfileNutritionGoalsProps(), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.onSave();
    });
    await waitFor(() => {
      expect(result.current.error).toBe('Goals failed');
    });
  });
});
