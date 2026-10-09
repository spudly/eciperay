/** Copies defined (non-undefined) values from source onto target. */
export const assignDefined = <T extends object>(
  target: T,
  source: Partial<T>,
): T => {
  for (const [key, value] of Object.entries(source) as [
    keyof T,
    T[keyof T],
  ][]) {
    if (value !== undefined) {
      target[key] = value;
    }
  }
  return target;
};
