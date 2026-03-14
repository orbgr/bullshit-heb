"use client";

import { useEffect, useState, useRef } from "react";

interface TimerResult {
  remaining: number;
  secondsLeft: number;
  progress: number;
  panic: boolean;
  expired: boolean;
}

/**
 * Self-contained countdown timer. Starts from mount time, not server timestamp.
 * Returns secondsLeft for display.
 */
export function useTimer(durationMs: number, resetKey: string | number = 0): TimerResult {
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startRef.current = Date.now();
    setElapsed(0);

    const interval = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 250);

    return () => clearInterval(interval);
  }, [durationMs, resetKey]);

  const remaining = Math.max(0, durationMs - elapsed);
  const secondsLeft = Math.ceil(remaining / 1000);
  const progress = Math.min(1, elapsed / durationMs);
  const panic = remaining > 0 && remaining < 3000;
  const expired = remaining <= 0;

  return { remaining, secondsLeft, progress, panic, expired };
}
