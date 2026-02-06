import { uIOhook, UiohookKey } from "uiohook-napi";
import { BrowserWindow } from "electron";
import { IpcMessages } from "../ipc-messages";
import { getLogger } from "./logger";

let isListening = false;

export function setupKeyboardListener() {
  if (isListening) return;

  uIOhook.on("keydown", (e) => {
    // Broadcast to all windows
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IpcMessages.GLOBAL_KEY_DOWN);
      }
    }
  });

  uIOhook.start();
  isListening = true;
  getLogger().info("Global keyboard listener started via uiohook-napi");
}

export function stopKeyboardListener() {
    if (!isListening) return;
    uIOhook.stop();
    isListening = false;
    getLogger().info("Global keyboard listener stopped");
}
