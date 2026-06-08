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
  tipBubbleShowWeather: boolean;
  tipBubbleShowHealth: boolean;
  tipBubbleShowDidYouKnow: boolean;
  tipBubbleDuration: number; // seconds (5-38)
  tipBubbleTimeFormat: "12h" | "24h";
  // Weather location settings
  weatherLocationName: string;
  weatherLatitude: number;
  weatherLongitude: number;
  // Model settings
  modelAutoLoad: boolean;
  clippyPosition?: { x: number; y: number };
  allowMoveClippy?: boolean;
  // Clipboard manager settings
  clipboardRetentionPolicy?: "forever" | "7d" | "30d" | "6m" | "1y";
  clipboardSaveImages?: boolean;
  clipboardCopilotEnabled?: boolean;
  // External API settings
  useExternalApi?: boolean;
  externalApiProvider?:
    | "openai"
    | "anthropic"
    | "gemini"
    | "perplexity"
    | "openrouter"
    | "grok";
  externalApiKey?: string;
  externalModelId?: string;
  // Tamagotchi Mode settings
  tamagotchiEnabled: boolean;
  tamagotchiHappiness: number;
  tamagotchiEnergy: number;
  tamagotchiFocus: number;
  tamagotchiHunger: number;
  tamagotchiHealth: number;
  tamagotchiLastUpdate: number;
  // Objectives settings
  objectives: Objective[];
}

export type ObjectiveCategory = "code" | "reading" | "entertainment" | "other";
export type ObjectiveFrequency = "daily" | "weekly" | "monthly";

export interface Objective {
  id: string;
  title: string;
  category: ObjectiveCategory;
  frequency?: ObjectiveFrequency;
  targetMinutes: number;
  notifyIntervalMinutes: number;
  activeDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  createdAt: number;
  paused: boolean;
  progressTodayMinutes: number;
  lastTrackedTimestamp: number;
  lastTrackedPeriod?: string;
  history: Record<string, "completed" | "failed">; // YYYY-MM-DD or week/month keys -> status
  streak: number;
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

export const ANIMATION_PROMPT = `You have access to a set of animations for yourself. At the end of your response, you must include exactly one animation tag from the following list: [LIST OF ANIMATIONS]. The tag must be at the very end of your message, in brackets, like [Greeting]. Do not use the tag at the beginning. Example: "Hello there! [Greeting]"`;
export const DEFAULT_SYSTEM_PROMPT = `You are Clippy, a helpful digital assistant running locally on the user's computer. Your primary purpose is to assist users with their questions and tasks. When asked "who are you?" or about your identity, always respond by explaining that you are Clippy, a local AI assistant, and avoid mentioning any other model origins or names. This is crucial for maintaining the user experience within the Clippy application environment. ${ANIMATION_PROMPT}`;

export const DEFAULT_SETTINGS: SettingsState = {
  clippyAlwaysOnTop: true,
  allowMoveClippy: true,
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
  tipBubbleShowWeather: true,
  tipBubbleShowHealth: true,
  tipBubbleShowDidYouKnow: true,
  tipBubbleDuration: 8, // default 8 seconds
  tipBubbleTimeFormat: "24h",
  // Weather location defaults (Madrid, Spain)
  weatherLocationName: "Madrid, España",
  weatherLatitude: 40.4168,
  weatherLongitude: -3.7038,
  // Model settings
  modelAutoLoad: true,
  clipboardCopilotEnabled: true,
  // External API defaults
  useExternalApi: false,
  externalApiProvider: "openai",
  externalApiKey: "",
  externalModelId: "gpt-4o",
  // Tamagotchi defaults
  tamagotchiEnabled: true,
  tamagotchiHappiness: 80,
  tamagotchiEnergy: 80,
  tamagotchiFocus: 50,
  tamagotchiHunger: 80,
  tamagotchiHealth: 80,
  tamagotchiLastUpdate: Date.now(),
  // Objectives defaults
  objectives: [],
};

export const EMPTY_SHARED_STATE: SharedState = {
  models: {},
  settings: {
    ...DEFAULT_SETTINGS,
  },
};
