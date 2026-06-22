export const isCommentStale = (
  commentContentRevision: number | null,
  recipeContentRevision: number,
): boolean => {
  if (commentContentRevision === null) {
    return false;
  }
  return commentContentRevision < recipeContentRevision;
};
