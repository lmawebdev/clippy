import { useEffect, useState, useCallback, useRef } from "react";

import { ANIMATIONS, Animation } from "../clippy-animations";
import {
  EMPTY_ANIMATION,
  getRandomIdleAnimation,
} from "../clippy-animation-helpers";
import { useChat } from "../contexts/ChatContext";
import { log } from "../logging";
import { useDebugState } from "../contexts/DebugContext";
import { SpeechBubble } from "./SpeechBubble";

const WAIT_TIME = 6000;
const LOOK_UP_ANIMATION = "LookUp";
const IDEA_ANIMATION = "GetAttention"; // "Tengo una idea" animation

export function Clippy() {
  const {
    animationKey,
    status,
    setStatus,
    setIsChatWindowOpen,
    isChatWindowOpen,
  } = useChat();
  const { enableDragDebug } = useDebugState();
  const [animation, setAnimation] = useState<Animation>(EMPTY_ANIMATION);
  const [animationTimeoutId, setAnimationTimeoutId] = useState<
    number | undefined
  >(undefined);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const lookUpIntervalRef = useRef<number | null>(null);
  const ideaTimeoutRef = useRef<number | null>(null);

  // Helper to clear all bubble-related timers
  const clearBubbleTimers = useCallback(() => {
    if (lookUpIntervalRef.current) {
      window.clearInterval(lookUpIntervalRef.current);
      lookUpIntervalRef.current = null;
    }
    if (ideaTimeoutRef.current) {
      window.clearTimeout(ideaTimeoutRef.current);
      ideaTimeoutRef.current = null;
    }
  }, []);

  const playAnimation = useCallback((key: string) => {
    if (ANIMATIONS[key]) {
      log(`Playing animation`, { key });

      if (animationTimeoutId) {
        window.clearTimeout(animationTimeoutId);
      }

      setAnimation(ANIMATIONS[key]);
      setAnimationTimeoutId(
        window.setTimeout(() => {
          setAnimation(ANIMATIONS.Default);
        }, ANIMATIONS[key].length + 200),
      );
    } else {
      log(`Animation not found`, { key });
    }
  }, []);

  // Handle bubble visibility - first play "idea" animation, then LookUp in loop
  const handleBubbleVisibilityChange = useCallback(
    (visible: boolean) => {
      setIsBubbleVisible(visible);

      // Always clear existing timers first
      clearBubbleTimers();

      if (visible) {
        // Clear any existing animation timeout
        if (animationTimeoutId) {
          window.clearTimeout(animationTimeoutId);
          setAnimationTimeoutId(undefined);
        }

        // First play the "idea" animation
        setAnimation(ANIMATIONS[IDEA_ANIMATION]);

        // After idea animation completes, start LookUp loop
        ideaTimeoutRef.current = window.setTimeout(() => {
          setAnimation(ANIMATIONS[LOOK_UP_ANIMATION]);

          lookUpIntervalRef.current = window.setInterval(() => {
            setAnimation(ANIMATIONS[LOOK_UP_ANIMATION]);
          }, ANIMATIONS[LOOK_UP_ANIMATION].length);
        }, ANIMATIONS[IDEA_ANIMATION].length);
      } else {
        // Return to default animation
        setAnimation(ANIMATIONS.Default);
      }
    },
    [animationTimeoutId, clearBubbleTimers],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearBubbleTimers();
    };
  }, [clearBubbleTimers]);

  // Play a random animation when clicked
  const handleClick = useCallback(() => {
    if (isBubbleVisible) return; // Don't interrupt bubble animation

    const animationKeys = Object.keys(ANIMATIONS).filter(
      (key) => key !== "Default" && key !== "Show" && key !== "Hide",
    );
    const randomKey =
      animationKeys[Math.floor(Math.random() * animationKeys.length)];
    playAnimation(randomKey);
  }, [playAnimation, isBubbleVisible]);

  useEffect(() => {
    const playRandomIdleAnimation = () => {
      if (status !== "idle" || isBubbleVisible) return;

      const randomIdleAnimation = getRandomIdleAnimation(animation);
      setAnimation(randomIdleAnimation);

      // Reset back to default after 6 seconds and schedule next animation
      setAnimationTimeoutId(
        window.setTimeout(() => {
          setAnimation(ANIMATIONS.Default);
          setAnimationTimeoutId(
            window.setTimeout(playRandomIdleAnimation, WAIT_TIME),
          );
        }, randomIdleAnimation.length),
      );
    };

    if (status === "welcome" && animation === EMPTY_ANIMATION) {
      setAnimation(ANIMATIONS.Show);
      setTimeout(() => {
        setStatus("idle");
      }, ANIMATIONS.Show.length + 200);
    } else if (status === "idle" && !isBubbleVisible) {
      if (!animationTimeoutId) {
        playRandomIdleAnimation();
      }
    }

    // Clean up timeouts when component unmounts or status changes
    return () => {
      if (animationTimeoutId) {
        window.clearTimeout(animationTimeoutId);
      }
    };
  }, [status, isBubbleVisible]);

  useEffect(() => {
    if (!isBubbleVisible) {
      log(`New animation key`, { animationKey });
      playAnimation(animationKey);
    }
  }, [animationKey, playAnimation, isBubbleVisible]);

  return (
    <div>
      <SpeechBubble onVisibilityChange={handleBubbleVisibilityChange} />
      <div
        className="app-drag"
        style={{
          position: "absolute",
          height: "93px",
          width: "124px",
          backgroundColor: enableDragDebug ? "blue" : "transparent",
          opacity: 0.5,
          zIndex: 5,
        }}>
        <div
          className="app-no-drag"
          style={{
            position: "absolute",
            height: "80px",
            width: "45px",
            backgroundColor: enableDragDebug ? "red" : "transparent",
            zIndex: 10,
            right: "40px",
            top: "2px",
            cursor: "pointer",
          }}
          onClick={handleClick}></div>
      </div>
      <img
        className="app-no-select"
        src={animation.src}
        draggable={false}
        alt="Clippy"
      />
    </div>
  );
}
