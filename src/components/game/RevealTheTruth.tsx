"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { GameHeader } from "./GameHeader";
import { GameFooter } from "./GameFooter";
import { PlayerAvatar } from "./PlayerAvatar";
import { useSessionStore } from "@/stores/sessionStore";
import { useSound } from "@/hooks/useSound";
import { usePlayersSubscription } from "@/hooks/usePlayersSubscription";
import { REVEAL_INTERVAL_MS, REVEAL_SHOW_CREATORS_DELAY_MS } from "@/lib/constants";
import type { RevealAnswerRow } from "@/lib/types";
import { he } from "@/lib/i18n";

interface RevealTheTruthProps {
  pin: string;
  questionIndex: number;
  totalQ: number;
  hasPresenter: boolean;
  playerScore: number;
}

export function RevealTheTruth({
  pin,
  questionIndex,
  totalQ,
  hasPresenter,
  playerScore,
}: RevealTheTruthProps) {
  const [items, setItems] = useState<RevealAnswerRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCreators, setShowCreators] = useState(false);
  const { players } = usePlayersSubscription(pin);
  const role = useSessionStore((s) => s.role);
  const isPresenter = role === "presenter";
  const shouldTick = isPresenter || !hasPresenter;
  const tickedRef = useRef(false);
  const { play, stop } = useSound();

  // Fetch reveal answers
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("reveal_answers")
      .select("*")
      .eq("game_pin", pin)
      .eq("question_index", questionIndex)
      .order("display_order")
      .then(({ data }) => {
        if (data) setItems(data as RevealAnswerRow[]);
      });
  }, [pin, questionIndex]);

  // Auto-advance through reveals
  useEffect(() => {
    if (items.length === 0) return;

    // Show creators after delay
    const creatorTimer = setTimeout(() => {
      setShowCreators(true);
      // Play sound
      const item = items[currentIndex];
      if (item) {
        if (item.is_real_answer) play("the-truth");
        else if (item.is_house_lie) play(`house-lie-${Math.round(Math.random())}`);
        else play(`player-lie-${Math.round(Math.random())}`);
      }
    }, REVEAL_SHOW_CREATORS_DELAY_MS);

    // Advance to next or tick
    const advanceTimer = setTimeout(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex((i) => i + 1);
        setShowCreators(false);
      } else if (shouldTick && !tickedRef.current) {
        tickedRef.current = true;
        fetch("/api/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
      }
    }, REVEAL_INTERVAL_MS);

    return () => {
      clearTimeout(creatorTimer);
      clearTimeout(advanceTimer);
    };
  }, [items, currentIndex, isPresenter, pin, play]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const item = items[currentIndex];
  if (!item) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function getPlayerNickname(id: string) {
    return players.find((p) => p.id === id)?.nickname ?? "?";
  }

  function getPlayerOrder(id: string) {
    return players.find((p) => p.id === id)?.join_order ?? 0;
  }

  const formatPoints = (pts: number) => (pts > 0 ? `+${pts}` : `${pts}`);

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        pin={pin}
        text={`${questionIndex + 1} ${he.of} ${totalQ}`}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Creators / Labels (above answer) */}
        {showCreators && (
          <div className="flex flex-col items-center gap-2">
            {item.is_real_answer && (
              <span className="text-2xl font-black text-truth">
                {he.theTruth}
              </span>
            )}
            {item.is_house_lie && (
              <span className="text-xl font-bold text-text-muted">
                {he.homeGrownBullshit}
              </span>
            )}
            {!item.is_real_answer && !item.is_house_lie && (
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {item.creator_ids.map((id) => (
                  <div key={id} className="flex flex-col items-center gap-1">
                    <PlayerAvatar joinOrder={getPlayerOrder(id)} size="sm" />
                    <span className="text-xs">{getPlayerNickname(id)}</span>
                  </div>
                ))}
              </div>
            )}
            {!item.is_real_answer &&
              !item.is_house_lie &&
              item.points !== 0 && (
                <span className="text-lg font-bold text-primary">
                  {formatPoints(item.points)}
                </span>
              )}
          </div>
        )}

        {/* Answer text */}
        <div className="bg-truth text-surface font-black text-xl py-4 px-8 rounded-xl text-center max-w-md w-full">
          {item.answer_text.toUpperCase()}
        </div>

        {/* Selectors (below answer) */}
        {showCreators && item.selector_ids.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {item.selector_ids.map((id) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <PlayerAvatar joinOrder={getPlayerOrder(id)} size="sm" />
                <span className="text-xs">{getPlayerNickname(id)}</span>
              </div>
            ))}
            {showCreators &&
              (item.is_real_answer || item.is_house_lie) &&
              item.points !== 0 && (
                <span
                  className={`text-lg font-bold ${
                    item.is_house_lie ? "text-danger" : "text-truth"
                  }`}
                >
                  {formatPoints(item.points)}
                </span>
              )}
          </div>
        )}
      </div>

      <GameFooter score={playerScore} />
    </div>
  );
}
