"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayersSubscription } from "@/hooks/usePlayersSubscription";
import { useGameSubscription } from "@/hooks/useGameSubscription";
import { useSessionStore } from "@/stores/sessionStore";
import { useSound } from "@/hooks/useSound";
import { GameHeader } from "./GameHeader";
import { PlayerAvatar } from "./PlayerAvatar";
import { he } from "@/lib/i18n";

interface ScoreBoardFinalProps {
  pin: string;
}

export function ScoreBoardFinal({ pin }: ScoreBoardFinalProps) {
  const { players } = usePlayersSubscription(pin);
  const { game } = useGameSubscription(pin);
  const router = useRouter();
  const role = useSessionStore((s) => s.role);
  const setPresenter = useSessionStore((s) => s.setPresenter);
  const setPlayer = useSessionStore((s) => s.setPlayer);
  const nickname = useSessionStore((s) => s.nickname);
  const [loading, setLoading] = useState(false);
  const { play, stop } = useSound();

  useEffect(() => {
    play("final", true);
    return () => stop();
  }, [play, stop]);

  // Watch for fork (replay redirect)
  useEffect(() => {
    if (game?.fork_pin) {
      const newPin = game.fork_pin;
      if (role === "presenter") {
        setPresenter(newPin);
      } else if (nickname) {
        // Find self in new game's players (will have same nickname)
        setPlayer(nickname, "", newPin); // playerId will be new, but we need to re-join
      }
      router.push(`/game/${newPin}`);
    }
  }, [game?.fork_pin, role, nickname, router, setPresenter, setPlayer]);

  async function handleReplay() {
    setLoading(true);
    await fetch("/api/fork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
  }

  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        pin={pin}
        actionLabel={he.replay}
        actionLoading={loading}
        onAction={handleReplay}
      />

      <div className="flex-1 p-6">
        <div className="max-w-md mx-auto space-y-3">
          {sorted.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 rounded-xl p-4 ${
                i === 0 ? "bg-accent/20 border-2 border-accent" : "bg-surface-light"
              }`}
            >
              <span className="text-2xl font-black text-text-muted w-8">
                {i === 0 ? "👑" : i + 1}
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
    </div>
  );
}
