"use client";

import { useEffect, useRef } from "react";
import { POINTS, DURATIONS } from "@/lib/constants";
import { GameState } from "@/lib/types";
import { useTimer } from "@/hooks/useTimer";
import { useSessionStore } from "@/stores/sessionStore";
import { GameHeader } from "./GameHeader";
import { GameFooter } from "./GameFooter";
import { he } from "@/lib/i18n";

interface RoundIntroProps {
  pin: string;
  roundIndex: number;
  hasPresenter: boolean;
  playerScore: number;
}

export function RoundIntro({ pin, roundIndex, hasPresenter, playerScore }: RoundIntroProps) {
  const role = useSessionStore((s) => s.role);
  const isPresenter = role === "presenter";
  const shouldTick = isPresenter || !hasPresenter;
  const tickedRef = useRef(false);

  const duration = DURATIONS[GameState.RoundIntro]!;
  const { expired } = useTimer(duration, roundIndex);

  useEffect(() => {
    if (expired && shouldTick && !tickedRef.current) {
      tickedRef.current = true;
      fetch("/api/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
    }
  }, [expired, shouldTick, pin]);

  return (
    <div className="flex flex-col h-full">
      <GameHeader pin={pin} text={`${he.round} ${roundIndex + 1}`} />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-center">
          <p className="text-5xl font-black text-truth">
            {POINTS.truth[roundIndex]}
          </p>
          <p className="text-xl text-text-muted mt-2">
            {he.pointsForTruth}
          </p>
        </div>

        <div className="text-center">
          <p className="text-5xl font-black text-primary">
            {POINTS.bullshit[roundIndex]}
          </p>
          <p className="text-xl text-text-muted mt-2">
            {he.pointsForBullshit}
          </p>
        </div>
      </div>

      <GameFooter score={playerScore} />
    </div>
  );
}
