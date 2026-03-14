"use client";

import { useRef, useCallback } from "react";
import { Howl } from "howler";
import { useSessionStore } from "@/stores/sessionStore";

const SOUNDS: Record<string, string> = {
  staging: "/sounds/staging.mp3",
  "during-game": "/sounds/during-game.mp3",
  "time-warning": "/sounds/time-warning.mp3",
  "player-lie-0": "/sounds/player-lie-0.mp3",
  "player-lie-1": "/sounds/player-lie-1.mp3",
  "house-lie-0": "/sounds/house-lie-0.mp3",
  "house-lie-1": "/sounds/house-lie-1.mp3",
  "the-truth": "/sounds/the-truth.mp3",
  final: "/sounds/final.mp3",
};

export function useSound() {
  const soundRef = useRef<Howl | null>(null);
  const role = useSessionStore((s) => s.role);

  const play = useCallback(
    (name: string, loop = false) => {
      if (role !== "presenter") return;
      stop();
      const src = SOUNDS[name];
      if (!src) return;
      soundRef.current = new Howl({ src: [src], autoplay: true, loop });
    },
    [role]
  );

  const stop = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.fade(1, 0, 500);
      const s = soundRef.current;
      setTimeout(() => s.stop(), 500);
      soundRef.current = null;
    }
  }, []);

  return { play, stop };
}
