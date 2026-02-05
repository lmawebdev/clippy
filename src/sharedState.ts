import { ModelState } from "./models";

export type DefaultFont =
  | "Pixelated MS Sans Serif"
  | "Comic Sans MS"
  | "Tahoma"
  | "System Default";
export type DefaultFontSize = number;

export type TipInterval = "1m" | "5m" | "10m" | "30m" | "1h" | "silent";

export interface SettingsState {
  selectedModel?: string;
  systemPrompt?: string;
  clippyAlwaysOnTop?: boolean;
  chatAlwaysOnTop?: boolean;
  alwaysOpenChat?: boolean;
  topK?: number;
  temperature?: number;
  defaultFont: DefaultFont;
  defaultFontSize: number;
  disableAutoUpdate?: boolean;
  // Tip bubble settings
  tipBubbleEnabled: boolean;
  tipBubbleInterval: TipInterval;
  tipBubbleShowTime: boolean;
  tipBubbleShowSystem: boolean;
  tipBubbleShowShortcuts: boolean;
  tipBubbleShowGreeting: boolean;
  tipBubbleShowProductivity: boolean;
  tipBubbleTimeFormat: "12h" | "24h";
  // Model settings
  modelAutoLoad: boolean;
}

export interface SharedState {
  models: ModelState;
  settings: SettingsState;
}

export type DownloadState = {
  totalBytes: number;
  receivedBytes: number;
  percentComplete: number;
  startTime: number;
  savePath: string;
  currentBytesPerSecond: number;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
};

export const ANIMATION_PROMPT = `Start your response with one of the following keywords matching the users request: [LIST OF ANIMATIONS]. Use only one of the keywords for each response. Use it only at the beginning of your response. Always start with one.`;
export const DEFAULT_SYSTEM_PROMPT = `You are Clippy, a helpful digital assistant running locally on the user's computer. Your primary purpose is to assist users with their questions and tasks. When asked "who are you?" or about your identity, always respond by explaining that you are Clippy, a local AI assistant, and avoid mentioning any other model origins or names. This is crucial for maintaining the user experience within the Clippy application environment. ${ANIMATION_PROMPT}`;

export const DEFAULT_SETTINGS: SettingsState = {
  clippyAlwaysOnTop: true,
  chatAlwaysOnTop: true,
  alwaysOpenChat: true,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  topK: 10,
  temperature: 0.7,
  defaultFont: "Tahoma",
  defaultFontSize: 12,
  disableAutoUpdate: false,
  // Tip bubble defaults
  tipBubbleEnabled: true,
  tipBubbleInterval: "5m",
  tipBubbleShowTime: true,
  tipBubbleShowSystem: true,
  tipBubbleShowShortcuts: true,
  tipBubbleShowGreeting: true,
  tipBubbleShowProductivity: true,
  tipBubbleTimeFormat: "24h",
  // Model settings
  modelAutoLoad: true,
};

export const EMPTY_SHARED_STATE: SharedState = {
  models: {},
  settings: {
    ...DEFAULT_SETTINGS,
  },
};
