"use client";

import { Capacitor } from "@capacitor/core";

/**
 * True only inside the native Capacitor (Android) WebView.
 * A dev override is available so local-first flows can be exercised in a
 * normal browser (localStorage `thebinder_force_local=1` or `?local=1`).
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // ignore
  }
  try {
    if (window.localStorage.getItem("thebinder_force_local") === "1") return true;
  } catch {
    // ignore
  }
  try {
    if (new URLSearchParams(window.location.search).get("local") === "1") {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}