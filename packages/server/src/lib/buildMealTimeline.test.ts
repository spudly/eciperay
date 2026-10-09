import {buildMealTimeline} from './buildMealTimeline.js';

describe('buildMealTimeline', () => {
  test('offsets shorter recipes to finish together', () => {
    const {totalDurationMin, steps} = buildMealTimeline([
      {
        recipeId: 'a',
        recipeTitle: 'A',
        recipeSortOrder: 0,
        instructionId: 'a1',
        stepNumber: 1,
        body: 'A1',
        durationMin: 10,
      },
      {
        recipeId: 'b',
        recipeTitle: 'B',
        recipeSortOrder: 1,
        instructionId: 'b1',
        stepNumber: 1,
        body: 'B1',
        durationMin: 30,
      },
    ]);
    expect(totalDurationMin).toBe(30);
    const aStep = steps.find(step => step.recipeId === 'a');
    const bStep = steps.find(step => step.recipeId === 'b');
    expect(aStep?.startOffsetMin).toBe(20);
    expect(bStep?.startOffsetMin).toBe(0);
  });

  test('sorts same-offset steps by recipe order then step number', () => {
    const {steps} = buildMealTimeline([
      {
        recipeId: 'b',
        recipeTitle: 'B',
        recipeSortOrder: 1,
        instructionId: 'b2',
        stepNumber: 2,
        body: 'B2',
        durationMin: 5,
      },
      {
        recipeId: 'a',
        recipeTitle: 'A',
        recipeSortOrder: 0,
        instructionId: 'a1',
        stepNumber: 1,
        body: 'A1',
        durationMin: 5,
      },
    ]);
    expect(steps[0]?.recipeId).toBe('a');
    expect(steps[1]?.recipeId).toBe('b');
  });

  test('breaks ties by step number', () => {
    const {steps} = buildMealTimeline([
      {
        recipeId: 'a',
        recipeTitle: 'A',
        recipeSortOrder: 0,
        instructionId: 'a2',
        stepNumber: 2,
        body: 'A2',
        durationMin: 5,
      },
      {
        recipeId: 'a',
        recipeTitle: 'A',
        recipeSortOrder: 0,
        instructionId: 'a1',
        stepNumber: 1,
        body: 'A1',
        durationMin: 5,
      },
    ]);
    expect(steps[0]?.stepNumber).toBe(1);
    expect(steps[1]?.stepNumber).toBe(2);
  });

  test('orders zero-duration steps on the same offset by step number', () => {
    const {steps} = buildMealTimeline([
      {
        recipeId: 'a',
        recipeTitle: 'A',
        recipeSortOrder: 0,
        instructionId: 'a2',
        stepNumber: 2,
        body: 'A2',
        durationMin: 0,
      },
      {
        recipeId: 'a',
        recipeTitle: 'A',
        recipeSortOrder: 0,
        instructionId: 'a1',
        stepNumber: 1,
        body: 'A1',
        durationMin: 0,
      },
    ]);
    expect(steps[0]?.stepNumber).toBe(1);
    expect(steps[1]?.stepNumber).toBe(2);
  });
});
