import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    if (localStorage.getItem("pwa-banner-dismissed")) return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    if (ios) {
      setIsIos(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
      localStorage.setItem("pwa-banner-dismissed", "1");
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (!show || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
      style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.6))" }}
    >
      <div className="bg-[oklch(0.16_0.03_240)] border border-[oklch(0.28_0.05_240)] rounded-2xl p-4 flex items-start gap-3">
        <img
          src="/assets/generated/btc-icon-192.dim_192x192.png"
          alt="BTC Lab"
          className="w-12 h-12 rounded-xl flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            Bitcoin Analysis Lab
          </p>
          {isIos ? (
            <p className="text-xs text-[oklch(0.65_0.018_238)] mt-1 leading-snug">
              Para instalar: toque em{" "}
              <span className="font-medium text-[oklch(0.775_0.14_65)]">
                Compartilhar
              </span>{" "}
              e depois{" "}
              <span className="font-medium text-[oklch(0.775_0.14_65)]">
                "Adicionar à Tela de Início"
              </span>
            </p>
          ) : (
            <p className="text-xs text-[oklch(0.65_0.018_238)] mt-1">
              Instale para acesso rápido sem precisar do browser.
            </p>
          )}
          {!isIos && (
            <button
              type="button"
              onClick={handleInstall}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[oklch(0.775_0.14_65)] text-[oklch(0.11_0.015_240)] text-xs font-semibold hover:brightness-110 transition-all"
            >
              <Download size={12} />
              Instalar app
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[oklch(0.45_0.018_238)] hover:text-white transition-colors flex-shrink-0 mt-0.5"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
