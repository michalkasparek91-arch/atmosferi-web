const SESSION_KEY = "isNativeApp";

/**
 * Trigger a short haptic vibration in native-app context.
 * No-op on web or when the Vibration API is unavailable.
 */
export function hapticTap() {
  if (
    sessionStorage.getItem(SESSION_KEY) === "true" &&
    navigator.vibrate
  ) {
    navigator.vibrate(10);
  }
}
