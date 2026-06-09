export const getImageFileFromDataTransfer = (
  dataTransfer: DataTransfer,
): File | null => {
  if (dataTransfer.files.length > 0) {
    return dataTransfer.files[0] ?? null;
  }
  const imageItem = [...dataTransfer.items].find(
    item => item.kind === 'file' && item.type.startsWith('image/'),
  );
  if (!imageItem) {
    return null;
  }
  return imageItem.getAsFile();
};

export const shouldIgnoreImagePaste = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest('input, textarea, [contenteditable="true"]'));
};
