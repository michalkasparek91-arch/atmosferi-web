import { useEffect } from "react";

/**
 * A hook that syncs a boolean state with the browser history.
 * When the state becomes true, it pushes an entry to the history.
 * When the user hits the back button, it calls the onClose callback.
 * 
 * @param isOpen The current open state
 * @param onClose Callback to close the state
 * @param stateKey A unique key for this history state (e.g., 'modal-open')
 */
export const useHistoryState = (
  isOpen: boolean,
  onClose: () => void,
  stateKey: string = "modal-open"
) => {
  useEffect(() => {
    if (isOpen) {
      // Push a new state when opened
      const state = { [stateKey]: true };
      window.history.pushState(state, "");

      const handlePopState = (event: PopStateEvent) => {
        // If the state we pushed is no longer current, close the modal
        if (!event.state || !event.state[stateKey]) {
          onClose();
        }
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        
        // Clean up: if the component unmounts while "open" (e.g. navigation),
        // we might want to pop the state we pushed, but usually React Router
        // takes over history management. For manual pushState, we just ensure
        // the listener is gone.
      };
    }
  }, [isOpen, onClose, stateKey]);
};
