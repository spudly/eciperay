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

  test('highlights the drop zone while dragging', () => {
    render(<RecipeImageField {...defaultProps} />);
    const dropZone = screen.getByLabelText('Recipe image drop zone');
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    expect(dropZone.className).toContain('border-primary');
    fireEvent.dragLeave(dropZone, {relatedTarget: document.body});
    expect(dropZone.className).not.toContain('border-primary');
  });

  test('ignores paste events that start in text inputs', () => {
    const onImageFile = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        onImageFile={onImageFile}
      />,
    );
    const textarea = document.createElement('textarea');
    screen.getByText('Recipe image').parentElement?.appendChild(textarea);
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.paste(textarea, {clipboardData: {files: [file], items: []}});
    expect(onImageFile).not.toHaveBeenCalled();
  });

  test('ignores paste events without an image file', () => {
    const onImageFile = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        onImageFile={onImageFile}
      />,
    );
    fireEvent.paste(screen.getByLabelText('Recipe image drop zone'), {
      clipboardData: {files: [], items: []},
    });
    expect(onImageFile).not.toHaveBeenCalled();
  });

  test('shows preview, errors, and remove action', async () => {
    const onRemove = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        imagePreview="https://example.com/preview.png"
        imageError="Upload failed"
        onRemove={onRemove}
      />,
    );
    expect(screen.getByAltText('Recipe preview')).toBeInTheDocument();
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Remove image'));
    expect(onRemove).toHaveBeenCalled();
  });

  test('ignores browse changes without a selected file', () => {
    const onImageFile = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        onImageFile={onImageFile}
      />,
    );
    fireEvent.change(screen.getByLabelText('Browse images'), {
      target: {files: []},
    });
    expect(onImageFile).not.toHaveBeenCalled();
  });

  test('ignores files while an upload is in progress', () => {
    const onImageFile = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        imageUploading
        onImageFile={onImageFile}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.drop(screen.getByLabelText('Recipe image drop zone'), {
      dataTransfer: {files: [file], items: []},
    });
    expect(onImageFile).not.toHaveBeenCalled();
  });
});
