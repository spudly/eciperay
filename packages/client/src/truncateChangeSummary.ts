export const truncateChangeSummary = (text: string, maxLength = 48): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
};
