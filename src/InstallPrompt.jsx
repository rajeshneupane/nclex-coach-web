import { useEffect, useMemo, useState } from "react";

function isIOS() {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

function isStandalone() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)")?.matches
  );
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  const ios = useMemo(() => isIOS(), []);
  const standalone = useMemo(() => isStandalone(), []);

  useEffect(() => {
    setInstalled(standalone);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [standalone]);

  if (installed) return null;

  if (ios) {
    return (
      <div className="card" style={{ background: "rgba(18,28,57,.55)" }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>
          Install on iPhone
        </div>
        <div className="muted">
          In Safari: tap <b>Share</b> → <b>Add to Home Screen</b>.
        </div>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div className="card" style={{ background: "rgba(18,28,57,.55)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Install NCLEX Coach
          </div>
          <div className="muted">Get a faster, app-like experience.</div>
        </div>
        <button
          className="btn primary"
          onClick={async () => {
            try {
              deferred.prompt();
              const choice = await deferred.userChoice;
              if (choice?.outcome !== "accepted") return;
              setDeferred(null);
            } catch {}
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
