import { useEffect, useCallback } from "react";
import { useSharedState } from "../contexts/SharedStateContext";

const DECREMENT_INTERVAL_MS = 15000; // 15 seconds

export function useTamagotchi() {
  const { settings } = useSharedState();

  const happiness = settings.tamagotchiHappiness ?? 80;
  const energy = settings.tamagotchiEnergy ?? 80;
  const focus = settings.tamagotchiFocus ?? 50;
  const hunger = settings.tamagotchiHunger ?? 80;
  const health = settings.tamagotchiHealth ?? 80;
  const enabled = settings.tamagotchiEnabled ?? true;

  const updateState = useCallback(
    async (
      newHappiness: number,
      newEnergy: number,
      newFocus: number,
      newHunger: number,
      newHealth: number
    ) => {
      if (!enabled) return;
      const clampedHappiness = Math.max(0, Math.min(100, newHappiness));
      const clampedEnergy = Math.max(0, Math.min(100, newEnergy));
      const clampedFocus = Math.max(0, Math.min(100, newFocus));
      const clampedHunger = Math.max(0, Math.min(100, newHunger));
      const clampedHealth = Math.max(0, Math.min(100, newHealth));

      await window.clippy.setState("settings.tamagotchiHappiness", clampedHappiness);
      await window.clippy.setState("settings.tamagotchiEnergy", clampedEnergy);
      await window.clippy.setState("settings.tamagotchiFocus", clampedFocus);
      await window.clippy.setState("settings.tamagotchiHunger", clampedHunger);
      await window.clippy.setState("settings.tamagotchiHealth", clampedHealth);
      await window.clippy.setState("settings.tamagotchiLastUpdate", Date.now());
    },
    [enabled],
  );

  // Periodic decrement loop
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      let nextHappiness = happiness;
      let nextEnergy = energy;
      let nextFocus = focus;
      let nextHunger = hunger;
      let nextHealth = health;

      // Decrement Hunger
      nextHunger = Math.max(0, hunger - 1.5);

      // Decrement Focus
      nextFocus = Math.max(0, focus - 0.8);

      // Energy & Happiness logic based on sleep/awake
      if (energy < 20) {
        // Sleeping: Energy recovers, focus drops, happiness drops slowly
        nextEnergy = Math.min(100, energy + 6);
        nextHappiness = Math.max(0, happiness - 0.4);
      } else {
        // Awake: Energy and happiness decay
        nextEnergy = Math.max(0, energy - 1.0);
        nextHappiness = Math.max(0, happiness - 0.8);
      }

      // Health decays if very hungry (< 20) or low energy (< 15)
      if (nextHunger < 20 || nextEnergy < 15) {
        nextHealth = Math.max(0, health - 2.5);
      } else if (nextHunger > 70 && nextHappiness > 70 && nextEnergy > 50) {
        // Heal slowly if well fed and happy
        nextHealth = Math.min(100, health + 1.5);
      } else {
        nextHealth = Math.max(0, health - 0.2);
      }

      updateState(nextHappiness, nextEnergy, nextFocus, nextHunger, nextHealth);
    }, DECREMENT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, happiness, energy, focus, hunger, health, updateState]);

  const feed = useCallback(async () => {
    // Feeding increases hunger/food and a bit of energy/happiness
    await updateState(happiness + 5, energy + 5, focus, hunger + 30, health);
  }, [happiness, energy, focus, hunger, health, updateState]);

  const pet = useCallback(async () => {
    // Petting increases happiness/love
    await updateState(happiness + 15, energy, focus, hunger, health);
  }, [happiness, energy, focus, hunger, health, updateState]);

  const heal = useCallback(async () => {
    // Healing increases health
    await updateState(happiness, energy, focus, hunger, health + 25);
  }, [happiness, energy, focus, hunger, health, updateState]);

  const recordKeyPress = useCallback(async () => {
    // Keypress increases focus but costs a tiny bit of energy
    if (energy >= 20) {
      await updateState(happiness, energy - 0.2, focus + 2, hunger, health);
    }
  }, [happiness, energy, focus, hunger, health, updateState]);

  const wakeUp = useCallback(async () => {
    // Wake up from sleep
    await updateState(happiness + 5, Math.max(25, energy), focus, hunger, health);
  }, [happiness, energy, focus, hunger, health, updateState]);

  const isLowState = hunger < 20 || health < 20 || happiness < 20 || energy < 20;

  return {
    happiness,
    energy,
    focus,
    hunger,
    health,
    enabled,
    feed,
    pet,
    heal,
    recordKeyPress,
    wakeUp,
    isLowState,
  };
}
