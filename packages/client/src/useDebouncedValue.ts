import {useEffect, useState} from 'react';

/** Default delay before a form picker's search text drives its query. */
export const DEBOUNCED_VALUE_DELAY_MS = 300;

/**
 * Returns `value` delayed by `delayMs`: the returned value only follows the
 * input after it has stayed unchanged for the delay, so a burst of keystrokes
 * in a search field produces one query for the settled text instead of one per
 * keystroke (#359 picker search).
 */
export const useDebouncedValue = <T>(
  value: T,
  delayMs = DEBOUNCED_VALUE_DELAY_MS,
): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
};
