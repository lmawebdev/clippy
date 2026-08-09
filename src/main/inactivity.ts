import { BrowserWindow } from "electron";
import { IpcMessages } from "../ipc-messages";
import { getStateManager } from "./state";
import { getLogger } from "./logger";

let checkInterval: NodeJS.Timeout | null = null;
let lastActivityTimestamp = Date.now();

/**
 * Record user activity (keyboard/mouse). Called from the keyboard listener.
 */
export function recordUserActivity() {
  lastActivityTimestamp = Date.now();

  // Reset the inactivity notification state so Clippy can notify again
  // after the user becomes active again and then idle again.
  // Only write to the store if there's actually a pending notification
  // to avoid excessive disk writes on every keystroke.
  const settings = getStateManager().store.get("settings");
  if (settings.inactivityLastNotifiedTimestamp) {
    getStateManager().store.set("settings.inactivityLastNotifiedTimestamp", 0);
  }
}

/**
 * Check inactivity and notify Clippy if the user has been idle too long
 */
function checkInactivity() {
  try {
    const settings = getStateManager().store.get("settings");
    if (!settings.inactivityEnabled) return;

    const thresholdMs = (settings.inactivityThresholdMinutes || 30) * 60 * 1000;
    const now = Date.now();

    // Update the stored last active timestamp (used by the UI to show status)
    getStateManager().store.set(
      "settings.inactivityLastActiveTimestamp",
      lastActivityTimestamp,
    );

    const idleMs = now - lastActivityTimestamp;

    // Notify only once per idle period
    if (idleMs >= thresholdMs && !settings.inactivityLastNotifiedTimestamp) {
      getStateManager().store.set(
        "settings.inactivityLastNotifiedTimestamp",
        now,
      );

      const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
      if (!win) return;

      getLogger().info(
        `[Inactivity] User idle for ${Math.round(idleMs / 60000)} minutes`,
      );

      // Trigger Clippy animation (Alert = waving arms)
      win.webContents.send(
        IpcMessages.EXTERNAL_APP_TRIGGER,
        "Alert",
        "Inactivity",
      );

      // Show bubble message
      win.webContents.send(
        IpcMessages.INACTIVITY_DETECTED,
        Math.round(idleMs / 60000),
      );
    }
  } catch (err) {
    getLogger().error("[Inactivity] Check error", err);
  }
}

/**
 * Start the inactivity monitor
 */
export function startInactivityMonitor() {
  if (checkInterval) return;

  lastActivityTimestamp = Date.now();

  checkInterval = setInterval(checkInactivity, 30_000);
  getLogger().info("Inactivity monitor started");
}

/**
 * Stop the inactivity monitor
 */
export function stopInactivityMonitor() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}