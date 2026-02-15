import { clipboard, BrowserWindow } from "electron";
import { IpcMessages } from "../ipc-messages";

let checkInterval: NodeJS.Timeout | null = null;
let lastText = "";

export function startClipboardMonitor() {
  if (checkInterval) return;

  lastText = clipboard.readText();

  checkInterval = setInterval(() => {
    const text = clipboard.readText();
    if (text !== lastText) {
      lastText = text;

      // Trigger "Save" animation on copy
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          // We use "Save" animation for Copy action as per plan
          win.webContents.send(
            IpcMessages.EXTERNAL_APP_TRIGGER,
            "Save",
            "Clipboard",
          );
        }
      }
    }
  }, 1000);
}

export function stopClipboardMonitor() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
