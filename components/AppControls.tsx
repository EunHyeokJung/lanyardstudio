"use client";

import { Check, Languages, PackagePlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type Locale,
  SUPPORTED_LOCALES,
  type Translate,
} from "@/lib/i18n";
import { withBasePath } from "@/lib/site";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register(withBasePath("/sw.js"), {
        scope: withBasePath("/"),
      });
    }

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
      return true;
    }
    return false;
  }, [installPrompt]);

  return {
    canInstall: Boolean(installPrompt),
    installed,
    install,
  };
}

export function AppControls({
  locale,
  setLocale,
  t,
  compact = false,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  compact?: boolean;
}) {
  const { canInstall, installed, install } = usePwaInstall();
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  return (
    <div className={`app-controls ${compact ? "is-compact" : ""}`}>
      <label className="language-control">
        <Languages size={15} aria-hidden="true" />
        <span>{t("language")}</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          aria-label={t("language")}
        >
          {SUPPORTED_LOCALES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="install-control">
        <button
          type="button"
          className="install-app-button"
          disabled={installed}
          onClick={() => {
            if (canInstall) {
              void install();
            } else {
              setShowInstallHelp((current) => !current);
            }
          }}
          aria-expanded={showInstallHelp || undefined}
          title={installed ? t("installed") : t("installApp")}
        >
          {installed ? <Check size={15} /> : <PackagePlus size={15} />}
          {installed ? t("installed") : t("installApp")}
        </button>
        {showInstallHelp && !installed && (
          <div className="install-help" role="status">
            {t("installHelp")}
          </div>
        )}
      </div>
    </div>
  );
}
