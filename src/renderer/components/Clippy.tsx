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
import { useTamagotchi } from "../helpers/useTamagotchi";
import { useObjectives } from "../helpers/useObjectives";

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

  // Tamagotchi hook integration
  const { happiness, energy, focus, hunger, health, feed, pet, heal, recordKeyPress, wakeUp, isLowState } = useTamagotchi();

  // Objectives hook – handles progress tracking and bubble notifications
  useObjectives();

  // Refs for scheduler management
  const timeoutRef = useRef<number | undefined>(undefined);
  const lastIdleAnimationRef = useRef<Animation | undefined>(undefined);

  // Track if we are currently handling a special activity to prevent overlaps
  // "idle-loop" | "click-reaction" | "bubble-interaction" | "external-command" | "low-state"
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

  // Sleep loop when energy is low
  useEffect(() => {
    if (energy < 20 && !isBubbleVisible) {
      clearScheduler();
      activityRef.current = "sleeping";
      
      const playSleepLoop = () => {
        if (activityRef.current !== "sleeping") return;
        playOneAnimation(ANIMATIONS.IdleSnooze, () => {
          playSleepLoop();
        });
      };
      
      playSleepLoop();
    }
  }, [energy, isBubbleVisible, playOneAnimation, clearScheduler]);

  // Low state animation loop (when any bar is < 20% and not sleeping)
  useEffect(() => {
    if (isLowState && energy >= 20 && !isBubbleVisible) {
      clearScheduler();
      activityRef.current = "low-state";

      const playLowStateLoop = () => {
        if (activityRef.current !== "low-state") return;
        playOneAnimation(ANIMATIONS.Alert, () => {
          if (activityRef.current !== "low-state") return;
          timeoutRef.current = window.setTimeout(playLowStateLoop, 4000);
        });
      };

      playLowStateLoop();
    }
  }, [isLowState, energy, isBubbleVisible, playOneAnimation, clearScheduler]);

  // --- Interaction Handlers ---

  // Mode state for speech bubble
  const [speechBubbleMode, setSpeechBubbleMode] = useState<"tips" | "stats" | "tamagotchi" | "objectives">(
    "tips",
  );

  // Handle "Click" on Clippy
  const handleClick = useCallback(() => {
    // Toggle mode
    const hasObjectives = (settings.objectives ?? []).filter((o) => !o.paused).length > 0;
    setSpeechBubbleMode((prev) => {
      if (prev === "tips") return "stats";
      if (prev === "stats") return "tamagotchi";
      if (prev === "tamagotchi") return hasObjectives ? "objectives" : "tips";
      return "tips";
    });

    if (isBubbleVisible) return; // Don't interrupt bubble animation if visible

    // Interrupt current activity for animation
    clearScheduler();

    // Check if sleeping (energy < 20) and wake him up
    if (energy < 20) {
      activityRef.current = "click-reaction";
      wakeUp();
      playOneAnimation(ANIMATIONS.Alert, () => {
        setIdleFrame();
        const waitTime = 2000;
        timeoutRef.current = window.setTimeout(() => {
          startIdleLoop();
        }, waitTime);
      });
      return;
    }

    pet();
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
    energy,
    wakeUp,
    pet,
    settings.objectives,
  ]);

  // Handle Drag & Drop to feed Clippy
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      clearScheduler();
      activityRef.current = "eating";

      playOneAnimation(ANIMATIONS.Processing, () => {
        feed();
        setIdleFrame();
        timeoutRef.current = window.setTimeout(() => {
          activityRef.current = "idle-loop";
          startIdleLoop();
        }, 2000);
      });
    },
    [clearScheduler, playOneAnimation, feed, setIdleFrame, startIdleLoop]
  );

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
        if (speechBubbleMode === "stats" || speechBubbleMode === "tamagotchi" || speechBubbleMode === "objectives") {
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
    if ((status === "idle" || status === "welcome") && !isBubbleVisible && energy >= 20) {
      startIdleLoop();
    }

    return () => clearScheduler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount to kick off the loop.

  // Watch for external status changes or animation overrides (e.g. from context/Omnibox)
  useEffect(() => {
    // If we are handling a bubble, ignore external 'status' changes unless critical?
    if (isBubbleVisible || energy < 20) return;

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
    energy,
  ]);

  // Handle Global Keyboard Events
  useEffect(() => {
    const handleGlobalKeyDown = () => {
      // Record keypress for Tamagotchi stats
      recordKeyPress();

      // If bubble is visible, don't interrupt?
      if (isBubbleVisible || energy < 20) return;

      clearScheduler();
      activityRef.current = "writing";

      if (ANIMATIONS["Writing"]) {
        setAnimation(ANIMATIONS["Writing"]);
      }

      // Reset the "stop writing" timer
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        // Stop writing
        setIdleFrame();
        activityRef.current = "idle-loop";
        startIdleLoop();
      }, 2000);
    };

    window.clippy.onGlobalKeyDown(handleGlobalKeyDown);

    return () => {
      window.clippy.offGlobalKeyDown();
    };
  }, [isBubbleVisible, clearScheduler, setIdleFrame, startIdleLoop, energy, recordKeyPress]);

  // Handle External App Triggers
  useEffect(() => {
    const handleExternalAppTrigger = (key: string, _appName: string) => {
      // If bubble is visible, don't interrupt
      if (isBubbleVisible || energy < 20) return;

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
    energy,
  ]);

  // --- Mouse Events for Click-Through ---
  useEffect(() => {
    const ignore = !settings.allowMoveClippy;
    window.clippy.setIgnoreMouseEvents(ignore, { forward: true });
  }, [settings.allowMoveClippy]);

  const handleMouseEnter = useCallback(() => {
    window.clippy.setIgnoreMouseEvents(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const ignore = !settings.allowMoveClippy;
    window.clippy.setIgnoreMouseEvents(ignore, { forward: true });
  }, [settings.allowMoveClippy]);

  const isMoveAllowed = settings.allowMoveClippy ?? true;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
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
