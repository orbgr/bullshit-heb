"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
  role: "player" | "presenter" | null;
  nickname: string | null;
  playerId: string | null;
  currentPin: string | null;
  setPlayer: (nickname: string, playerId: string, pin: string) => void;
  setPresenter: (pin: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      role: null,
      nickname: null,
      playerId: null,
      currentPin: null,
      setPlayer: (nickname, playerId, pin) =>
        set({ role: "player", nickname, playerId, currentPin: pin }),
      setPresenter: (pin) =>
        set({
          role: "presenter",
          nickname: null,
          playerId: null,
          currentPin: pin,
        }),
      reset: () =>
        set({
          role: null,
          nickname: null,
          playerId: null,
          currentPin: null,
        }),
    }),
    { name: "bs-session" }
  )
);
