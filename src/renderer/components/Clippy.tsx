import { useEffect, useState, useCallback, useRef } from "react";

import { ANIMATIONS, Animation } from "../clippy-animations";
import {
  EMPTY_ANIMATION,
  getRandomIdleAnimation,
  ANIMATION_KEYS,
} from "../clippy-animation-helpers";
import { useChat } from "../contexts/ChatContext";
import { log } from "../logging";
import { useDebugState } from "../contexts/DebugContext";
import { SpeechBubble } from "./SpeechBubble";

const LOOK_UP_ANIMATION = "LookUp";
const IDEA_ANIMATION = "GetAttention";

// Helper to filter out system animations
const VALID_RANDOM_KEYS = ANIMATION_KEYS.filter(
  (key) => key !== "Default" && key !== "Show" && key !== "Hide",
);

export function Clippy() {
  const { animationKey, status } = useChat();
  const { enableDragDebug } = useDebugState();
  const [animation, setAnimation] = useState<Animation>(EMPTY_ANIMATION);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);

  // Refs for scheduler management
  const timeoutRef = useRef<number | undefined>(undefined);
  const lastIdleAnimationRef = useRef<Animation | undefined>(undefined);

  // Track if we are currently handling a special activity to prevent overlaps
  // "idle-loop" | "click-reaction" | "bubble-interaction" | "external-command"
  const activityRef = useRef<string>("idle-loop");

  // Clear any pending timeout
  const clearScheduler = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  // --- Animation Primitives ---

  const playOneAnimation = useCallback(
    (anim: Animation, onComplete?: () => void) => {
      setAnimation(anim);
      clearScheduler();

      // Safety: if length is 0 (Default), we might want minimum time, but usually animations have length.
      // We add a small buffer? The original code added 200ms.
      const duration = anim.length > 0 ? anim.length : 100;

      timeoutRef.current = window.setTimeout(() => {
        onComplete?.();
      }, duration);
    },
    [clearScheduler],
  );

  const setIdleFrame = useCallback(() => {
    setAnimation(ANIMATIONS.Default);
  }, []);

  // --- Logic Loops ---

  // 1. Burst Logic: Play animations until total time ~4-5s
  const playIdleBurst = useCallback(
    (targetDurationMs: number, onComplete: () => void) => {
      let currentDuration = 0;

      // Recursive function to play next animation in burst
      const playNext = () => {
        // If we have exceeded target duration, stop
        if (currentDuration >= targetDurationMs) {
          onComplete();
          return;
        }

        const nextAnim = getRandomIdleAnimation(lastIdleAnimationRef.current);
        lastIdleAnimationRef.current = nextAnim;
        const duration = nextAnim.length > 0 ? nextAnim.length : 1000;

        currentDuration += duration;

        playOneAnimation(nextAnim, () => {
          playNext();
        });
      };

      playNext();
    },
    [playOneAnimation],
  );

  // 2. Idle Cycle: Rest -> Burst -> Rest...
  const startIdleLoop = useCallback(() => {
    activityRef.current = "idle-loop";

    // We define one full cycle as: Burst -> Rest.
    // But when we "start", we generally want to do something?
    // User said: "al iniciar la app (start)... rafaga... luego descanso".
    // So we start with Burst.

    const runBurst = () => {
      if (activityRef.current !== "idle-loop") return;
      if (isBubbleVisible) return; // Guard

      const burstDuration = 4000 + Math.floor(Math.random() * 1000); // 4-5s

      playIdleBurst(burstDuration, () => {
        if (activityRef.current !== "idle-loop") return;

        // After burst, set default and wait 3-4s
        setIdleFrame();
        const restDuration = 3000 + Math.floor(Math.random() * 1000); // 3-4s

        timeoutRef.current = window.setTimeout(() => {
          runBurst();
        }, restDuration);
      });
    };

    runBurst();
  }, [playIdleBurst, setIdleFrame, isBubbleVisible]);

  // --- Interaction Handlers ---

  // Handle "Click"
  const handleClick = useCallback(() => {
    if (isBubbleVisible) return; // Don't interrupt bubble

    // Interrupt current activity
    clearScheduler();
    activityRef.current = "click-reaction";

    // "hace una animación random"
    const randomKey =
      VALID_RANDOM_KEYS[Math.floor(Math.random() * VALID_RANDOM_KEYS.length)];
    const anim = ANIMATIONS[randomKey];

    playOneAnimation(anim, () => {
      // "despues de 2-3 seg. que vuelva al estado incial"
      setIdleFrame();
      const waitTime = 2000 + Math.floor(Math.random() * 1000); // 2-3s

      timeoutRef.current = window.setTimeout(() => {
        // Resume loop
        startIdleLoop();
      }, waitTime);
    });
  }, [
    isBubbleVisible,
    clearScheduler,
    playOneAnimation,
    setIdleFrame,
    startIdleLoop,
  ]);

  // Handle Bubble Visibility
  const handleBubbleVisibilityChange = useCallback(
    (visible: boolean) => {
      setIsBubbleVisible(visible);

      if (visible) {
        // Interrupt everything
        clearScheduler();
        activityRef.current = "bubble-interaction";

        // Standard behavior: Look at bubble
        const playLookUpLoop = () => {
          if (activityRef.current !== "bubble-interaction") return;
          playOneAnimation(ANIMATIONS[LOOK_UP_ANIMATION], () => {
            // Keep looking up as long as visible
            playLookUpLoop();
          });
        };

        playOneAnimation(ANIMATIONS[IDEA_ANIMATION], () => {
          playLookUpLoop();
        });
      } else {
        // Bubble disappeared, visible = false
        // "cuando desaparece la burbuja, 2 seg, despues seguir con las ráfágas"

        // Ensure we break the lookup loop if it was pending
        clearScheduler();
        activityRef.current = "bubble-interaction-cooldown";

        setIdleFrame(); // Back to neutral

        timeoutRef.current = window.setTimeout(() => {
          // Resume normal loop
          startIdleLoop();
        }, 2000);
      }
    },
    [clearScheduler, playOneAnimation, setIdleFrame, startIdleLoop],
  );

  // --- Effects ---

  // Initial mount start
  useEffect(() => {
    // Only start if we are in a state that should animate (e.g. idle or welcome)
    // And not if bubble is already visible for some reason
    if ((status === "idle" || status === "welcome") && !isBubbleVisible) {
      startIdleLoop();
    }

    return () => clearScheduler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount to kick off the loop.
  // Note: if status changes later, we might need to react, but 'status' usage in 'runBurst' via closures?
  // No, 'runBurst' is defined in 'startIdleLoop' which is created once?
  // Wait, 'startIdleLoop' depends on 'isBubbleVisible'.
  // If 'isBubbleVisible' changes, 'startIdleLoop' changes.
  // BUT the 'runBurst' inside the closure of the *running* timeout might be stale?
  // 'runBurst' calls 'playIdleBurst' calls 'playOneAnimation' ...
  // The recursion 'runBurst' -> 'playIdleBurst' -> 'playNext' -> 'playOneAnimation' -> 'playNext'.
  // We need to be careful about stale closures.

  // Actually, 'activityRef' protects us.
  // If bubble becomes visible, 'handleBubbleVisibilityChange' sets 'activityRef' to 'bubble-interaction'.
  // The running loop checks 'activityRef.current !== "idle-loop"' and aborts.
  // So stale closures are fine as long as they check the Ref!
  // And they do check 'activityRef.current'. Excellent.

  // Watch for external status changes or animation overrides (e.g. from context/Omnibox)
  useEffect(() => {
    // If we are handling a bubble, ignore external 'status' changes unless critical?
    if (isBubbleVisible) return;

    // If animationKey is set explicitly (e.g. "Congratulate"), play it.
    if (
      animationKey &&
      animationKey !== "Default" &&
      ANIMATIONS[animationKey]
    ) {
      clearScheduler();
      activityRef.current = "external-command";

      playOneAnimation(ANIMATIONS[animationKey], () => {
        // Resume loop after external command
        setIdleFrame();
        startIdleLoop();
      });
    }
  }, [
    animationKey,
    isBubbleVisible,
    playOneAnimation,
    clearScheduler,
    setIdleFrame,
    startIdleLoop,
  ]);

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
