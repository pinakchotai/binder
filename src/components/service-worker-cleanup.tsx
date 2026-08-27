"use client";

import { useEffect } from "react";

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister())
          )
        )
        .catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) =>
          Promise.all(keys.map((key) => caches.delete(key)))
        );
      }
    }
  }, []);

  return null;
}