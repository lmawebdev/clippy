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
import { useSharedState } from "../contexts/SharedStateContext";
import { SpeechBubble } from "./SpeechBubble";

const LOOK_UP_ANIMATION = "LookUp";
const IDEA_ANIMATION = "GetAttention";

// Helper to filter out system animations
const VALID_RANDOM_KEYS = ANIMATION_KEYS.filter(
  (key) => key !== "Default" && key !== "Show" && key !== "Hide",
);

export function Clippy() {
  const { animationKey, status } = useChat();
  const { settings } = useSharedState();
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

  // Mode state for speech bubble
  const [speechBubbleMode, setSpeechBubbleMode] = useState<"tips" | "stats">(
    "tips",
  );

  // Handle "Click" on Clippy
  const handleClick = useCallback(() => {
    // Toggle mode
    setSpeechBubbleMode((prev) => (prev === "tips" ? "stats" : "tips"));

    if (isBubbleVisible) return; // Don't interrupt bubble animation if visible

    // Interrupt current activity for animation
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

        // If we were in stats mode, reset to tips so next click opens stats again
        if (speechBubbleMode === "stats") {
          setSpeechBubbleMode("tips");
        }

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
    [
      clearScheduler,
      playOneAnimation,
      setIdleFrame,
      startIdleLoop,
      speechBubbleMode,
    ],
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
        // "cuando acaba la animación, que entre en idle por 2-3 segundos y vuelva a su estado inicial"
        // Show idle frame
        setIdleFrame();

        // Wait 2-3 seconds
        const waitTime = 2000 + Math.floor(Math.random() * 1000);

        timeoutRef.current = window.setTimeout(() => {
          // Resume loop (initial state)
          startIdleLoop();
        }, waitTime);
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

  // Handle Global Keyboard Events
  useEffect(() => {
    const handleGlobalKeyDown = () => {
      // If bubble is visible, don't interrupt?
      // User didn't specify, but usually bubble interaction is higher priority (user reading tips).
      // If we interrupt with writing, it might be annoying.
      if (isBubbleVisible) return;

      // If we are already handling a click reaction, maybe wait?
      // But typing usually implies active user intent.
      // Let's override everything except bubble.

      clearScheduler();
      activityRef.current = "writing";

      // Set animation to Writing immediately
      // Note: Writing animation loop? We should check if it loops.
      // Usually "Writing" is a looping animation or long enough.
      // If it's short, it might freeze at end frame?
      // We'll reset it or trust it loops.
      // For now, set it.
      if (ANIMATIONS["Writing"]) {
        setAnimation(ANIMATIONS["Writing"]);
      }

      // Reset the "stop writing" timer
      // "si en 2 segundos no detecta tecleo, que vuelva a su estado inicial"
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        // Stop writing
        setIdleFrame(); // "estado inicial" usually means default/idle
        activityRef.current = "idle-loop";
        startIdleLoop();
      }, 2000);
    };

    window.clippy.onGlobalKeyDown(handleGlobalKeyDown);

    return () => {
      window.clippy.offGlobalKeyDown();
    };
  }, [isBubbleVisible, clearScheduler, setIdleFrame, startIdleLoop]);

  // Handle External App Triggers
  useEffect(() => {
    const handleExternalAppTrigger = (key: string, _appName: string) => {
      // If bubble is visible, don't interrupt
      if (isBubbleVisible) return;

      // Check if animation exists
      if (!ANIMATIONS[key]) return;

      clearScheduler();
      activityRef.current = "external-app-trigger";

      playOneAnimation(ANIMATIONS[key], () => {
        // "luego que vuelva a su estado normal"
        setIdleFrame();

        // Wait a bit before resuming idle loop
        const waitTime = 2000 + Math.floor(Math.random() * 1000);

        timeoutRef.current = window.setTimeout(() => {
          activityRef.current = "idle-loop";
          startIdleLoop();
        }, waitTime);
      });
    };

    window.clippy.onExternalAppTrigger(handleExternalAppTrigger);
    return () => {
      window.clippy.offExternalAppTrigger();
    };
  }, [
    isBubbleVisible,
    clearScheduler,
    playOneAnimation,
    setIdleFrame,
    startIdleLoop,
  ]);

  // --- Mouse Events for Click-Through ---
  useEffect(() => {
    // If dragging is enabled (allowMoveClippy=true), we want to CAPTURE events by default (ignore=false).
    // If dragging is disabled (allowMoveClippy=false), we want to IGNORE events by default (click-through=true).
    const ignore = !settings.allowMoveClippy;
    window.clippy.setIgnoreMouseEvents(ignore, { forward: true });
  }, [settings.allowMoveClippy]);

  const handleMouseEnter = useCallback(() => {
    // When mouse enters Clippy or Drag Area, we always want to interact with Clippy
    // (for animations, right click, etc).
    // BUT if dragging is disabled, the 'app-drag' div won't be rendered (see below),
    // so this only fires for the Image or Bubble.
    window.clippy.setIgnoreMouseEvents(false);
  }, []);

  // When mouse leaves, revert to default state based on settings
  const handleMouseLeave = useCallback(() => {
    // If dragging is disabled, revert to click-through (ignore=true).
    // If dragging is enabled, revert to capture (ignore=false).
    const ignore = !settings.allowMoveClippy;
    window.clippy.setIgnoreMouseEvents(ignore, { forward: true });
  }, [settings.allowMoveClippy]);

  // Only show drag handle if moving is allowed
  // Ensure default is true if undefined to match main process logic
  const isMoveAllowed = settings.allowMoveClippy ?? true;

  return (
    <div>
      <SpeechBubble
        onVisibilityChange={handleBubbleVisibilityChange}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        mode={speechBubbleMode}
      />
      {isMoveAllowed && (
        <div
          className="app-drag"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
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
      )}
      <img
        className="app-no-select"
        src={animation.src}
        draggable={false}
        alt="Clippy"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: "pointer" }}
      />
    </div>
  );
}
