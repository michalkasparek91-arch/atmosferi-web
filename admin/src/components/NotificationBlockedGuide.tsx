import { isIOS } from "@/lib/push-notifications";

type BrowserInfo = {
  name: string;
  steps: string[];
};

const detectBrowser = (): BrowserInfo => {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android/.test(ua);

  // iOS Safari
  if (isIOS()) {
    return {
      name: "Safari (iOS)",
      steps: [
        'Otevřete Nastavení iPhone → Safari → Oznámení',
        'Najděte tuto stránku a povolte oznámení',
        'Vraťte se zpět a obnovte stránku',
      ],
    };
  }

  // Edge (must be before Chrome since Edge UA includes "Chrome")
  if (/Edg\//.test(ua)) {
    return {
      name: "Edge",
      steps: [
        'Klikněte na ikonu zámku 🔒 vlevo od adresy',
        'Klikněte na "Oprávnění pro tento web"',
        'U "Oznámení" vyberte "Povolit"',
        'Obnovte stránku',
      ],
    };
  }

  // Chrome
  if (/Chrome\//.test(ua)) {
    if (isMobile) {
      return {
        name: "Chrome (mobil)",
        steps: [
          'Klepněte na ikonu zámku 🔒 vlevo od adresy',
          'Klepněte na "Oprávnění"',
          'U "Oznámení" vyberte "Povolit"',
          'Obnovte stránku',
        ],
      };
    }
    return {
      name: "Chrome",
      steps: [
        'Klikněte na ikonu nastavení webu (⚙️ posuvníky) vlevo od adresy URL',
        'U "Oznámení" vyberte "Povolit"',
        'Obnovte stránku',
      ],
    };
  }

  // Firefox
  if (/Firefox\//.test(ua)) {
    return {
      name: "Firefox",
      steps: [
        'Klikněte na ikonu štítu 🛡️ vlevo od adresy',
        'Klikněte na "Oprávnění"',
        'U "Zasílat oznámení" zrušte blokování',
        'Obnovte stránku',
      ],
    };
  }

  // Safari macOS
  if (/Safari\//.test(ua) && /Mac/.test(ua)) {
    return {
      name: "Safari",
      steps: [
        'Otevřete Safari → Nastavení → Webové stránky → Oznámení',
        'Najděte tuto stránku a změňte na "Povolit"',
        'Obnovte stránku',
      ],
    };
  }

  // Fallback
  return {
    name: "prohlížeč",
    steps: [
      'Otevřete nastavení webu v prohlížeči (obvykle ikona vlevo od adresy)',
      'Najděte "Oznámení" / "Notifications"',
      'Změňte na "Povolit"',
      'Obnovte stránku',
    ],
  };
};

/**
 * Shows browser-specific instructions for unblocking notifications.
 * Detects Chrome, Firefox, Edge, Safari (macOS/iOS) and shows tailored steps.
 */
const NotificationBlockedGuide = () => {
  const browser = detectBrowser();

  return (
    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">
        Notifikace jsou zablokované v prohlížeči ({browser.name})
      </p>
      <ol className="text-xs text-amber-600 dark:text-amber-500 list-decimal ml-4 space-y-1">
        {browser.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
};

/** Returns a short generic toast description for blocked notifications */
export const getBlockedNotificationToastDescription = (): string => {
  return "Oznámení jsou zablokována v prohlížeči. Klikněte na ikonu zámku v adresním řádku a povolte je.";
};

export default NotificationBlockedGuide;
