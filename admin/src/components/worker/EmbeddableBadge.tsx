import { useState, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, Check, ExternalLink, Info, Star } from "lucide-react";
import { toast } from "sonner";

interface EmbeddableBadgeProps {
  workerName: string;
  workerSlug: string | null;
}

/**
 * Inline SVG badge rendered both as a live preview and inside the embeddable
 * HTML snippet. Using an inline SVG avoids relying on an external image host
 * and keeps the badge self-contained for WordPress / static-site embeds.
 */
function ZrobeeBadgeSVG({ name, width = 260 }: { name: string; width?: number }) {
  const displayName = name || "Ověřený profesionál";
  // Truncate name if too long for the badge
  const truncated = displayName.length > 28 ? displayName.slice(0, 26) + "…" : displayName;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={Math.round(width * 0.38)}
      viewBox="0 0 260 100"
      fill="none"
      role="img"
      aria-label={`${displayName} – Ověřený profík na Zrobee.cz`}
      style={{ display: "block" }}
    >
      {/* Background */}
      <rect width="260" height="100" rx="14" fill="#1a2e12" />

      {/* Subtle gradient border */}
      <rect x="1" y="1" width="258" height="98" rx="13" stroke="#3d6b27" strokeWidth="1" fill="none" />

      {/* Zrobee Logo area – simplified hexagon + bee */}
      <g transform="translate(18, 20)">
        {/* Hexagon */}
        <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="#4d8c2a" opacity="0.9" />
        {/* Checkmark inside */}
        <polyline points="12,20 18,26 28,14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Text: Worker name */}
      <text x="62" y="33" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="13" fontWeight="700" fill="white">
        {truncated}
      </text>

      {/* Stars */}
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${62 + i * 18}, 40)`}>
          <polygon
            points="8,0 10.5,5 16,6 12,10 13,16 8,13 3,16 4,10 0,6 5.5,5"
            fill="#f5c542"
          />
        </g>
      ))}

      {/* "Ověřený profík" label */}
      <text x="62" y="72" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="9" fontWeight="600" fill="#9ec87e" letterSpacing="0.5">
        OVĚŘENÝ PROFÍK
      </text>

      {/* Zrobee.cz text */}
      <text x="62" y="88" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="12" fontWeight="800" fill="#7dba4a" letterSpacing="0.3">
        Zrobee.cz
      </text>

      {/* Shield icon (right side) */}
      <g transform="translate(220, 30)" opacity="0.15">
        <path d="M12 2L2 7v5c0 5.55 4.26 10.74 10 12 5.74-1.26 10-6.45 10-12V7L12 2z" fill="white" />
      </g>
    </svg>
  );
}

/**
 * Generates the raw SVG string for embedding (mirrors the React component above
 * but as a string template so it can be placed inside an <a> tag).
 */
function generateBadgeSvgString(name: string): string {
  const displayName = name || "Ověřený profesionál";
  const truncated = displayName.length > 28 ? displayName.slice(0, 26) + "…" : displayName;

  const stars = [0, 1, 2, 3, 4]
    .map(
      (i) =>
        `<g transform="translate(${62 + i * 18}, 40)"><polygon points="8,0 10.5,5 16,6 12,10 13,16 8,13 3,16 4,10 0,6 5.5,5" fill="#f5c542"/></g>`
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="100" viewBox="0 0 260 100" fill="none" role="img" aria-label="${displayName} – Ověřený profík na Zrobee.cz" style="display:block">
  <rect width="260" height="100" rx="14" fill="#1a2e12"/>
  <rect x="1" y="1" width="258" height="98" rx="13" stroke="#3d6b27" stroke-width="1" fill="none"/>
  <g transform="translate(18, 20)">
    <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="#4d8c2a" opacity="0.9"/>
    <polyline points="12,20 18,26 28,14" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
  <text x="62" y="33" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="13" font-weight="700" fill="white">${truncated}</text>
  ${stars}
  <text x="62" y="72" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="9" font-weight="600" fill="#9ec87e" letter-spacing="0.5">OVĚŘENÝ PROFÍK</text>
  <text x="62" y="88" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="12" font-weight="800" fill="#7dba4a" letter-spacing="0.3">Zrobee.cz</text>
  <g transform="translate(220, 30)" opacity="0.15"><path d="M12 2L2 7v5c0 5.55 4.26 10.74 10 12 5.74-1.26 10-6.45 10-12V7L12 2z" fill="white"/></g>
</svg>`;
}

export default function EmbeddableBadge({ workerName, workerSlug }: EmbeddableBadgeProps) {
  const [copied, setCopied] = useState(false);

  const profileUrl = workerSlug
    ? `https://zrobee.cz/remeslnik/${workerSlug}`
    : "https://zrobee.cz";

  const embedCode = useMemo(() => {
    const svg = generateBadgeSvgString(workerName);
    return `<!-- Zrobee.cz – Ověřený profík odznak -->\n<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" title="Profil na Zrobee.cz" style="display:inline-block;text-decoration:none;">\n${svg}\n</a>`;
  }, [workerName, workerSlug, profileUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success("HTML kód byl zkopírován do schránky!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = embedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success("HTML kód byl zkopírován do schránky!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('worker-qr-code') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `zrobee-qr-${workerSlug || 'profil'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success("QR kód byl stažen!");
    }
  };

  return (
    <div className="space-y-8">
      {/* Explainer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground leading-relaxed">
          Sdílejte svůj profil! Zákazníci si mohou přečíst vaše recenze a rovnou vás poptat. Můžete si stáhnout QR kód pro vizitky a auto, nebo si vložit odznak na web.
        </p>
      </div>

      {/* QR Code Section */}
      <div className="space-y-4 bg-white dark:bg-zinc-950 p-6 rounded-2xl border">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-shrink-0 bg-white p-4 rounded-xl shadow-sm border">
            <QRCodeCanvas 
              id="worker-qr-code" 
              value={profileUrl} 
              size={150} 
              bgColor={"#ffffff"}
              fgColor={"#1a2e12"}
              level={"H"}
              includeMargin={false}
              imageSettings={{
                src: "/apple-touch-icon.png", // Or any small logo they have in public/
                x: undefined,
                y: undefined,
                height: 35,
                width: 35,
                excavate: true,
              }}
            />
          </div>
          <div className="space-y-3 text-center md:text-left flex-1">
            <h3 className="text-lg font-bold">QR Kód pro vizitky a auto</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vytiskněte si tento QR kód. Když ho zákazník naskenuje mobilem, rovnou uvidí vaše skvělé recenze a může vás napřímo poptat. Získáte tak zakázky bez provize!
            </p>
            <Button onClick={downloadQRCode} className="w-full md:w-auto font-bold mt-2">
              Stáhnout QR kód (.png)
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-border my-6"></div>

      {/* Badge Preview */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Odznak pro váš web</h3>
        <div className="flex items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border bg-muted/20">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-transform hover:scale-105 active:scale-95"
          >
            <ZrobeeBadgeSVG name={workerName} width={260} />
          </a>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Klikněte pro náhled vašeho veřejného profilu
        </p>
      </div>

      {/* Code Snippet */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">HTML kód pro vložení na web</h3>
        <div className="relative">
          <pre className="p-4 rounded-xl bg-[#1a1a2e] text-[#e0e0e0] text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all font-mono border border-border/50 max-h-[200px] overflow-y-auto select-all">
            {embedCode}
          </pre>
        </div>
      </div>

      {/* Copy Button */}
      <Button
        onClick={handleCopy}
        size="lg"
        className="w-full h-14 rounded-2xl text-base font-bold gap-3 transition-all active:scale-[0.98]"
      >
        {copied ? (
          <>
            <Check className="h-5 w-5" />
            Zkopírováno!
          </>
        ) : (
          <>
            <ClipboardCopy className="h-5 w-5" />
            Kopírovat HTML kód
          </>
        )}
      </Button>

      {/* Tip for non-technical users */}
      <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-primary" />
          Jak na to?
        </h4>
        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Klikněte na tlačítko <strong className="text-foreground">"Kopírovat HTML kód"</strong> výše.</li>
          <li>Otevřete správu svého webu (WordPress, Webnode, apod.).</li>
          <li>Vložte kód na místo, kde chcete odznak zobrazit (patička, sidebar, kontaktní stránka).</li>
          <li>Nebo pošlete zkopírovaný kód svému webmasterovi.</li>
        </ol>
      </div>

      {/* Profile link */}
      {workerSlug && (
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Zobrazit můj veřejný profil
        </a>
      )}
    </div>
  );
}
