"use client";

import { useState, useEffect } from "react";
import { usePlayersSubscription } from "@/hooks/usePlayersSubscription";
import { useSessionStore } from "@/stores/sessionStore";
import { useSound } from "@/hooks/useSound";
import { PlayerAvatar } from "./PlayerAvatar";
import { GameHeader } from "./GameHeader";
import { GameFooter } from "./GameFooter";
import { he } from "@/lib/i18n";

interface GameStagingProps {
  pin: string;
}

export function GameStaging({ pin }: GameStagingProps) {
  const { players } = usePlayersSubscription(pin);
  const role = useSessionStore((s) => s.role);
  const isPresenter = role === "presenter";
  const [loading, setLoading] = useState(false);
  const { play, stop } = useSound();

  useEffect(() => {
    play("staging", true);
    return () => stop();
  }, [play, stop]);

  async function handleStart() {
    setLoading(true);
    await fetch("/api/tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
  }

  const showStart = isPresenter || !players.some(() => false); // presenter or no presenter = show start

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        pin={pin}
        actionLabel={showStart ? he.start : undefined}
        actionLoading={loading}
        onAction={handleStart}
      />

      <div className="flex-1 p-6">
        {players.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xl text-text-muted">{he.waitingForPlayers}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex flex-col items-center gap-2 p-4 bg-surface-light rounded-xl"
              >
                <PlayerAvatar joinOrder={player.join_order} size="lg" />
                <span className="font-bold">{player.nickname}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <GameFooter score={0} />
    </div>
  );
}
