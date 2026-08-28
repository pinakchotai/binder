"use client";

import { App } from "@capacitor/app";
import { isNativePlatform } from "@/lib/platform";

let registered = false;

/**
 * Wire the Android hardware back button to in-app history navigation instead
 * of immediately closing the app. Only exits when there is no history to
 * go back to. No-op on web.
 */
export function registerNativeBackButton(): void {
  if (registered || !isNativePlatform()) return;
  registered = true;
  void App.addListener("backButton", ({ canGoBack }) => {
    if (window.history.length > 1 && canGoBack) {
      window.history.back();
    } else {
      void App.exitApp();
    }
  });
}