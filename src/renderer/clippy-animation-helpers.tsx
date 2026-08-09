import { ANIMATIONS, Animation } from "./clippy-animations";

export const ANIMATION_KEYS = Object.keys(ANIMATIONS);
export const ANIMATION_KEYS_BRACKETS = ANIMATION_KEYS.map((k) => `[${k}]`);
export const IDLE_ANIMATION_KEYS = ANIMATION_KEYS.filter((k) =>
  k.startsWith("Idle"),
);

// Animations suitable for standby behavior: mostly calm idle poses plus a few
// gentle actions, so Clippy stays subtle and doesn't overwhelm with big moves.
export const STANDBY_ANIMATION_KEYS = [
  // Idle animations (calm, subtle)
  "Idle1 1",
  "IdleAtom",
  "IdleEyeBrowRaise",
  "IdleFingerTap",
  "IdleHeadScratch",
  "IdleRopePile",
  "IdleSideToSide",
  // A few gentle actions (not too flashy)
  "Wave",
  "Thinking",
  "LookUp",
];

export const EMPTY_ANIMATION: Animation = {
  src: `data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==`,
  length: 0,
};

/**
 * Get a random animation from the given keys'
 *
 * @param keys - The keys of the animations to choose from
 * @param current - The current animation
 * @returns A random animation from the given keys
 */
export function getRandomAnimation(keys: string[], current?: Animation) {
  const randomIndex = Math.floor(Math.random() * keys.length);
  const randomAnimationKey = keys[randomIndex] as keyof typeof ANIMATIONS;
  const animation = ANIMATIONS[randomAnimationKey];

  // If the random animation is the same as the current animation, get a new random animation
  if (current && animation === current) {
    return getRandomAnimation(keys, current);
  }

  return animation;
}

/**
 * Get a random idle animation
 *
 * @param current - The current animation
 * @returns A random idle animation
 */
export function getRandomIdleAnimation(current?: Animation) {
  return getRandomAnimation(IDLE_ANIMATION_KEYS, current);
}

/**
 * Get a random standby animation key, avoiding recently played ones so the
 * idle behavior feels varied instead of repetitive.
 *
 * @param recentKeys - Keys of recently played animations to avoid
 * @param maxRecent - How many of the most recent animations to avoid (default 3)
 * @returns A random standby animation key
 */
export function getRandomStandbyAnimation(
  recentKeys: string[] = [],
  maxRecent = 3,
): string {
  const avoid = new Set(recentKeys.slice(-maxRecent));
  const available = STANDBY_ANIMATION_KEYS.filter((k) => !avoid.has(k));

  // Fall back to the full pool if everything was recently played
  const pool = available.length > 0 ? available : STANDBY_ANIMATION_KEYS;

  return pool[Math.floor(Math.random() * pool.length)];
}
