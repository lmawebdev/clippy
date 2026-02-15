import { uIOhook, UiohookKey } from "uiohook-napi";
import { BrowserWindow } from "electron";
import { IpcMessages } from "../ipc-messages";
import { getLogger } from "./logger";

let isListening = false;

export function setupKeyboardListener() {
  if (isListening) return;

  uIOhook.on("keydown", (e) => {
    // Determine if it's a delete action
    // Backspace = 14
    // Delete = 3667 (Mac fn+backspace)
    if (e.keycode === 14 || e.keycode === 3667 || e.keycode === 57421) {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          // Trigger "EmptyTrash" animation
          win.webContents.send(
            IpcMessages.EXTERNAL_APP_TRIGGER,
            "EmptyTrash",
            "Keyboard",
          );
        }
      }
    }

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
