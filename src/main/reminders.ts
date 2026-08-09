import { BrowserWindow } from "electron";
import { IpcMessages } from "../ipc-messages";
import { getStateManager } from "./state";
import { getLogger } from "./logger";
import { Reminder } from "../sharedState";

let checkInterval: NodeJS.Timeout | null = null;

/**
 * Get the current reminders from settings
 */
function getReminders(): Reminder[] {
  const settings = getStateManager().store.get("settings");
  return settings.reminders ?? [];
}

/**
 * Get a unique key for a reminder to avoid double-firing.
 * - "none" repeat: fires once ever (key = reminder id)
 * - "daily" repeat: fires once per day (key = YYYY-MM-DD)
 * - "weekly" repeat: fires once per week (key = YYYY-Www)
 */
function getFireKey(repeat: Reminder["repeat"], now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (repeat === "daily") return dateKey;

  if (repeat === "weekly") {
    // ISO week number
    const tempDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `${tempDate.getUTCFullYear()}-W${weekNo}`;
  }

  // "none": fire only once ever
  return "once";
}

/**
 * Check if a reminder should fire at the given time
 */
function shouldFire(reminder: Reminder, now: Date): boolean {
  if (!reminder.enabled) return false;

  const [hours, minutes] = reminder.time.split(":").map(Number);
  if (now.getHours() !== hours || now.getMinutes() !== minutes) return false;

  // Weekly repeat: check day of week
  if (reminder.repeat === "weekly") {
    const today = now.getDay(); // 0 = Sunday
    if (!reminder.days || reminder.days.length === 0) return false;
    if (!reminder.days.includes(today)) return false;
  }

  // Avoid double-firing within the same period
  const fireKey = getFireKey(reminder.repeat, now);
  if (reminder.lastFiredKey === fireKey) return false;

  return true;
}

/**
 * Fire a reminder: show a bubble message + animation on Clippy
 */
function fireReminder(reminder: Reminder) {
  const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  if (!win) return;

  getLogger().info(`[Reminders] Firing reminder: ${reminder.text}`);

  // Trigger Clippy animation (GetAttention = waving)
  win.webContents.send(
    IpcMessages.EXTERNAL_APP_TRIGGER,
    "GetAttention",
    "Reminder",
  );

  // Show bubble message
  win.webContents.send(
    IpcMessages.REMINDER_FIRED,
    reminder.text,
    reminder.id,
  );

  // Mark as fired
  const settings = getStateManager().store.get("settings");
  const reminders = settings.reminders ?? [];
  const updated = reminders.map((r) =>
    r.id === reminder.id
      ? { ...r, lastFiredKey: getFireKey(r.repeat, new Date()) }
      : r,
  );
  getStateManager().store.set("settings.reminders", updated);
}

/**
 * Check all reminders every second
 */
function checkReminders() {
  try {
    const settings = getStateManager().store.get("settings");
    if (!settings.remindersEnabled) return;

    const now = new Date();
    const reminders = getReminders();

    for (const reminder of reminders) {
      if (shouldFire(reminder, now)) {
        fireReminder(reminder);
      }
    }
  } catch (err) {
    getLogger().error("[Reminders] Check error", err);
  }
}

/**
 * Start the reminders monitor
 */
export function startRemindersMonitor() {
  if (checkInterval) return;

  checkInterval = setInterval(checkReminders, 1000);
  getLogger().info("Reminders monitor started");
}

/**
 * Stop the reminders monitor
 */
export function stopRemindersMonitor() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}