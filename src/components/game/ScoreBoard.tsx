"use client";

import { useEffect } from "react";
import { usePlayersSubscription } from "@/hooks/usePlayersSubscription";
import { useSessionStore } from "@/stores/sessionStore";
import { useTimer } from "@/hooks/useTimer";
import { GameHeader } from "./GameHeader";
import { GameFooter } from "./GameFooter";
import { PlayerAvatar } from "./PlayerAvatar";
import { DURATIONS } from "@/lib/constants";
import { GameState } from "@/lib/types";

interface ScoreBoardProps {
  pin: string;
  stateTs: number;
  hasPresenter: boolean;
  playerScore: number;
}

export function ScoreBoard({ pin, stateTs, hasPresenter, playerScore }: ScoreBoardProps) {
  const { players } = usePlayersSubscription(pin);
  const role = useSessionStore((s) => s.role);
  const isPresenter = role === "presenter";
  const shouldTick = isPresenter || !hasPresenter;
  const duration = DURATIONS[GameState.ScoreBoard]!;
  const { expired } = useTimer(duration, stateTs);

  useEffect(() => {
    if (expired && shouldTick) {
      fetch("/api/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
    }
  }, [expired, shouldTick, pin]);

  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full">
      <GameHeader pin={pin} />

      <div className="flex-1 p-6">
        <div className="max-w-md mx-auto space-y-3">
          {sorted.map((player, i) => (
            <div
              key={player.id}
              className="flex items-center gap-4 bg-surface-light rounded-xl p-4"
            >
              <span className="text-2xl font-black text-text-muted w-8">
                {i + 1}
              </span>
              <PlayerAvatar joinOrder={player.join_order} />
              <span className="flex-1 font-bold">{player.nickname}</span>
              <span className="text-accent font-bold text-lg">
                {player.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      <GameFooter score={playerScore} />
    </div>
  );
}
