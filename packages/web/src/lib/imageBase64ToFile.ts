export const imageBase64ToFile = (
  imageBase64: string,
  contentType: string,
  filename = 'recipe-image.png',
): File => {
  const bytes = Uint8Array.from(
    atob(imageBase64),
    /* c8 ignore next -- codePointAt(0) is always defined for decoded base64 characters */
    char => char.codePointAt(0) ?? 0,
  );
  return new File([bytes], filename, {type: contentType});
};
