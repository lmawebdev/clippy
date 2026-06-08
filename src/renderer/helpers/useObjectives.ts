import { useEffect, useRef, useCallback } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { useChat } from "../contexts/ChatContext";
import { Objective, ObjectiveCategory } from "../../sharedState";

// Apps que cuentan para cada categoría
const CATEGORY_APPS: Record<ObjectiveCategory, string[]> = {
  code: [
    "visual studio code",
    "code",
    "cursor",
    "windsurf",
    "zed",
    "atom",
    "sublime text",
    "sublime",
    "bbedit",
    "textmate",
    "nova",
    "espresso",
    "vim",
    "neovim",
    "macvim",
    "emacs",
    "xcode",
    "android studio",
    "intellij",
    "intellij idea",
    "pycharm",
    "webstorm",
    "phpstorm",
    "goland",
    "rider",
    "rubymine",
    "fleet",
    "antigravity",
  ],
  reading: [
    "kindle",
    "books",
    "apple books",
    "readwise",
    "reader",
    "reeder",
    "netnewswire",
    "instapaper",
    "pocket",
    "safari",
    "firefox",
    "chrome",
    "arc",
    "brave",
    "obsidian",
    "notion",
    "craft",
    "bear",
    "ulysses",
    "marked",
    "typora",
    "ia writer",
  ],
  entertainment: [
    "spotify",
    "music",
    "apple music",
    "netflix",
    "youtube",
    "vlc",
    "iina",
    "plex",
    "infuse",
    "twitch",
    "discord",
    "steam",
    "epic games",
    "battle.net",
    "gog galaxy",
    "origin",
  ],
  other: [],
};

const TICK_INTERVAL_MS = 30_000; // 30s tick = 0.5 minutos acumulados por tick
const TICK_MINUTES = 0.5;

function appMatchesCategory(appName: string, category: ObjectiveCategory): boolean {
  if (!appName) return false;
  if (category === "other") return true;
  const lower = appName.toLowerCase();
  return CATEGORY_APPS[category].some((app) =>
    lower.includes(app) || app.includes(lower)
  );
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekKey(): string {
  const d = new Date();
  const tempDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tempDate.getUTCFullYear()}-W${weekNo}`;
}

function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getPeriodKey(obj: Objective): string {
  const freq = obj.frequency ?? "daily";
  if (freq === "weekly") return getWeekKey();
  if (freq === "monthly") return getMonthKey();
  return getTodayKey();
}

function isDayActive(obj: Objective): boolean {
  const today = new Date().getDay(); // 0=Sunday
  return obj.activeDays.length === 0 || obj.activeDays.includes(today);
}

export function useObjectives() {
  const { settings } = useSharedState();
  const { showBubbleMessage } = useChat();

  const objectives: Objective[] = settings.objectives ?? [];

  const activeAppRef = useRef<string>("");
  // Track which notification thresholds have been shown per objective per day
  const notifyMapRef = useRef<Record<string, Set<string>>>({});
  // Track distraction times for warnings
  const distractionTimeRef = useRef<Record<string, number>>({});

  const objectivesRef = useRef<Objective[]>(objectives);
  useEffect(() => {
    objectivesRef.current = objectives;
  }, [objectives]);

  const showBubbleMessageRef = useRef(showBubbleMessage);
  useEffect(() => {
    showBubbleMessageRef.current = showBubbleMessage;
  }, [showBubbleMessage]);

  // -------------------------------------------------------------------
  // helpers to save one objective back into the persistent array
  // -------------------------------------------------------------------
  const saveObjective = useCallback((updated: Objective) => {
    const next = objectivesRef.current.map((o) => (o.id === updated.id ? updated : o));
    window.clippy.setState("settings.objectives", next);
  }, []);

  // -------------------------------------------------------------------
  // Listen for active app updates
  // -------------------------------------------------------------------
  useEffect(() => {
    const handler = (appName: string) => {
      activeAppRef.current = appName;
    };
    if (window.clippy?.onActiveAppUpdate) {
      window.clippy.onActiveAppUpdate(handler);
    }
    return () => {
      if (window.clippy?.offActiveAppUpdate) {
        window.clippy.offActiveAppUpdate();
      }
    };
  }, []);

  // -------------------------------------------------------------------
  // Main tick – runs every TICK_INTERVAL_MS
  // -------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const todayKey = getTodayKey();
      const currentObjectives = objectivesRef.current;

      if (currentObjectives.length === 0) return;

      currentObjectives.forEach((obj) => {
        if (obj.paused) return;

        const currentPeriodKey = getPeriodKey(obj);
        const lastPeriodKey = obj.lastTrackedPeriod || currentPeriodKey;

        // If no lastTrackedPeriod, initialize it
        if (!obj.lastTrackedPeriod) {
          saveObjective({
            ...obj,
            lastTrackedPeriod: currentPeriodKey,
          });
          return;
        }

        // ---- Period change detection ----
        if (lastPeriodKey !== currentPeriodKey) {
          const alreadyRecorded = obj.history[lastPeriodKey] != null;
          if (!alreadyRecorded && (obj.frequency !== "daily" || isDayActive(obj))) {
            const completed = obj.progressTodayMinutes >= obj.targetMinutes;
            const newStreak = completed ? obj.streak + 1 : 0;
            const updatedObj: Objective = {
              ...obj,
              history: {
                ...obj.history,
                [lastPeriodKey]: completed ? "completed" : "failed",
              },
              streak: newStreak,
              progressTodayMinutes: 0,
              lastTrackedTimestamp: Date.now(),
              lastTrackedPeriod: currentPeriodKey,
            };
            saveObjective(updatedObj);

            if (completed) {
              const label = obj.frequency === "weekly" ? "semana" : obj.frequency === "monthly" ? "mes" : "ayer";
              showBubbleMessageRef.current(
                `🏆 ¡Reto "${obj.title}" completado la ${label}! Racha: ${newStreak} períodos 🔥`,
                "custom",
                12
              );
            }
          }
          return;
        }

        // ---- Progress tracking ----
        if (obj.frequency === "daily" && !isDayActive(obj)) return;

        const alreadyDone = obj.history[currentPeriodKey] === "completed";
        if (alreadyDone) return;

        const currentApp = activeAppRef.current;
        const matches = appMatchesCategory(currentApp, obj.category);

        if (matches) {
          // Reset distraction timer
          distractionTimeRef.current[obj.id] = 0;

          const newProgress = obj.progressTodayMinutes + TICK_MINUTES;
          const updated: Objective = {
            ...obj,
            progressTodayMinutes: newProgress,
            lastTrackedTimestamp: Date.now(),
          };

          // Check if just completed
          if (obj.progressTodayMinutes < obj.targetMinutes && newProgress >= obj.targetMinutes) {
            const newStreak = obj.streak + 1;
            const done: Objective = {
              ...updated,
              history: { ...updated.history, [currentPeriodKey]: "completed" },
              streak: newStreak,
            };
            saveObjective(done);
            showBubbleMessageRef.current(
              `🎉 ¡"${obj.title}" completado! ${newStreak} períodos seguidos. ¡Eres increíble! 🌟`,
              "custom",
              12
            );
            return;
          }

          saveObjective(updated);

          // ---- Motivational notifications at intervals ----
          const notifyKey = `${obj.id}-${currentPeriodKey}`;
          if (!notifyMapRef.current[notifyKey]) {
            notifyMapRef.current[notifyKey] = new Set();
          }
          const shownSet = notifyMapRef.current[notifyKey];

          const minutesLeft = obj.targetMinutes - newProgress;
          const percentDone = (newProgress / obj.targetMinutes) * 100;

          // Notify at every notifyIntervalMinutes
          const lastNotifyAt = obj.notifyIntervalMinutes > 0
            ? Math.floor(newProgress / obj.notifyIntervalMinutes) * obj.notifyIntervalMinutes
            : -1;

          if (lastNotifyAt > 0 && !shownSet.has(`interval-${lastNotifyAt}`)) {
            shownSet.add(`interval-${lastNotifyAt}`);
            if (minutesLeft > 0) {
              const messages = [
                `💪 ¡Sigue así! Llevas ${Math.round(newProgress)} min en "${obj.title}".`,
                `🚀 ¡Buen trabajo! ${Math.round(newProgress)} min completados de ${obj.targetMinutes}.`,
                `⚡ ¡No pares ahora! ${Math.round(minutesLeft)} min más y lo logras.`,
              ];
              showBubbleMessageRef.current(
                messages[Math.floor(Math.random() * messages.length)],
                "custom",
                8
              );
            }
          }

          // Special: 5 minutes remaining warning
          if (minutesLeft > 0 && minutesLeft <= 5 && !shownSet.has("5min-warning")) {
            shownSet.add("5min-warning");
            showBubbleMessageRef.current(
              `⏰ ¡Faltan ${Math.round(minutesLeft)} minutos! ¡Tú puedes con "${obj.title}"! 💪`,
              "custom",
              8
            );
          }

          // Halfway milestone
          if (percentDone >= 50 && !shownSet.has("halfway")) {
            shownSet.add("halfway");
            showBubbleMessageRef.current(
              `🎯 ¡A mitad de camino en "${obj.title}"! ¡No te rindas!`,
              "custom",
              8
            );
          }
        } else {
          // Accumulate distraction time
          const currentDistraction = (distractionTimeRef.current[obj.id] || 0) + TICK_MINUTES;
          distractionTimeRef.current[obj.id] = currentDistraction;

          if (currentDistraction >= 5 && Math.round(currentDistraction * 10) % 50 === 0) {
            showBubbleMessageRef.current(
              `⚠️ ¡Distracción detectada! Llevas ${Math.round(currentDistraction)} min sin avanzar en tu objetivo: "${obj.title}". ¡Vuelve al trabajo! 💪`,
              "custom",
              8
            );
          }
        }
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [saveObjective]);
}
