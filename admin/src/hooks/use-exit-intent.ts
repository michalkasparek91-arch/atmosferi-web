import { useEffect, useState } from "react";

const STORAGE_KEY = "exit_intent_shown";
const ACTIVATION_DELAY_MS = 5000;

export function useExitIntent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    let active = false;
    const enableTimer = window.setTimeout(() => {
      active = true;
    }, ACTIVATION_DELAY_MS);

    const handleMouseLeave = (e: MouseEvent) => {
      if (!active) return;
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      if (e.clientY <= 0 && e.relatedTarget === null) {
        sessionStorage.setItem(STORAGE_KEY, "true");
        setOpen(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.clearTimeout(enableTimer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return { open, setOpen };
}
