import type { NavigateFunction } from "react-router-dom";

/**
 * Safely navigate back one step. If there's no history (e.g. deep link),
 * navigate to the provided fallback route instead.
 */
export const safeGoBack = (navigate: NavigateFunction, fallback: string = "/") => {
  if (window.history.length > 2) {
    navigate(-1);
  } else {
    navigate(fallback, { replace: true });
  }
};
