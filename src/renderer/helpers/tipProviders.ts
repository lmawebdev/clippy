/**
 * Tip content providers for generating various types of tips
 */

import {
  formatShortcutForPlatform,
  getRandomShortcut,
} from "./keyboardShortcuts";
import { clippyApi } from "../clippyApi";
import { ExternalLLMService, ExternalApiProvider } from "../api/external-llm";
import type { SettingsState } from "../../sharedState";
import {
  HEALTH_TIPS,
  DID_YOU_KNOW_TIPS,
  PRODUCTIVITY_TIPS,
} from "./data/tipContents";

export type TipType =
  | "time"
  | "system"
  | "shortcut"
  | "greeting"
  | "productivity"
  | "weather"
  | "health"
  | "didyouknow"
  | "ai";

export interface Tip {
  type: TipType;
  content: string;
  icon: string;
}

/**
 * Get greeting based on current time of day
 */
function getGreetingByTimeOfDay(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "☀️ ¡Buenos días! Espero que tengas un día productivo.";
  } else if (hour >= 12 && hour < 14) {
    return "🍽️ ¡Buen mediodía! ¿Ya has comido?";
  } else if (hour >= 14 && hour < 19) {
    return "🌤️ ¡Buenas tardes! ¿Cómo va el día?";
  } else if (hour >= 19 && hour < 22) {
    return "🌙 ¡Buenas noches! Es hora de relajarse un poco.";
  } else {
    return "🌟 ¡Hola noctámbulo! Recuerda descansar.";
  }
}

/**
 * Get time tip with formatted time
 */
function getTimeTip(format: "12h" | "24h"): Tip {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: format === "12h",
    timeZoneName: "short",
  };

  const timeStr = now.toLocaleTimeString(undefined, options);
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return {
    type: "time",
    content: `🕐 Son las ${timeStr}\n📅 ${dateStr}`,
    icon: "🕐",
  };
}

/**
 * Get system info tip
 */
async function getSystemTip(): Promise<Tip> {
  try {
    const info = await clippyApi.getSystemInfo();

    if (!info) {
      return {
        type: "system",
        content: "💻 Sistema funcionando correctamente",
        icon: "💻",
      };
    }

    const cpuStr = `CPU: ${info.cpuUsage.toFixed(1)}%`;
    const ramUsedGB = (info.memoryUsed / 1024 / 1024 / 1024).toFixed(1);
    const ramTotalGB = (info.memoryTotal / 1024 / 1024 / 1024).toFixed(1);
    const ramStr = `RAM: ${ramUsedGB}/${ramTotalGB} GB`;

    const diskUsedGB = (info.diskUsed / 1024 / 1024 / 1024).toFixed(0);
    const diskTotalGB = (info.diskTotal / 1024 / 1024 / 1024).toFixed(0);
    const diskStr = `Disco: ${diskUsedGB}/${diskTotalGB} GB`;

    return {
      type: "system",
      content: `💻 ${cpuStr} | ${ramStr} | ${diskStr}`,
      icon: "💻",
    };
  } catch (error) {
    return {
      type: "system",
      content: "💻 Sistema funcionando correctamente",
      icon: "💻",
    };
  }
}

/**
 * Get shortcut tip
 */
function getShortcutTip(activeApp?: string): Tip {
  const shortcut = getRandomShortcut(activeApp);
  return {
    type: "shortcut",
    content: formatShortcutForPlatform(shortcut),
    icon: "⌨️",
  };
}

/**
 * Get greeting tip
 */
function getGreetingTip(): Tip {
  return {
    type: "greeting",
    content: getGreetingByTimeOfDay(),
    icon: "👋",
  };
}

/**
 * Get productivity tip
 */
function getProductivityTip(): Tip {
  const randomIndex = Math.floor(Math.random() * PRODUCTIVITY_TIPS.length);
  return {
    type: "productivity",
    content: PRODUCTIVITY_TIPS[randomIndex],
    icon: "💡",
  };
}

/**
 * Get health tip
 */
function getHealthTip(): Tip {
  const randomIndex = Math.floor(Math.random() * HEALTH_TIPS.length);
  return {
    type: "health",
    content: HEALTH_TIPS[randomIndex],
    icon: "🧘",
  };
}

/**
 * Get 'Did you know' tip
 */
function getDidYouKnowTip(): Tip {
  const randomIndex = Math.floor(Math.random() * DID_YOU_KNOW_TIPS.length);
  return {
    type: "didyouknow",
    content: DID_YOU_KNOW_TIPS[randomIndex],
    icon: "🧠",
  };
}

/**
 * Get AI tip using the external LLM provider
 * Returns null if no response was received (bubble should not be shown)
 */

// History of recently generated AI tips (max 6) to avoid repeating content
const AI_TIP_HISTORY: string[] = [];
const AI_TIP_HISTORY_MAX = 6;

async function getAITip(settings: SettingsState): Promise<Tip | null> {
  try {
    if (!settings.useExternalApi || !settings.externalApiKey) {
      return null;
    }

    const categories = (settings.tipAICategories || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    // Categories are required: avoid making requests without them
    if (categories.length === 0) {
      return null;
    }

    // Pick a random category instead of sending all at once
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];

    const categoryPrompt = `El tip debe ser sobre la siguiente categoría: ${randomCategory}.`;

    // Build short context of previously given tips so the AI doesn't repeat them
    const historyContext =
      AI_TIP_HISTORY.length > 0
        ? `Tips que ya has dado anteriormente (NO los repitas ni te repitas con ellos):\n${AI_TIP_HISTORY.map(
            (t, i) => `${i + 1}. ${t}`,
          ).join("\n")}`
        : "Aún no has dado ningún tip.";

    const systemPrompt = `Eres un generador de tips. El usuario te dará SOLO un tema (una palabra o frase corta). Tu tarea es generar un tip breve y útil sobre ese tema.
REGLAS ESTRICTAS E INNEGOCIABLES:
- NO analices ni comentes el tema. NO repitas el tema. NO expliques qué es.
- Genera DIRECTAMENTE el tip sobre el tema, como si fuera un dato curioso o consejo útil.
- NUNCA empieces con frases como "Claro", "Aquí tienes", "Por supuesto", "Claro que sí", "Aquí está", "Te comparto" ni similares. Responde SOLO con el contenido del tip.
- El tip debe ser EXTREMADAMENTE corto: UNA sola frase como máximo, o DOS frases muy breves. NUNCA más.
- Máximo 15-20 palabras en total. Si no puedes resumirlo en tan poco, simplifica la idea.
- NO uses listas numeradas, viñetas, ni índices como [1], [2], [a], etc.
- NO uses corchetes [] en absoluto.
- NO uses markdown, asteriscos ni negritas.
- NO añadas emojis ni iconos.
- NO uses puntos y coma ni paréntesis largos.
- Responde SOLO con el texto del tip, sin introducciones, explicaciones ni despedidas.
- El texto debe caber en 2 líneas de una burbuja pequeña.
${categoryPrompt}
${historyContext}`;

    const stream = ExternalLLMService.streamResponse(
      settings.externalApiProvider as ExternalApiProvider,
      settings.externalApiKey,
      settings.externalModelId || "gpt-4o",
      [{ role: "user", content: randomCategory }],
      systemPrompt,
      undefined,
      settings.externalApiCustomBaseUrl,
    );

    let content = "";
    for await (const chunk of stream) {
      content += chunk;
    }

    content = content.trim();

    if (!content) {
      return null;
    }

    // Strip markdown formatting (bold, italic, code, headers, links)
    content = content
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+[.)]\s+/gm, "")
      .replace(/\s+/g, " ")
      .trim();

    // Remove common conversational prefixes
    content = content.replace(
      /^(claro|claro que sí|claro que si|por supuesto|aquí tienes|aqui tienes|aquí está|aqui esta|te comparto|con gusto|claro, aquí|claro, aqui)[\s,:!.-]*/i,
      "",
    );
    content = content.trim();

    // Safety truncation: keep the tip short enough for the small bubble
    const MAX_WORDS = 20;
    const words = content.split(/\s+/);
    if (words.length > MAX_WORDS) {
      content = words.slice(0, MAX_WORDS).join(" ");
      // Remove trailing punctuation if we cut mid-sentence
      content = content.replace(/[,\s]+$/, "");
      if (!/[.!?]$/.test(content)) {
        content += ".";
      }
    }

    // Store the generated tip in history (keep last 6) to avoid repetition
    AI_TIP_HISTORY.push(content);
    if (AI_TIP_HISTORY.length > AI_TIP_HISTORY_MAX) {
      AI_TIP_HISTORY.shift();
    }

    return {
      type: "ai",
      content,
      icon: "🤖",
    };
  } catch (error) {
    console.error("Error generating AI tip:", error);
    return null;
  }
}

/**
 * WMO Weather Code to emoji and description mapping
 */
const WMO_WEATHER_CODES: Record<
  number,
  { emoji: string; description: string }
> = {
  0: { emoji: "☀️", description: "Despejado" },
  1: { emoji: "🌤️", description: "Mayormente despejado" },
  2: { emoji: "⛅", description: "Parcialmente nublado" },
  3: { emoji: "☁️", description: "Nublado" },
  45: { emoji: "🌫️", description: "Niebla" },
  48: { emoji: "🌫️", description: "Niebla helada" },
  51: { emoji: "🌧️", description: "Llovizna ligera" },
  53: { emoji: "🌧️", description: "Llovizna moderada" },
  55: { emoji: "🌧️", description: "Llovizna densa" },
  56: { emoji: "🌧️", description: "Llovizna helada" },
  57: { emoji: "🌧️", description: "Llovizna helada densa" },
  61: { emoji: "🌧️", description: "Lluvia ligera" },
  63: { emoji: "🌧️", description: "Lluvia moderada" },
  65: { emoji: "🌧️", description: "Lluvia intensa" },
  66: { emoji: "🌧️", description: "Lluvia helada" },
  67: { emoji: "🌧️", description: "Lluvia helada intensa" },
  71: { emoji: "🌨️", description: "Nieve ligera" },
  73: { emoji: "🌨️", description: "Nieve moderada" },
  75: { emoji: "🌨️", description: "Nieve intensa" },
  77: { emoji: "🌨️", description: "Copos de nieve" },
  80: { emoji: "🌦️", description: "Chubascos ligeros" },
  81: { emoji: "🌦️", description: "Chubascos moderados" },
  82: { emoji: "🌦️", description: "Chubascos intensos" },
  85: { emoji: "🌨️", description: "Chubascos de nieve" },
  86: { emoji: "🌨️", description: "Chubascos de nieve intensos" },
  95: { emoji: "⛈️", description: "Tormenta" },
  96: { emoji: "⛈️", description: "Tormenta con granizo" },
  99: { emoji: "⛈️", description: "Tormenta con granizo intenso" },
};

/**
 * Get weather info from Open-Meteo API
 */
async function getWeatherTip(settings: SettingsState): Promise<Tip> {
  try {
    const { weatherLatitude, weatherLongitude, weatherLocationName } = settings;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherLatitude}&longitude=${weatherLongitude}&current=temperature_2m,weather_code`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Weather API error");
    }

    const data = await response.json();
    const temp = Math.round(data.current.temperature_2m);
    const weatherCode = data.current.weather_code;
    const weather = WMO_WEATHER_CODES[weatherCode] || {
      emoji: "🌡️",
      description: "Desconocido",
    };

    return {
      type: "weather",
      content: `${weather.emoji} ${temp}°C - ${weather.description}\n📍 ${weatherLocationName}`,
      icon: weather.emoji,
    };
  } catch (error) {
    return {
      type: "weather",
      content: "🌡️ No se pudo obtener el clima",
      icon: "🌡️",
    };
  }
}

/**
 * Get available tip types based on settings
 */
function getEnabledTipTypes(settings: SettingsState): TipType[] {
  const types: TipType[] = [];

  if (settings.tipBubbleShowTime) types.push("time");
  if (settings.tipBubbleShowSystem) types.push("system");
  if (settings.tipBubbleShowShortcuts) types.push("shortcut");
  if (settings.tipBubbleShowGreeting) types.push("greeting");
  if (settings.tipBubbleShowProductivity) types.push("productivity");
  if (settings.tipBubbleShowWeather) types.push("weather");
  if (settings.tipBubbleShowHealth) types.push("health");
  if (settings.tipBubbleShowDidYouKnow) types.push("didyouknow");
  if (settings.tipBubbleShowAI && settings.useExternalApi) types.push("ai");

  return types;
}

// Rotation state: keeps track of the last shown tip type so tips rotate
// evenly instead of always showing the same one (e.g. AI tips)
let lastTipType: TipType | null = null;

/**
 * Get a random tip based on enabled settings
 */
export async function getRandomTip(
  settings: SettingsState,
  activeApp?: string,
): Promise<Tip | null> {
  const enabledTypes = getEnabledTipTypes(settings);

  if (enabledTypes.length === 0) {
    return null;
  }

  let randomType: TipType;

  // Simple heuristic: 40% chance to show shortcut if app context is available
  // and shortcuts are enabled
  if (activeApp && settings.tipBubbleShowShortcuts && Math.random() < 0.4) {
    randomType = "shortcut";
  } else {
    // Rotation: avoid repeating the same type as the previous tip
    const candidates = enabledTypes.filter((t) => t !== lastTipType);
    const pool = candidates.length > 0 ? candidates : enabledTypes;
    randomType = pool[Math.floor(Math.random() * pool.length)];
  }

  lastTipType = randomType;

  switch (randomType) {
    case "time":
      return getTimeTip(settings.tipBubbleTimeFormat);
    case "system":
      return getSystemTip();
    case "shortcut":
      return getShortcutTip(activeApp);
    case "greeting":
      return getGreetingTip();
    case "productivity":
      return getProductivityTip();
    case "weather":
      return getWeatherTip(settings);
    case "health":
      return getHealthTip();
    case "didyouknow":
      return getDidYouKnowTip();
    case "ai":
      return getAITip(settings);
    default:
      return getShortcutTip(activeApp);
  }
}

/**
 * Convert interval setting to milliseconds
 */
export function intervalToMs(interval: string): number {
  switch (interval) {
    case "1m":
      return 60 * 1000;
    case "5m":
      return 5 * 60 * 1000;
    case "10m":
      return 10 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "silent":
      return 0;
    default:
      return 5 * 60 * 1000;
  }
}
