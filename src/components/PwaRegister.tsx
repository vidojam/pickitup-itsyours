"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // In local development, stale workers from other localhost apps can break navigation.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {
          return;
        });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      return;
    });
  }, []);

  return null;
}
