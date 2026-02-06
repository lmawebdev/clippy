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
  // We use both a ref (for stable access in callbacks) and state (for rendering/effects)
  const timeoutRef = useRef<number | undefined>(undefined);
  const lastIdleAnimationRef = useRef<Animation | undefined>(undefined);
  const [isAnimating, setIsAnimating] = useState(false);
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

      // Clear existing timeout using ref to avoid stale closures
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      setAnimation(ANIMATIONS[key]);
      setIsAnimating(true);

      const id = window.setTimeout(() => {
        setAnimation(ANIMATIONS.Default);
        setIsAnimating(false);
        timeoutRef.current = undefined;
      }, ANIMATIONS[key].length + 200);

      timeoutRef.current = id;
    } else {
      log(`Animation not found`, { key });
    }
  }, []);

  // Handle bubble visibility - first play "idea" animation, then LookUp in loop
  const handleBubbleVisibilityChange = useCallback(
    (visible: boolean) => {
      if (visible === isBubbleVisible) return;

      setIsBubbleVisible(visible);

      // Always clear existing timers first
      clearBubbleTimers();

      if (visible) {
        // Clear any existing animation timeout using ref
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = undefined;
          setIsAnimating(false);
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
        setIsAnimating(false);
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = undefined;
        }
      }
    },
    [clearBubbleTimers, isBubbleVisible],
  );

  // Ref to track the idle scheduling timer specifically
  const idleScheduleTimeoutRef = useRef<number | undefined>(undefined);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearBubbleTimers();
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      if (idleScheduleTimeoutRef.current) {
        window.clearTimeout(idleScheduleTimeoutRef.current);
      }
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
    let isMounted = true;

    // Helper to play a sequence of random idle animations
    const playIdleSequence = (count: number) => {
      if (!isMounted) return;

      // Safety check: if for some reason we shouldn't be animating anymore
      if (status !== "idle" || isBubbleVisible) return;

      const randomIdleAnimation = getRandomIdleAnimation(
        lastIdleAnimationRef.current,
      );

      setAnimation(randomIdleAnimation);
      lastIdleAnimationRef.current = randomIdleAnimation;
      // Ensure we are marked as animating
      setIsAnimating(true);

      const id = window.setTimeout(() => {
        if (!isMounted) return;

        if (count > 1) {
          // Play next in burst
          setAnimation(ANIMATIONS.Default);
          const gapId = window.setTimeout(() => {
            playIdleSequence(count - 1);
          }, 100);
          timeoutRef.current = gapId;
        } else {
          // Sequence complete
          setAnimation(ANIMATIONS.Default);
          setIsAnimating(false); // This triggers the effect to schedule the next one
          timeoutRef.current = undefined;
        }
      }, randomIdleAnimation.length);

      timeoutRef.current = id;
    };

    // If status is welcome, immediately go to idle to avoid repeating loop issues
    if (status === "welcome") {
      setStatus("idle");
      return;
    }

    // Schedule next idle if we are idle, not bubble visible, and NOT currently animating
    if (status === "idle" && !isBubbleVisible && !isAnimating) {
      // Clear any existing schedule to be safe
      if (idleScheduleTimeoutRef.current) {
        window.clearTimeout(idleScheduleTimeoutRef.current);
      }

      const delay = 4000 + Math.floor(Math.random() * 1000); // 4-5 seconds
      const id = window.setTimeout(() => {
        if (isMounted) {
          // Start the burst
          const burstCount = Math.floor(Math.random() * 2) + 2; // 2 or 3 animations
          playIdleSequence(burstCount);
        }
      }, delay);

      idleScheduleTimeoutRef.current = id;
    }

    return () => {
      isMounted = false;
      // Cleanup schedule on deps change (e.g. isAnimating becomes true -> cancel schedule)
      if (idleScheduleTimeoutRef.current) {
        window.clearTimeout(idleScheduleTimeoutRef.current);
        idleScheduleTimeoutRef.current = undefined;
      }

      // NOTE: We do NOT clear timeoutRef.current here automatically unless unmounting?
      // Actually, if we leave status='idle', we might want to stop the animation?
      // If we switch to 'bubble visible', we probably want to stop.
      // But standard cleanup runs on every dependency change.
      // If isAnimating changes true->false, we don't want to stop anything (it's already done).
      // If isAnimating changes false->true (started animating), we just cleared the schedule above.

      // If 'status' changes or 'isBubbleVisible' changes, we SHOULD stop any current animation.
      if (status !== "idle" || isBubbleVisible) {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = undefined;
        }
      }
    };
  }, [status, isBubbleVisible, isAnimating, setStatus]);

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
