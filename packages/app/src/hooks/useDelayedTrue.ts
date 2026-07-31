import {useEffect, useState} from 'react';

export const DEFAULT_LOADING_DELAY_MS = 100;

export const useDelayedTrue = (
  value: boolean,
  delayMs = DEFAULT_LOADING_DELAY_MS,
): boolean => {
  const [delayedValue, setDelayedValue] = useState(false);

  useEffect(() => {
    if (!value) {
      setDelayedValue(false);
      return;
    }

    const timer = setTimeout(() => {
      setDelayedValue(true);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return delayedValue;
};
