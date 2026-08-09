import { ElectronLlmRenderer } from "@electron/llm";
import { SharedState } from "../sharedState";
import {
  ChatRecord,
  ChatWithMessages,
  ClippyDebugInfo,
  Versions,
  SystemInfo,
} from "../types/interfaces";
import { DebugState } from "../debugState";

import type { BubbleView } from "./contexts/BubbleViewContext";
import { Data } from "electron";

export interface ClipboardItem {
  id: string;
  type: "text" | "image";
  content: string;
  appName: string;
  timestamp: number;
  preview?: string;
}

export type ClippyApi = {
  // Window
  toggleChatWindow: () => Promise<void>;
  minimizeChatWindow: () => Promise<void>;
  maximizeChatWindow: () => Promise<void>;
  onSetBubbleView: (callback: (bubbleView: BubbleView) => void) => void;
  offSetBubbleView: () => void;
  onShowChatWindow: (callback: () => void) => void;
  offShowChatWindow: () => void;
  onToggleChatWindow: (callback: () => void) => void;
  offToggleChatWindow: () => void;
  popupAppMenu: () => void;
  // Models
  updateModelState: () => Promise<void>;
  downloadModelByName: (name: string) => Promise<void>;
  removeModelByName: (name: string) => Promise<void>;
  deleteModelByName: (name: string) => Promise<boolean>;
  deleteAllModels: () => Promise<boolean>;
  addModelFromFile: () => Promise<void>;
  // State
  offStateChanged: () => void;
  onStateChanged: (callback: (state: SharedState) => void) => void;
  getFullState: () => Promise<SharedState>;
  getState: (key: string) => Promise<any>;
  setState: (key: string, value: any) => Promise<void>;
  openStateInEditor: () => Promise<void>;
  // Debug
  offDebugStateChanged: () => void;
  onDebugStateChanged: (callback: (state: DebugState) => void) => void;
  getFullDebugState: () => Promise<DebugState>;
  getDebugState: (key: string) => Promise<any>;
  setDebugState: (key: string, value: any) => Promise<void>;
  openDebugStateInEditor: () => Promise<void>;
  getDebugInfo(): Promise<ClippyDebugInfo>;
  // App
  getVersions: () => Promise<Versions>;
  checkForUpdates: () => Promise<void>;
  // Chats
  getChatRecords: () => Promise<Record<string, ChatRecord>>;
  getChatWithMessages: (chatId: string) => Promise<ChatWithMessages | null>;
  writeChatWithMessages: (chatWithMessages: ChatWithMessages) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  deleteAllChats: () => Promise<void>;
  onNewChat: (callback: () => void) => void;
  offNewChat: () => void;
  onLoadModel: (callback: () => void) => void;
  offLoadModel: () => void;
  onUnloadModel: (callback: () => void) => void;
  offUnloadModel: () => void;
  // Clipboard
  clipboardWrite: (data: Data) => Promise<void>;
  clipboardWriteSilent: (data: Data) => Promise<void>;
  getClipboardHistory: () => Promise<ClipboardItem[]>;
  deleteClipboardItem: (id: string) => Promise<void>;
  clearClipboardHistory: () => Promise<void>;
  getClipboardImage: (filename: string) => Promise<string | null>;
  onClipboardHistoryUpdated: (callback: () => void) => void;
  offClipboardHistoryUpdated: () => void;
  // System Info
  getSystemInfo: () => Promise<SystemInfo | null>;
  // Tamagotchi
  onShowTamagotchiStats: (callback: () => void) => void;
  offShowTamagotchiStats: () => void;

  // Global Input
  onGlobalKeyDown: (callback: () => void) => void;
  offGlobalKeyDown: () => void;
  // Mouse Events
  setIgnoreMouseEvents: (
    ignore: boolean,
    options?: { forward: boolean },
  ) => void;
  // External App Trigger
  onExternalAppTrigger: (
    callback: (animationKey: string, appName: string) => void,
  ) => void;
  offExternalAppTrigger: () => void;
  // Active App Update
  onActiveAppUpdate: (callback: (appName: string) => void) => void;
  offActiveAppUpdate: () => void;
};

declare global {
  interface Window {
    electronAi: ElectronLlmRenderer;
    clippy: ClippyApi;
  }
}

export const clippyApi = window["clippy"];
export const electronAi = window["electronAi"];
