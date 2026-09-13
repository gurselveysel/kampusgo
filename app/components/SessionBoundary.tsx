"use client";

import { useEffect, useState } from "react";

// Only a UI invalidation signal. Authorization remains on the server and in RLS.
const CHANNEL = "kampusgo-accounted-session-v1";

export function LoggedOutSignal() {
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ type: "signed-out" });
    channel.close();
  }, []);
  return null;
}

export default function SessionBoundary({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let disposed = false;
    let activeRequest: AbortController | null = null;
    const channel = new BroadcastChannel(CHANNEL);
    const leave = () => { setVisible(false); window.location.replace("/giris?durum=oturum"); };
    const verify = async () => {
      setVisible(false);
      activeRequest?.abort();
      const controller = new AbortController();
      activeRequest = controller;
      try {
        const response = await fetch("/api/pilot/session-status", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const result = await response.json();
        if (disposed || controller.signal.aborted) return;
        if (response.status === 503) { window.location.replace("/oturum-durumu"); return; }
        if (!response.ok || result.userId !== userId) { leave(); return; }
        setVisible(true);
      } catch {
        if (!disposed && !controller.signal.aborted) window.location.replace("/oturum-durumu");
      }
    };
    channel.onmessage = event => {
      if (event.data?.type === "signed-out" || (event.data?.type === "account" && event.data.userId !== userId)) leave();
    };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) void verify(); };
    const visibility = () => { if (document.visibilityState === "visible") void verify(); else setVisible(false); };
    window.addEventListener("pageshow", restored);
    document.addEventListener("visibilitychange", visibility);
    void verify();
    channel.postMessage({ type: "account", userId });
    return () => {
      disposed = true; activeRequest?.abort(); channel.close();
      window.removeEventListener("pageshow", restored);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [userId]);
  return <>{!visible ? <p role="status">Güncel oturum doğrulanıyor…</p> : null}<div hidden={!visible}>{children}</div></>;
}
