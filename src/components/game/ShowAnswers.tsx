"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GameHeader } from "./GameHeader";
import { GameFooter } from "./GameFooter";
import { useTimer } from "@/hooks/useTimer";
import { useSound } from "@/hooks/useSound";
import { useSessionStore } from "@/stores/sessionStore";
import { createClient } from "@/lib/supabase/client";
import { formatQuestion } from "@/lib/questions";
import { DURATIONS } from "@/lib/constants";
import { GameState } from "@/lib/types";
import type { AnswerRow } from "@/lib/types";
import { he } from "@/lib/i18n";

interface ShowAnswersProps {
  pin: string;
  questionText: string;
  questionIndex: number;
  totalQ: number;
  hasPresenter: boolean;
  playerScore: number;
}

export function ShowAnswers({
  pin,
  questionText,
  questionIndex,
  totalQ,
  hasPresenter,
  playerScore,
}: ShowAnswersProps) {
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [selected, setSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const tickedRef = useRef(false);
  const role = useSessionStore((s) => s.role);
  const playerId = useSessionStore((s) => s.playerId);
  const isPresenter = role === "presenter";
  const shouldTick = isPresenter || !hasPresenter;
  const { play, stop } = useSound();

  const duration = DURATIONS[GameState.ShowAnswers]!;
  const { secondsLeft, progress, panic, expired } = useTimer(duration);

  useEffect(() => {
    play("during-game");
    return () => stop();
  }, [play, stop]);

  useEffect(() => {
    if (panic) play("time-warning");
  }, [panic, play]);

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

  // Fetch answers
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("answers")
      .select("*")
      .eq("game_pin", pin)
      .eq("question_index", questionIndex)
      .then(({ data }) => {
        if (data) {
          const seen = new Set<string>();
          const filtered: AnswerRow[] = [];
          for (const a of data as AnswerRow[]) {
            const key = a.answer_text.toLowerCase();
            if (seen.has(key)) continue;
            if (!isPresenter && a.player_id === playerId) {
              seen.add(key);
              continue;
            }
            seen.add(key);
            filtered.push(a);
          }
          filtered.sort((a, b) => a.answer_text.localeCompare(b.answer_text));
          setAnswers(filtered);
        }
      });
  }, [pin, questionIndex, playerId, isPresenter]);

  async function handleSelect(answer: AnswerRow) {
    if (selected || loading) return;
    setLoading(true);

    await fetch("/api/choose-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, playerId, answerId: answer.id }),
    });

    setSelected(true);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        pin={pin}
        text={`${questionIndex + 1} ${he.of} ${totalQ}`}
      />
      <ProgressBar progress={progress} panic={panic} />

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Countdown */}
        <div className="text-center mb-4">
          <span className={`text-5xl font-black ${panic ? "text-danger" : "text-accent"}`}>
            {secondsLeft}
          </span>
        </div>

        {isPresenter && (
          <p className="text-xl font-bold text-center mb-6">
            {formatQuestion(questionText)}
          </p>
        )}

        {!selected ? (
          <div className="space-y-3 max-w-lg mx-auto">
            {answers.map((a) => (
              <Button
                key={a.id}
                fullWidth
                variant="primary"
                onClick={() => handleSelect(a)}
                disabled={loading}
              >
                {a.answer_text.toUpperCase()}
              </Button>
            ))}

            {!isPresenter && !showQuestion && (
              <Button
                fullWidth
                variant="ghost"
                onClick={() => setShowQuestion(true)}
              >
                {he.whatWasTheQuestion}
              </Button>
            )}

            {showQuestion && (
              <p className="text-center text-text-muted mt-4">
                {formatQuestion(questionText)}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xl text-text-muted">{he.waitForFriends}</p>
          </div>
        )}
      </div>

      <GameFooter score={playerScore} />
    </div>
  );
}
