/**
 * SpeechBubble component - Displays tips over Clippy in Windows 98 style
 * Positioned within the main 125x100px window
 */

import { useCallback, useEffect, useState } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { getRandomTip, intervalToMs, Tip } from "../helpers/tipProviders";

import "./css/SpeechBubble.css";

const INITIAL_DELAY = 3000; // Show first tip 3 seconds after start

interface SpeechBubbleProps {
  onVisibilityChange?: (isVisible: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function SpeechBubble({
  onVisibilityChange,
  onMouseEnter,
  onMouseLeave,
  mode = "tips", // "tips" | "stats"
}: SpeechBubbleProps & { mode?: "tips" | "stats" }) {
  const { settings } = useSharedState();
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Stats state
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // Notify parent when visibility changes
  useEffect(() => {
    onVisibilityChange?.(isVisible && !isExiting);
  }, [isVisible, isExiting, onVisibilityChange]);

  // TIPS MODE LOGIC
  const showTip = useCallback(async () => {
    // Only show tips if mode is tips!
    if (mode !== "tips") return;

    if (!settings.tipBubbleEnabled || settings.tipBubbleInterval === "silent") {
      return;
    }

    try {
      const tip = await getRandomTip(settings);
      if (tip) {
        setCurrentTip(tip);
        setIsExiting(false);
        setIsVisible(true);

        // Get display duration from settings (convert seconds to ms)
        const displayDuration = (settings.tipBubbleDuration || 8) * 1000;

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
  }, [settings, mode]);

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
  }, [settings.tipBubbleEnabled, settings.tipBubbleInterval, showTip, mode]);

  // STATS MODE LOGIC
  useEffect(() => {
    if (mode !== "stats") return;

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
  }, [mode, settings.tipBubbleDuration]);

  if (
    !isVisible ||
    (!currentTip && mode === "tips") ||
    (!systemInfo && mode === "stats")
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
          {mode === "tips" && currentTip && <p>{currentTip.content}</p>}
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
        </div>
      </div>
    </div>
  );
}
