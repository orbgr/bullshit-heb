"use client";

import { useSessionStore } from "@/stores/sessionStore";

interface GameFooterProps {
  score: number;
}

export function GameFooter({ score }: GameFooterProps) {
  const nickname = useSessionStore((s) => s.nickname);
  const role = useSessionStore((s) => s.role);

  if (role === "presenter") return null;

  return (
    <div className="flex items-center justify-between p-3 bg-surface-light border-t border-surface-lighter">
      <span className="font-bold uppercase">{nickname}</span>
      <span className="text-accent font-bold">{score}</span>
    </div>
  );
}
