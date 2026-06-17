import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';

import {
  applyIngredientDragEnd,
  createEmptyIngredientRow,
  dragRowOpacity,
  ingredientListDragEnd,
  SortableIngredientList,
} from './SortableIngredientList.js';

describe('SortableIngredientList', () => {
  test('uses reduced opacity while dragging', () => {
    expect(dragRowOpacity(true)).toBe(0.6);
    expect(dragRowOpacity(false)).toBe(1);
  });

  test('renders drag handles for each ingredient row', () => {
    render(
      <SortableIngredientList
        ingredients={[
          createEmptyIngredientRow(0),
          {...createEmptyIngredientRow(1), name: 'Salt', key: 'salt'},
        ]}
        onChange={vi.fn()}
        onUpdate={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {name: 'Reorder ingredient 1'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Reorder ingredient 2'}),
    ).toBeInTheDocument();
  });

  test('reorders ingredients when a drag ends', () => {
    const onChange = vi.fn();
    const ingredients = [
      {...createEmptyIngredientRow(0), key: 'flour', name: 'Flour'},
      {...createEmptyIngredientRow(1), key: 'salt', name: 'Salt'},
    ];

    applyIngredientDragEnd(
      {active: {id: 'flour'}, over: {id: 'salt'}} as never,
      ingredients,
      onChange,
    );

    expect(onChange).toHaveBeenCalledWith([
      {...ingredients[1], name: 'Salt'},
      {...ingredients[0], name: 'Flour'},
    ]);
  });

  test('ignores invalid drag end events', () => {
    const onChange = vi.fn();
    const ingredients = [
      {...createEmptyIngredientRow(0), key: 'flour', name: 'Flour'},
    ];

    applyIngredientDragEnd(
      {active: {id: 'flour'}, over: null} as never,
      ingredients,
      onChange,
    );
    applyIngredientDragEnd(
      {active: {id: 'missing'}, over: {id: 'flour'}} as never,
      ingredients,
      onChange,
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  test('removes an ingredient row', async () => {
    const onChange = vi.fn();
    render(
      <SortableIngredientList
        ingredients={[
          {...createEmptyIngredientRow(0), key: 'flour', name: 'Flour'},
          {...createEmptyIngredientRow(1), key: 'salt', name: 'Salt'},
        ]}
        onChange={onChange}
        onUpdate={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    await userEvent.click(screen.getAllByText('Remove')[0]!);
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({key: 'salt', name: 'Salt'}),
    ]);
  });

  test('wires drag end through the list handler', () => {
    const onChange = vi.fn();
    const ingredients = [
      {...createEmptyIngredientRow(0), key: 'flour', name: 'Flour'},
      {...createEmptyIngredientRow(1), key: 'salt', name: 'Salt'},
    ];

    ingredientListDragEnd(
      ingredients,
      onChange,
    )({active: {id: 'flour'}, over: {id: 'salt'}} as never);

    expect(onChange).toHaveBeenCalled();
  });

  test('adds a new ingredient row', async () => {
    const onAdd = vi.fn();
    render(
      <SortableIngredientList
        ingredients={[createEmptyIngredientRow(0)]}
        onChange={vi.fn()}
        onUpdate={vi.fn()}
        onAdd={onAdd}
      />,
    );

    await userEvent.click(screen.getByText('+ Add'));
    expect(onAdd).toHaveBeenCalled();
  });
});
