import {
  BrowserWindow,
  dialog,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  shell,
} from "electron";
import { getLogger } from "./logger";
import { FileTransport } from "electron-log";
import { getStateManager } from "./state";

import type { BubbleView } from "../renderer/contexts/BubbleViewContext";
import {
  getMainWindow,
  toggleChatWindow,
  showChatWindow,
  getChatWindow,
} from "./windows";
import { IpcMessages } from "../ipc-messages";
import { checkForUpdates } from "./update";
import {
  closeInspector,
  getIsInspectorEnabled,
  openInspector,
} from "./debugger";

/**
 * Setup the application menu
 */
export function setupAppMenu() {
  Menu.setApplicationMenu(getMainAppMenu());
}

/**
 * Popup the application menu
 *
 * @param options {Electron.PopupOptions} Options for the popup
 */
export function popupAppMenu(options: Electron.PopupOptions = {}) {
  getMainAppMenu().popup(options);
}

function feedTamagotchi() {
  const store = getStateManager().store;
  const settings = store.get("settings");
  const happiness = settings.tamagotchiHappiness ?? 80;
  const energy = settings.tamagotchiEnergy ?? 80;
  const focus = settings.tamagotchiFocus ?? 50;
  const hunger = settings.tamagotchiHunger ?? 80;
  const health = settings.tamagotchiHealth ?? 80;

  store.set("settings.tamagotchiHappiness", Math.max(0, Math.min(100, happiness + 5)));
  store.set("settings.tamagotchiEnergy", Math.max(0, Math.min(100, energy + 5)));
  store.set("settings.tamagotchiHunger", Math.max(0, Math.min(100, hunger + 30)));
  store.set("settings.tamagotchiLastUpdate", Date.now());
}

function petTamagotchi() {
  const store = getStateManager().store;
  const settings = store.get("settings");
  const happiness = settings.tamagotchiHappiness ?? 80;

  store.set("settings.tamagotchiHappiness", Math.max(0, Math.min(100, happiness + 15)));
  store.set("settings.tamagotchiLastUpdate", Date.now());
}

function healTamagotchi() {
  const store = getStateManager().store;
  const settings = store.get("settings");
  const health = settings.tamagotchiHealth ?? 80;

  store.set("settings.tamagotchiHealth", Math.max(0, Math.min(100, health + 25)));
  store.set("settings.tamagotchiLastUpdate", Date.now());
}

function wakeUpTamagotchi() {
  const store = getStateManager().store;
  const settings = store.get("settings");
  const happiness = settings.tamagotchiHappiness ?? 80;
  const energy = settings.tamagotchiEnergy ?? 80;

  store.set("settings.tamagotchiHappiness", Math.max(0, Math.min(100, happiness + 5)));
  store.set("settings.tamagotchiEnergy", Math.max(0, Math.min(100, Math.max(25, energy))));
  store.set("settings.tamagotchiLastUpdate", Date.now());
}

/**
 * Setup the application menu
 */
export function getMainAppMenu(): Menu {
  const isMac = process.platform === "darwin";
  const settings = getStateManager().store.get("settings");

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([{ role: "appMenu", id: "appMenu" }] as MenuItemConstructorOptions[])
      : []),
    {
      label: "File",
      submenu: getFileMenu(),
    },
    { role: "editMenu" },
    { label: "View", submenu: getViewMenu() },
    {
      role: "windowMenu",
      id: "windowMenu",
    },
    { role: "help", submenu: getHelpMenu() },
  ];

  if (settings.tamagotchiEnabled) {
    template.push({ type: "separator" });
    template.push({
      label: "👾 Tamagotchi",
      submenu: [
        {
          label: "🍎 Alimentar (Comer)",
          click: () => feedTamagotchi(),
        },
        {
          label: "❤️ Acariciar (Amor)",
          click: () => petTamagotchi(),
        },
        {
          label: "💊 Curar (Salud)",
          click: () => healTamagotchi(),
        },
        {
          label: "⏰ Despertar",
          click: () => wakeUpTamagotchi(),
        },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);

  // Insert app menu options
  if (isMac) {
    const appMenu = menu.getMenuItemById("appMenu");
    appMenu?.submenu?.insert(2, new MenuItem({ type: "separator" }));
    appMenu?.submenu?.insert(3, getSettingsMenuItem());
    appMenu?.submenu?.insert(
      4,
      new MenuItem({
        label: "Check for Updates…",
        click: () => checkForUpdates(),
      }),
    );
    appMenu?.submenu?.insert(5, new MenuItem({ type: "separator" }));
  }

  // Insert window options
  const windowMenu = menu.getMenuItemById("windowMenu");
  windowMenu?.submenu?.append(new MenuItem({ type: "separator" }));
  windowMenu?.submenu?.append(
    new MenuItem({
      label: "Minimize Clippy",
      click: () => getMainWindow()?.minimize(),
    }),
  );
  windowMenu?.submenu?.append(
    new MenuItem({
      label: "Always Show Clippy on Top",
      type: "checkbox",
      checked: getStateManager().store.get("settings").clippyAlwaysOnTop,
      click: (menuItem) => {
        getStateManager().store.set(
          "settings.clippyAlwaysOnTop",
          menuItem.checked,
        );
      },
    }),
  );
  windowMenu?.submenu?.append(
    new MenuItem({
      label: "Always Show Chat Window on Top",
      type: "checkbox",
      checked: getStateManager().store.get("settings").chatAlwaysOnTop,
      click: (menuItem) => {
        getStateManager().store.set(
          "settings.chatAlwaysOnTop",
          menuItem.checked,
        );
      },
    }),
  );
  windowMenu?.submenu?.append(
    new MenuItem({
      label: "Allow Moving Clippy",
      type: "checkbox",
      checked: getStateManager().store.get("settings").allowMoveClippy,
      click: (menuItem) => {
        getStateManager().store.set(
          "settings.allowMoveClippy",
          menuItem.checked,
        );
        // Force refresh to update checkbox state if needed, though Electron handles it?
        // Actually, state.ts calls setupAppMenu() on change. So it's handled.
      },
    }),
  );
  windowMenu?.submenu?.append(
    new MenuItem({
      type: "separator",
    }),
  );
  windowMenu?.submenu?.append(
    new MenuItem({
      label: "Toggle Chat Window",
      click: () => toggleChatWindow(),
      accelerator: "Cmd+`",
    }),
  );
  windowMenu?.submenu?.append(
    new MenuItem({
      type: "separator",
    }),
  );
  windowMenu?.submenu?.append(
    new MenuItem({
      label: "📋 Clipboard History",
      click: () => openView("clipboard"),
      accelerator: "CmdOrCtrl+Shift+V",
    }),
  );

  return menu;
}

function getFileMenu(): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [
    {
      label: "New Chat",
      accelerator: "CmdOrCtrl+N",
      click: () => {
        getMainWindow()?.webContents.send(IpcMessages.CHAT_NEW_CHAT);
      },
    },
    { type: "separator" },
    {
      label: "Load Model",
      click: () => {
        getMainWindow()?.webContents.send(IpcMessages.LOAD_MODEL);
      },
    },
    {
      label: "Unload Model",
      click: () => {
        getMainWindow()?.webContents.send(IpcMessages.UNLOAD_MODEL);
      },
    },
    { type: "separator" },
    { role: "close" },
  ];

  if (process.platform === "win32") {
    template.push(
      { type: "separator" },
      {
        label: "Settings",
        click: () => openView("settings-general"),
        accelerator: "CmdOrCtrl+,",
      },
      { type: "separator" },
      {
        label: "Check for Updates…",
        click: () => checkForUpdates(),
      },
    );
  }

  return template;
}

function getViewMenu(): MenuItemConstructorOptions[] {
  return [
    {
      label: "Chat",
      click: () => openView("chat"),
    },
    {
      label: "Chat History",
      click: () => openView("chats"),
    },
    {
      label: "Clipboard History",
      click: () => openView("clipboard"),
      accelerator: "CmdOrCtrl+Shift+V",
    },
    { type: "separator" },
    { role: "toggleDevTools" },
    { type: "separator" },
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
  ];
}

function getSettingsMenuItem(): MenuItem {
  return new MenuItem({
    label: "Settings",
    submenu: Menu.buildFromTemplate([
      {
        label: "General",
        click: () => openView("settings-general"),
        accelerator: "CmdOrCtrl+,",
      },
      {
        label: "Tips",
        click: () => openView("settings-tips"),
      },
      {
        label: "Objectives",
        click: () => openView("settings-objectives"),
      },
      {
        label: "Model",
        click: () => openView("settings-model"),
      },
      {
        label: "Parameters",
        click: () => openView("settings-parameters"),
      },
      {
        label: "Clipboard",
        click: () => openView("settings-clipboard"),
      },
      {
        label: "Advanced",
        click: () => openView("settings-advanced"),
      },
      {
        label: "About",
        click: () => openView("settings-about"),
      },
    ]),
  });
}

function getHelpMenu(): MenuItemConstructorOptions[] {
  return [
    {
      label: "Open Clippy Website",
      click: () => {
        shell.openExternal("https://felixrieseberg.github.io/clippy/");
      },
    },
    {
      label: "Report an Issue",
      click: () => {
        shell.openExternal("https://github.com/felixrieseberg/clippy/issues");
      },
    },
    {
      type: "separator",
    },
    {
      label: "Open All Developer Tools",
      click: () => {
        const windows = BrowserWindow.getAllWindows();
        for (const window of windows) {
          window.webContents.openDevTools({ mode: "detach" });
        }
      },
    },
    {
      label: "Enable Main Process Debugger",
      type: "checkbox",
      checked: getIsInspectorEnabled(),
      click: () => {
        getIsInspectorEnabled() ? closeInspector() : openInspector();
      },
    },
    {
      type: "separator",
    },
    {
      label: "Open Logs",
      click: () => {
        try {
          const fileTransport = getLogger().transports.file as FileTransport;
          const logPath = fileTransport.getFile();

          if (logPath?.path) {
            getLogger().info("Opening logs at", logPath.path);
            shell.showItemInFolder(logPath.path);
          }
        } catch (error) {
          getLogger().error("Failed to open logs", error);
          dialog.showMessageBox({
            type: "error",
            title: "Error",
            message: `Failed to open logs. The error was: ${error}. I'd normally tell you to check the logs for more details, but... well, you can't.`,
          });
        }
      },
    },
  ];
}

export function openView(view: BubbleView) {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    // Send to main window (which forwards to chat via WindowPortal)
    mainWindow.webContents.send(IpcMessages.SET_BUBBLE_VIEW, view);

    // Also send directly to chat window if it exists
    const chatWindow = getChatWindow();
    if (chatWindow) {
      chatWindow.webContents.send(IpcMessages.SET_BUBBLE_VIEW, view);
    }

    // Ensure chat window is open
    showChatWindow();
  }
}
