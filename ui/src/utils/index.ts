import { useEffect, useState } from "react";

export const useDebouncedValue = <T>(inputValue: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(inputValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, delay]);

  return debouncedValue;
};

export const getUrlParameter = (paramName: string): string | null => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get(paramName);
};

export const setUrlParameter = (paramName: string, paramValue: string): URLSearchParams => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  urlParams.set(paramName, paramValue);
  return urlParams;
};

export const deleteUrlParameter = (paramName: string): URLSearchParams => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  urlParams.delete(paramName);
  return urlParams;
};
