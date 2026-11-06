import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {cropImageFile} from '../../lib/recipeImageCrop.js';

import {RecipeImageField} from './RecipeImageField.js';

vi.mock('../../lib/recipeImageCrop.js', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../lib/recipeImageCrop.js')>();
  return {...actual, cropImageFile: vi.fn()};
});

const mockCropImageFile = vi.mocked(cropImageFile);

/**
 * Simulate the pending preview finishing loading at 1200x900: jsdom never fires
 * img load on its own, and the component reads naturalWidth/Height from the
 * load event before it enables cropping.
 */
const loadPendingPreview = () => {
  const preview = screen.getByAltText('Recipe preview');
  Object.defineProperty(preview, 'naturalWidth', {value: 1200});
  Object.defineProperty(preview, 'naturalHeight', {value: 900});
  fireEvent.load(preview);
};

/** Select a file through the drop zone, then skip cropping ("Use image"). */
const dropAndUse = async (file: File) => {
  fireEvent.drop(screen.getByLabelText('Recipe image drop zone'), {
    dataTransfer: {files: [file], items: []},
  });
  await userEvent.click(screen.getByRole('button', {name: 'Use image'}));
};

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
    await dropAndUse(file);
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
    await userEvent.click(screen.getByRole('button', {name: 'Use image'}));
    await waitFor(() => {
      expect(onImageFile).toHaveBeenCalledWith(file);
    });
  });

  test('browse input forwards the selected file', async () => {
    const onImageFile = vi.fn();
    const {container} = render(
      <RecipeImageField
        {...defaultProps}
        onImageFile={onImageFile}
      />,
    );
    expect(
      screen.getByRole('button', {name: 'Browse images'}),
    ).toBeInTheDocument();
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(
      container.querySelector('#recipe-image-upload') as HTMLElement,
      file,
    );
    expect(onImageFile).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', {name: 'Use image'}));
    expect(onImageFile).toHaveBeenCalledWith(file);
  });

  test('highlights the drop zone while dragging', () => {
    render(<RecipeImageField {...defaultProps} />);
    const dropZone = screen.getByLabelText('Recipe image drop zone');
    fireEvent.dragEnter(dropZone);
    fireEvent.dragOver(dropZone);
    expect(dropZone.style.borderColor).toBe('rgb(194, 65, 12)');
    fireEvent.dragLeave(dropZone, {relatedTarget: document.body});
    expect(dropZone.style.borderColor).toBe('rgb(212, 212, 212)');
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
    fireEvent.change(
      document.querySelector('#recipe-image-upload') as HTMLElement,
      {target: {files: []}},
    );
    expect(onImageFile).not.toHaveBeenCalled();
  });

  test('calls onGenerateImage when generate is clicked', async () => {
    const onGenerateImage = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        onGenerateImage={onGenerateImage}
      />,
    );
    await userEvent.click(screen.getByText('Generate with AI'));
    expect(onGenerateImage).toHaveBeenCalled();
  });

  test('disables generate when title is missing or image is busy', () => {
    const onGenerateImage = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        canGenerateImage={false}
        onGenerateImage={onGenerateImage}
      />,
    );
    expect(screen.getByText('Generate with AI')).toBeDisabled();
    fireEvent.click(screen.getByText('Generate with AI'));
    expect(onGenerateImage).not.toHaveBeenCalled();
  });

  test('shows generating state and blocks file input', () => {
    const onImageFile = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        imageGenerating
        onImageFile={onImageFile}
        onGenerateImage={vi.fn()}
      />,
    );
    expect(screen.getByText('Generating…')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Browse images'})).toBeDisabled();
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.drop(screen.getByLabelText('Recipe image drop zone'), {
      dataTransfer: {files: [file], items: []},
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

  test('take photo input uses the device camera and forwards the file', async () => {
    const onImageFile = vi.fn();
    const {container} = render(
      <RecipeImageField
        {...defaultProps}
        onImageFile={onImageFile}
      />,
    );
    const captureInput = container.querySelector('#recipe-image-capture');
    expect(captureInput).not.toBeNull();
    expect(captureInput?.getAttribute('capture')).toBe('environment');
    expect(
      screen.getByRole('button', {name: 'Take photo'}),
    ).toBeInTheDocument();
    const file = new File(['pixels'], 'captured.png', {type: 'image/png'});
    await userEvent.upload(captureInput as HTMLElement, file);
    await userEvent.click(screen.getByRole('button', {name: 'Use image'}));
    expect(onImageFile).toHaveBeenCalledWith(file);
  });

  test('browse and take photo buttons open their file inputs', async () => {
    const {container} = render(<RecipeImageField {...defaultProps} />);
    const browseInput = container.querySelector(
      '#recipe-image-upload',
    ) as HTMLElement;
    const captureInput = container.querySelector(
      '#recipe-image-capture',
    ) as HTMLElement;
    const browseClick = vi.spyOn(browseInput, 'click');
    const captureClick = vi.spyOn(captureInput, 'click');
    await userEvent.click(screen.getByText('Browse images'));
    expect(browseClick).toHaveBeenCalled();
    await userEvent.click(screen.getByText('Take photo'));
    expect(captureClick).toHaveBeenCalled();
  });

  test('offers crop after a selection without calling onImageFile yet', async () => {
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
    expect(
      screen.getByRole('button', {name: 'Crop image'}),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Use image'})).toBeInTheDocument();
    expect(onImageFile).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', {name: 'Use image'}));
    expect(onImageFile).toHaveBeenCalledWith(file);
  });

  test('confirming crop passes the cropped file to onImageFile', async () => {
    const onImageFile = vi.fn();
    const cropped = new File(['cropped'], 'recipe.png', {type: 'image/png'});
    mockCropImageFile.mockResolvedValue(cropped);
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
    loadPendingPreview();
    await userEvent.click(screen.getByRole('button', {name: 'Crop image'}));
    expect(
      screen.getByRole('dialog', {name: 'Crop recipe image'}),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Image to crop')).toBeInTheDocument();
    expect(screen.getByLabelText(/Crop area/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Apply crop'}));
    await waitFor(() => {
      expect(onImageFile).toHaveBeenCalledWith(cropped);
    });
    expect(mockCropImageFile).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
    expect(onImageFile.mock.calls[0]?.[0]).toBe(cropped);
    expect(onImageFile.mock.calls[0]?.[0]).not.toBe(file);
  });

  test('crop stays disabled until the preview reports its dimensions', async () => {
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
    // Crop rectangles are in real-image pixels: until the preview load
    // reports them, opening crop would seed the rect from fallback dims.
    expect(screen.getByRole('button', {name: 'Crop image'})).toBeDisabled();
    loadPendingPreview();
    await waitFor(() => {
      expect(
        screen.getByRole('button', {name: 'Crop image'}),
      ).not.toBeDisabled();
    });
  });

  test('cancelling crop passes the original file unchanged', async () => {
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
    loadPendingPreview();
    await userEvent.click(screen.getByRole('button', {name: 'Crop image'}));
    await userEvent.click(screen.getByRole('button', {name: 'Cancel crop'}));
    expect(onImageFile).toHaveBeenCalledWith(file);
    expect(mockCropImageFile).not.toHaveBeenCalled();
  });

  test('a crop failure keeps the pending image and shows an error', async () => {
    const onImageFile = vi.fn();
    mockCropImageFile.mockRejectedValue(new Error('canvas failed'));
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
    loadPendingPreview();
    await userEvent.click(screen.getByRole('button', {name: 'Crop image'}));
    await userEvent.click(screen.getByRole('button', {name: 'Apply crop'}));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(onImageFile).not.toHaveBeenCalled();
  });

  test('discarding a pending image restores the browse controls', async () => {
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
    await userEvent.click(
      screen.getByRole('button', {name: 'Discard selected image'}),
    );
    expect(onImageFile).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', {name: 'Browse images'}),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Crop image'}),
    ).not.toBeInTheDocument();
  });

  test('reports the pending selection through onPendingChange', async () => {
    const onPendingChange = vi.fn();
    render(
      <RecipeImageField
        {...defaultProps}
        onPendingChange={onPendingChange}
      />,
    );
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.drop(screen.getByLabelText('Recipe image drop zone'), {
      dataTransfer: {files: [file], items: []},
    });
    await waitFor(() => {
      expect(onPendingChange).toHaveBeenLastCalledWith(true);
    });
    await userEvent.click(
      screen.getByRole('button', {name: 'Discard selected image'}),
    );
    await waitFor(() => {
      expect(onPendingChange).toHaveBeenLastCalledWith(false);
    });
  });

  test('stages a file handed in through stagedFile', async () => {
    const onImageFile = vi.fn();
    const onPendingChange = vi.fn();
    const onStagedFileHandled = vi.fn();
    const file = new File(['pixels'], 'pasted.png', {type: 'image/png'});
    render(
      <RecipeImageField
        {...defaultProps}
        onImageFile={onImageFile}
        onPendingChange={onPendingChange}
        stagedFile={file}
        onStagedFileHandled={onStagedFileHandled}
      />,
    );
    // The pasted file becomes the pending selection — nothing is
    // processed until the user uses, crops, or discards it.
    await waitFor(() => {
      expect(onStagedFileHandled).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('button', {name: 'Use image'})).toBeInTheDocument();
    expect(onPendingChange).toHaveBeenLastCalledWith(true);
    expect(onImageFile).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', {name: 'Use image'}));
    expect(onImageFile).toHaveBeenCalledWith(file);
  });

  test('shows an error when the selected image cannot be loaded', async () => {
    render(<RecipeImageField {...defaultProps} />);
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.drop(screen.getByLabelText('Recipe image drop zone'), {
      dataTransfer: {files: [file], items: []},
    });
    fireEvent.error(screen.getByAltText('Recipe preview'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'That image could not be loaded',
      );
    });
    // The pending controls stay available so the user can discard it.
    expect(
      screen.getByRole('button', {name: 'Discard selected image'}),
    ).toBeInTheDocument();
  });
});
