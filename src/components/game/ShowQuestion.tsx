"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GameHeader } from "./GameHeader";
import { GameFooter } from "./GameFooter";
import { useTimer } from "@/hooks/useTimer";
import { useSound } from "@/hooks/useSound";
import { useSessionStore } from "@/stores/sessionStore";
import { formatQuestion } from "@/lib/questions";
import { MAX_ANSWER_LEN } from "@/lib/constants";
import { he } from "@/lib/i18n";

interface ShowQuestionProps {
  pin: string;
  questionText: string;
  questionIndex: number;
  totalQ: number;
  hasPresenter: boolean;
  playerScore: number;
  duration: number;
}

export function ShowQuestion({
  pin,
  questionText,
  questionIndex,
  totalQ,
  hasPresenter,
  playerScore,
  duration,
}: ShowQuestionProps) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tickedRef = useRef(false);
  const role = useSessionStore((s) => s.role);
  const playerId = useSessionStore((s) => s.playerId);
  const isPresenter = role === "presenter";
  const shouldTick = isPresenter || !hasPresenter;
  const { play, stop } = useSound();

  const { secondsLeft, progress, panic, expired } = useTimer(duration, questionIndex);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || submitted) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, playerId, text: answer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "CORRECT_ANSWER") {
          setError(he.correctAnswerError);
          setLoading(false);
          return;
        }
        throw new Error(data.error);
      }
      setSubmitted(true);
    } catch {
      setError(he.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <GameHeader
        pin={pin}
        text={`${questionIndex + 1} ${he.of} ${totalQ}`}
      />
      <ProgressBar progress={progress} panic={panic} />

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Countdown */}
        <span className={`text-6xl font-black ${panic ? "text-danger" : "text-accent"}`}>
          {secondsLeft}
        </span>

        <p className="text-2xl font-bold text-center leading-relaxed">
          {formatQuestion(questionText)}
        </p>

        {!isPresenter && !submitted && (
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            <Input
              type="text"
              value={answer}
              onChange={(e) =>
                setAnswer(e.target.value.slice(0, MAX_ANSWER_LEN))
              }
              maxLength={MAX_ANSWER_LEN}
              autoFocus
              autoComplete="off"
              error={error}
            />
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={!answer.trim()}
            >
              {he.send}
            </Button>
          </form>
        )}

        {submitted && (
          <p className="text-xl text-text-muted">{he.answerSubmitted}</p>
        )}
      </div>

      <GameFooter score={playerScore} />
    </div>
  );
}
