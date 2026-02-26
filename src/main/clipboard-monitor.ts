import { clipboard, BrowserWindow } from "electron";
import { IpcMessages } from "../ipc-messages";
import { exec } from "child_process";
import {
  addClipboardItem,
  saveImageToStore,
  pruneByRetentionPolicy,
  ClipboardRetentionPolicy,
} from "./clipboard-store";
import { getStateManager } from "./state";
import { getLogger } from "./logger";

let checkInterval: NodeJS.Timeout | null = null;
let lastText = "";
let lastImageDataUrl = "";
let pruneInterval: NodeJS.Timeout | null = null;

/**
 * Get the name of the currently active application (macOS only).
 */
function getActiveAppName(): Promise<string> {
  return new Promise((resolve) => {
    if (process.platform !== "darwin") {
      resolve("Unknown");
      return;
    }
    exec(
      `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
      (err, stdout) => {
        if (err) {
          resolve("Unknown");
        } else {
          resolve(stdout.trim() || "Unknown");
        }
      },
    );
  });
}

function broadcastClipboardUpdate() {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(IpcMessages.CLIPBOARD_HISTORY_UPDATED);
    }
  }
}

export async function startClipboardMonitor() {
  if (checkInterval) return;

  lastText = clipboard.readText();
  try {
    const initImage = clipboard.readImage();
    lastImageDataUrl = initImage.isEmpty() ? "" : initImage.toDataURL();
  } catch {
    lastImageDataUrl = "";
  }

  checkInterval = setInterval(async () => {
    try {
      if ((global as any).isInternalClipboardUpdate) {
        (global as any).isInternalClipboardUpdate = false;
        lastText = clipboard.readText();
        const img = clipboard.readImage();
        lastImageDataUrl = img.isEmpty() ? "" : img.toDataURL();
        return;
      }

      const text = clipboard.readText();
      const image = clipboard.readImage();
      const imageDataUrl = image.isEmpty() ? "" : image.toDataURL();

      if (text !== lastText && text.trim() !== "") {
        lastText = text;
        lastImageDataUrl = imageDataUrl; // sync image state

        const appName = await getActiveAppName();

        // Trigger "Save" animation
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send(
              IpcMessages.EXTERNAL_APP_TRIGGER,
              "Save",
              "Clipboard",
            );
          }
        }

        // Save to store
        addClipboardItem({
          type: "text",
          content: text,
          appName,
          preview: text.slice(0, 300),
        });

        broadcastClipboardUpdate();
      } else if (imageDataUrl && imageDataUrl !== lastImageDataUrl) {
        lastImageDataUrl = imageDataUrl;
        lastText = text; // sync text state

        const appName = await getActiveAppName();

        // Trigger "Save" animation
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send(
              IpcMessages.EXTERNAL_APP_TRIGGER,
              "Save",
              "Clipboard",
            );
          }
        }

        // Save image file
        try {
          const filename = saveImageToStore(imageDataUrl);
          addClipboardItem({
            type: "image",
            content: filename,
            appName,
            preview: filename,
          });
          broadcastClipboardUpdate();
        } catch (imgErr) {
          getLogger().error("Failed to save clipboard image", imgErr);
        }
      }
    } catch (err) {
      getLogger().error("Clipboard monitor error", err);
    }
  }, 1000);

  // Run prune check every hour
  pruneInterval = setInterval(
    () => {
      try {
        const settings = getStateManager().store.get("settings");
        const policy =
          (settings.clipboardRetentionPolicy as ClipboardRetentionPolicy) ||
          "forever";
        pruneByRetentionPolicy(policy);
      } catch {
        // ignore
      }
    },
    60 * 60 * 1000,
  );
}

export function stopClipboardMonitor() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  if (pruneInterval) {
    clearInterval(pruneInterval);
    pruneInterval = null;
  }
}
