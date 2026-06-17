export const reorderListItem = <T>(
  list: T[],
  from: number,
  to: number,
): T[] => {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(from, 1);
  /* c8 ignore next 3 -- splice only returns undefined when index is invalid */
  if (moved === undefined) {
    return list;
  }
  next.splice(to, 0, moved);
  return next;
};

export const reorderRowsByKey = <T extends {key: string}>(
  rows: T[],
  activeKey: string,
  overKey: string,
): T[] => {
  if (activeKey === overKey) {
    return rows;
  }
  const from = rows.findIndex(row => row.key === activeKey);
  const to = rows.findIndex(row => row.key === overKey);
  if (from === -1 || to === -1) {
    return rows;
  }
  return reorderListItem(rows, from, to);
};
