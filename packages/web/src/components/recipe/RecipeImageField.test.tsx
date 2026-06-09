import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {RecipeImageField} from './RecipeImageField.js';

describe('RecipeImageField', () => {
  const defaultProps = {
    imagePreview: null,
    imageUploading: false,
    imageError: null,
    onImageFile: vi.fn(),
    onRemove: vi.fn(),
  };

  test('accepts a dropped image file', async () => {
    const onImageFile = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        onImageFile={onImageFile}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.drop(screen.getByLabelText('Recipe image drop zone'), {
      dataTransfer: {files: [file], items: []},
    });
    await waitFor(() => {
      expect(onImageFile).toHaveBeenCalledWith(file);
    });
  });

  test('accepts a pasted image file', async () => {
    const onImageFile = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        onImageFile={onImageFile}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.paste(screen.getByLabelText('Recipe image drop zone'), {
      clipboardData: {
        files: [],
        items: [{kind: 'file', type: 'image/png', getAsFile: () => file}],
      },
    });
    await waitFor(() => {
      expect(onImageFile).toHaveBeenCalledWith(file);
    });
  });

  test('browse input forwards the selected file', async () => {
    const onImageFile = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        onImageFile={onImageFile}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    expect(onImageFile).toHaveBeenCalledWith(file);
  });
});
