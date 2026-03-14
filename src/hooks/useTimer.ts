"use client";

import { useEffect, useState } from "react";

interface TimerResult {
  remaining: number;
  progress: number;
  panic: boolean;
  expired: boolean;
}

export function useTimer(durationMs: number, startTimestamp: number): TimerResult {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const elapsed = now - startTimestamp;
  const remaining = Math.max(0, durationMs - elapsed);
  const progress = Math.min(1, elapsed / durationMs);
  const panic = remaining > 0 && remaining < 5000;
  const expired = remaining <= 0;

  return { remaining, progress, panic, expired };
}
