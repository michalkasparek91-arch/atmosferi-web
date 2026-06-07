import { useMemo } from "react";

const SESSION_KEY = "isNativeApp";

/**
 * Detects whether the app is running inside a native Capacitor wrapper.
 * Returns `true` if:
 *   - The URL contains `?source=app`
 *   - OR the user-agent contains `Capacitor`, `ZrobeeApp`, or `MobileWrapper`
 *
 * Once detected the flag is persisted in sessionStorage so subsequent
 * navigations (which strip the query param) still return `true`.
 */
export const useIsNativeApp = (): boolean => {
  return useMemo(() => {
    // Fast path – already detected earlier in this session
    if (sessionStorage.getItem(SESSION_KEY) === "true") return true;

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("source") === "app";

    const ua = navigator.userAgent;
    const fromUA =
      /Capacitor|ZrobeeApp|MobileWrapper/i.test(ua);

    const isNative = fromUrl || fromUA;

    if (isNative) {
      sessionStorage.setItem(SESSION_KEY, "true");
    }

    return isNative;
  }, []);
};
