/**
 * SpeechBubble component - Displays tips over Clippy in Windows 98 style
 * Positioned within the main 125x100px window
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { getRandomTip, intervalToMs, Tip } from "../helpers/tipProviders";
import { Objective } from "../../sharedState";

import { useChat } from "../contexts/ChatContext";

import "./css/SpeechBubble.css";

const INITIAL_DELAY = 3000; // Show first tip 3 seconds after start

interface SpeechBubbleProps {
  onVisibilityChange?: (isVisible: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  mode?: "tips" | "stats" | "tamagotchi" | "custom" | "objectives";
}

export function SpeechBubble({
  onVisibilityChange,
  onMouseEnter,
  onMouseLeave,
  mode = "tips",
}: SpeechBubbleProps) {
  const { settings } = useSharedState();
  const { bubbleMessage } = useChat();
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Stats state
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [activeApp, setActiveApp] = useState<string>("");

  // Objectives live state
  const [liveObjectives, setLiveObjectives] = useState<Objective[]>([]);
  const [objectiveIndex, setObjectiveIndex] = useState(0);

  // Listen for custom bubble messages
  useEffect(() => {
    if (!bubbleMessage) return;

    setCurrentTip({ content: bubbleMessage.text } as Tip);
    setIsVisible(true);
    setIsExiting(false);

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
      }, 300);
    }, bubbleMessage.duration * 1000);

    return () => clearTimeout(timer);
  }, [bubbleMessage]);

  // Listen for active app updates
  useEffect(() => {
    const handleAppUpdate = (appName: string) => {
      setActiveApp(appName);
    };

    if (window.clippy.onActiveAppUpdate) {
      window.clippy.onActiveAppUpdate(handleAppUpdate);
    }

    return () => {
      if (window.clippy.offActiveAppUpdate) {
        window.clippy.offActiveAppUpdate();
      }
    };
  }, []);

  // Refs to hold latest state for the interval callback
  const activeAppRef = useRef(activeApp);
  const settingsRef = useRef(settings);

  // Update refs when state changes
  useEffect(() => {
    activeAppRef.current = activeApp;
    settingsRef.current = settings;
  }, [activeApp, settings]);

  // Notify parent when visibility changes
  useEffect(() => {
    onVisibilityChange?.(isVisible && !isExiting);
  }, [isVisible, isExiting, onVisibilityChange]);

  // TIPS MODE LOGIC
  const showTip = useCallback(async () => {
    // Only show tips if mode is tips!
    if (mode !== "tips") return;

    const currentSettings = settingsRef.current;
    if (
      !currentSettings.tipBubbleEnabled ||
      currentSettings.tipBubbleInterval === "silent"
    ) {
      return;
    }

    try {
      const tip = await getRandomTip(currentSettings, activeAppRef.current);
      if (tip) {
        setCurrentTip(tip);
        setIsExiting(false);
        setIsVisible(true);

        // Get display duration from settings (convert seconds to ms)
        const displayDuration = (currentSettings.tipBubbleDuration || 8) * 1000;

        // Hide after display duration
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            setIsVisible(false);
            setIsExiting(false);
          }, 300); // Wait for exit animation
        }, displayDuration);
      }
    } catch (error) {
      console.error("Error showing tip:", error);
    }
  }, [mode]);

  // Effect for TIPS scheduling
  useEffect(() => {
    // If not in tips mode, do nothing regarding tips scheduling
    if (mode !== "tips") {
      return;
    }

    if (!settings.tipBubbleEnabled || settings.tipBubbleInterval === "silent") {
      return;
    }

    // Show first tip after initial delay
    const initialTimeout = setTimeout(showTip, INITIAL_DELAY);

    // Set up interval for subsequent tips
    const intervalMs = intervalToMs(settings.tipBubbleInterval);
    const interval = setInterval(showTip, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [
    settings.tipBubbleEnabled,
    settings.tipBubbleInterval,
    showTip,
    mode,
    // activeApp is intentionally omitted to avoid resetting timer on app switch
  ]);

  // STATS MODE LOGIC
  useEffect(() => {
    if (mode !== "stats") return;

    if (!settings.tipBubbleEnabled) {
      setIsVisible(false);
      return;
    }

    // Show stats -> visible true
    setIsVisible(true);
    setIsExiting(false);

    // Fetch stats loop
    const fetchStats = async () => {
      try {
        const info = await window.clippy.getSystemInfo();
        setSystemInfo(info);
      } catch (e) {
        console.error("Failed to get system info", e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);

    // Auto-hide stats after duration
    const displayDuration = (settings.tipBubbleDuration || 8) * 1000;
    const timeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
      }, 300);
    }, displayDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [mode, settings.tipBubbleDuration, settings.tipBubbleEnabled]);

  // TAMAGOTCHI MODE LOGIC
  useEffect(() => {
    if (mode !== "tamagotchi") return;

    setIsVisible(true);
    setIsExiting(false);

    // Auto-hide after duration
    const displayDuration = (settings.tipBubbleDuration || 8) * 1000;
    const timeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
      }, 300);
    }, displayDuration);

    return () => {
      clearTimeout(timeout);
    };
  }, [mode, settings.tipBubbleDuration]);

  // OBJECTIVES MODE LOGIC
  useEffect(() => {
    if (mode !== "objectives") return;

    const objectives: Objective[] = settingsRef.current.objectives ?? [];
    const active = objectives.filter((o) => !o.paused);

    if (active.length === 0) {
      setIsVisible(false);
      return;
    }

    setLiveObjectives(active);
    setObjectiveIndex(0);
    setIsVisible(true);
    setIsExiting(false);

    // Live tick every second to update progress display (uses ref to always get fresh data)
    const interval = setInterval(() => {
      const current: Objective[] = (settingsRef.current.objectives ?? []).filter((o) => !o.paused);
      setLiveObjectives(current);
    }, 1000);

    // Auto-hide after duration
    const displayDuration = (settingsRef.current.tipBubbleDuration || 8) * 1000;
    const timeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
      }, 300);
    }, displayDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [mode]);

  if (
    !isVisible ||
    (!currentTip && mode === "tips") ||
    (!systemInfo && mode === "stats") ||
    (!currentTip && mode === "custom") ||
    (mode === "objectives" && liveObjectives.length === 0)
  ) {
    return null;
  }

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`speech-bubble-container ${isExiting ? "exiting" : ""}`}
      role="alert"
      aria-live="polite">
      <div className="speech-bubble">
        <div className="speech-bubble-content">
          {(mode === "tips" || mode === "custom") && currentTip && <p>{currentTip.content}</p>}
          {mode === "stats" && systemInfo && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                width: "100%",
              }}>
              <div
                style={{
                  fontWeight: "bold",
                  borderBottom: "1px solid #777",
                  marginBottom: "2px",
                  fontSize: "10px",
                  textAlign: "center",
                }}>
                System
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                }}>
                <span>CPU:</span>
                <span>{Math.round(systemInfo.cpuUsage)}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#ccc",
                  border: "1px solid #777",
                }}>
                <div
                  style={{
                    width: `${Math.min(systemInfo.cpuUsage, 100)}%`,
                    height: "100%",
                    background:
                      systemInfo.cpuUsage > 80 ? "#ff0000" : "#000080",
                  }}></div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  marginTop: "2px",
                }}>
                <span>RAM:</span>
                <span>
                  {Math.round(
                    (systemInfo.memoryUsed / 1024 / 1024 / 1024) * 10,
                  ) / 10}
                  GB
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#ccc",
                  border: "1px solid #777",
                }}>
                <div
                  style={{
                    width: `${Math.min((systemInfo.memoryUsed / systemInfo.memoryTotal) * 100, 100)}%`,
                    height: "100%",
                    background:
                      systemInfo.memoryUsed / systemInfo.memoryTotal > 0.8
                        ? "#ff0000"
                        : "#000080",
                  }}></div>
              </div>
            </div>
          )}
          {mode === "tamagotchi" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                width: "100%",
              }}>
              <div
                style={{
                  fontWeight: "bold",
                  borderBottom: "1px solid #777",
                  marginBottom: "2px",
                  fontSize: "10px",
                  textAlign: "center",
                }}>
                Pet
              </div>

              {/* Health */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                }}
              >
                <span>Health:</span>
                <span>{Math.round(settings.tamagotchiHealth ?? 80)}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#ccc",
                  border: "1px solid #777",
                }}
              >
                <div
                  style={{
                    width: `${settings.tamagotchiHealth ?? 80}%`,
                    height: "100%",
                    background:
                      (settings.tamagotchiHealth ?? 80) < 30 ? "#ff0000" : "#000080",
                  }}
                ></div>
              </div>

              {/* Food */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  marginTop: "2px",
                }}
              >
                <span>Food:</span>
                <span>{Math.round(settings.tamagotchiHunger ?? 80)}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#ccc",
                  border: "1px solid #777",
                }}
              >
                <div
                  style={{
                    width: `${settings.tamagotchiHunger ?? 80}%`,
                    height: "100%",
                    background:
                      (settings.tamagotchiHunger ?? 80) < 30 ? "#ff0000" : "#000080",
                  }}
                ></div>
              </div>

              {/* Love */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  marginTop: "2px",
                }}
              >
                <span>Love:</span>
                <span>{Math.round(settings.tamagotchiHappiness ?? 80)}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#ccc",
                  border: "1px solid #777",
                }}
              >
                <div
                  style={{
                    width: `${settings.tamagotchiHappiness ?? 80}%`,
                    height: "100%",
                    background:
                      (settings.tamagotchiHappiness ?? 80) < 30 ? "#ff0000" : "#000080",
                  }}
                ></div>
              </div>

              {/* Energy */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  marginTop: "2px",
                }}
              >
                <span>Energy:</span>
                <span>{Math.round(settings.tamagotchiEnergy ?? 80)}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#ccc",
                  border: "1px solid #777",
                }}
              >
                <div
                  style={{
                    width: `${settings.tamagotchiEnergy ?? 80}%`,
                    height: "100%",
                    background:
                      (settings.tamagotchiEnergy ?? 80) < 30 ? "#ff0000" : "#000080",
                  }}
                ></div>
              </div>

              {/* Focus */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  marginTop: "2px",
                }}
              >
                <span>Focus:</span>
                <span>{Math.round(settings.tamagotchiFocus ?? 50)}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#ccc",
                  border: "1px solid #777",
                  marginBottom: "4px",
                }}
              >
                <div
                  style={{
                    width: `${settings.tamagotchiFocus ?? 50}%`,
                    height: "100%",
                    background:
                      (settings.tamagotchiFocus ?? 50) < 30 ? "#ff0000" : "#000080",
                  }}
                ></div>
              </div>

              {/* Hint */}
              <div
                style={{
                  fontSize: "8px",
                  textAlign: "center",
                  marginTop: "4px",
                  borderTop: "1px solid #aaa",
                  paddingTop: "3px",
                  color: "#555",
                  fontStyle: "italic",
                }}
              >
                Right-click to care
              </div>
            </div>
          )}
          {mode === "objectives" && liveObjectives.length > 0 && (() => {
            const obj = liveObjectives[objectiveIndex % liveObjectives.length];
            if (!obj) return null;
            const today = new Date();
            const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            const pct = Math.min(100, (obj.progressTodayMinutes / obj.targetMinutes) * 100);
            const isCompleted = obj.history[todayKey] === "completed";
            const CATEGORY_ICONS: Record<string, string> = { code: "💻", reading: "📖", entertainment: "🎮", other: "📌" };
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "100%" }}>
                <div style={{ fontWeight: "bold", borderBottom: "1px solid #777", marginBottom: "2px", fontSize: "10px", textAlign: "center" }}>
                  {CATEGORY_ICONS[obj.category]} Goal {liveObjectives.length > 1 ? `${objectiveIndex % liveObjectives.length + 1}/${liveObjectives.length}` : ""}
                </div>
                <div style={{ fontSize: "9px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={obj.title}>
                  {isCompleted ? "✅ " : ""}{obj.title}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <span>{obj.progressTodayMinutes.toFixed(1)} / {obj.targetMinutes} min</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <div style={{ width: "100%", height: "5px", background: "#ccc", border: "1px solid #777" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: isCompleted ? "#00aa00" : "#000080", transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", marginTop: "1px" }}>
                  <span>🔥 Streak: {obj.streak}</span>
                  {!isCompleted && <span>{(obj.targetMinutes - obj.progressTodayMinutes).toFixed(1)} min left</span>}
                  {isCompleted && <span style={{ color: "#00aa00" }}>Done! 🎉</span>}
                </div>
                {liveObjectives.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 2 }}>
                    {liveObjectives.map((_, i) => (
                      <span
                        key={i}
                        onClick={() => setObjectiveIndex(i)}
                        style={{ width: 6, height: 6, borderRadius: "50%", background: i === objectiveIndex % liveObjectives.length ? "#000080" : "#ccc", border: "1px solid #666", cursor: "pointer", display: "inline-block" }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
