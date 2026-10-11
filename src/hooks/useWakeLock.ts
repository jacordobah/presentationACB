import { useEffect } from "react";

// Keeps the screen on while enabled. The browser drops the lock whenever the
// page is hidden, so it is requested again when the page becomes visible.
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (released) await lock.release();
        else sentinel = lock;
      } catch {
        sentinel = null;
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release();
    };
  }, [enabled]);
}
