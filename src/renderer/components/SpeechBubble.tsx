/**
 * SpeechBubble component - Displays tips over Clippy in Windows 98 style
 * Positioned within the main 125x100px window
 */

import { useCallback, useEffect, useState } from "react";
import { useSharedState } from "../contexts/SharedStateContext";
import { getRandomTip, intervalToMs, Tip } from "../helpers/tipProviders";

import "./css/SpeechBubble.css";

const DISPLAY_DURATION = 8000; // How long to show each tip (8 seconds)
const INITIAL_DELAY = 3000; // Show first tip 3 seconds after start

export function SpeechBubble() {
  const { settings } = useSharedState();
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const showTip = useCallback(async () => {
    if (!settings.tipBubbleEnabled || settings.tipBubbleInterval === "silent") {
      return;
    }

    try {
      const tip = await getRandomTip(settings);
      if (tip) {
        setCurrentTip(tip);
        setIsExiting(false);
        setIsVisible(true);

        // Hide after display duration
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            setIsVisible(false);
            setIsExiting(false);
          }, 300); // Wait for exit animation
        }, DISPLAY_DURATION);
      }
    } catch (error) {
      console.error("Error showing tip:", error);
    }
  }, [settings]);

  useEffect(() => {
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
  }, [settings.tipBubbleEnabled, settings.tipBubbleInterval, showTip]);

  if (!isVisible || !currentTip) {
    return null;
  }

  return (
    <div
      className={`speech-bubble-container ${isExiting ? "exiting" : ""}`}
      role="alert"
      aria-live="polite">
      <div className="speech-bubble">
        <div className="speech-bubble-content">
          <p>{currentTip.content}</p>
        </div>
      </div>
    </div>
  );
}
