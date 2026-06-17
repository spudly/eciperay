import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';

import {
  applyInstructionDragEnd,
  createEmptyInstructionRow,
  dragRowOpacity,
  instructionListDragEnd,
  SortableInstructionList,
} from './SortableInstructionList.js';

describe('SortableInstructionList', () => {
  test('uses reduced opacity while dragging', () => {
    expect(dragRowOpacity(true)).toBe(0.6);
    expect(dragRowOpacity(false)).toBe(1);
  });

  test('reorders instructions when a drag ends', () => {
    const onChange = vi.fn();
    const instructions = [
      {...createEmptyInstructionRow(1), key: 'step-1', body: 'Prep'},
      {...createEmptyInstructionRow(2), key: 'step-2', body: 'Cook'},
    ];

    applyInstructionDragEnd(
      {active: {id: 'step-2'}, over: {id: 'step-1'}} as never,
      instructions,
      onChange,
    );

    expect(onChange).toHaveBeenCalledWith([
      {...instructions[1], body: 'Cook'},
      {...instructions[0], body: 'Prep'},
    ]);
  });

  test('ignores invalid drag end events', () => {
    const onChange = vi.fn();
    const instructions = [
      {...createEmptyInstructionRow(1), key: 'step-1', body: 'Prep'},
    ];

    applyInstructionDragEnd(
      {active: {id: 'step-1'}, over: {id: 'step-1'}} as never,
      instructions,
      onChange,
    );
    applyInstructionDragEnd(
      {active: {id: 'missing'}, over: {id: 'step-1'}} as never,
      instructions,
      onChange,
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  test('removes an instruction row', async () => {
    const onChange = vi.fn();
    render(
      <SortableInstructionList
        instructions={[
          {...createEmptyInstructionRow(1), key: 'step-1', body: 'Prep'},
          {...createEmptyInstructionRow(2), key: 'step-2', body: 'Cook'},
        ]}
        onChange={onChange}
        onUpdate={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    await userEvent.click(screen.getAllByText('Remove')[0]!);
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({key: 'step-2', body: 'Cook'}),
    ]);
  });

  test('wires drag end through the list handler', () => {
    const onChange = vi.fn();
    const instructions = [
      {...createEmptyInstructionRow(1), key: 'step-1', body: 'Prep'},
      {...createEmptyInstructionRow(2), key: 'step-2', body: 'Cook'},
    ];

    instructionListDragEnd(
      instructions,
      onChange,
    )({active: {id: 'step-2'}, over: {id: 'step-1'}} as never);

    expect(onChange).toHaveBeenCalled();
  });

  test('renders drag handles for each instruction row', () => {
    render(
      <SortableInstructionList
        instructions={[
          {...createEmptyInstructionRow(1), key: 'step-1', body: 'Prep'},
          {...createEmptyInstructionRow(2), key: 'step-2', body: 'Cook'},
        ]}
        onChange={vi.fn()}
        onUpdate={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {name: 'Reorder step 1'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Reorder step 2'}),
    ).toBeInTheDocument();
  });
});
