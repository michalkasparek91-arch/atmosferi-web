import { useEffect, useId } from "react";

interface JsonLdProps {
  data: Record<string, any> | Array<Record<string, any>>;
  /** Stable id so re-renders update the same script tag instead of stacking. */
  id?: string;
}

/**
 * Injects a JSON-LD <script> into <head>. Cleans up on unmount.
 * Use one per logical schema block per page.
 */
const JsonLd = ({ data, id }: JsonLdProps) => {
  const reactId = useId();
  const scriptId = id ?? `jsonld-${reactId.replace(/:/g, "")}`;

  useEffect(() => {
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = scriptId;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [data, scriptId]);

  return null;
};

export default JsonLd;
