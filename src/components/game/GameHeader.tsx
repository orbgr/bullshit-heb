"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useSessionStore } from "@/stores/sessionStore";
import { he } from "@/lib/i18n";

interface GameHeaderProps {
  pin: string;
  text?: string;
  actionLabel?: string;
  actionLoading?: boolean;
  onAction?: () => void;
}

export function GameHeader({
  pin,
  text,
  actionLabel,
  actionLoading,
  onAction,
}: GameHeaderProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const { role, reset } = useSessionStore();
  const isPresenter = role === "presenter";

  function handleLeave() {
    reset();
    router.push("/");
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-surface-light border-b border-surface-lighter">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="w-10 h-10 rounded-lg bg-surface-lighter hover:bg-primary/30 flex items-center justify-center text-lg transition-colors"
          >
            🏠
          </button>
          <span className="text-sm text-text-muted font-mono">
            PIN: {pin}
          </span>
        </div>

        {text && (
          <span className="text-sm font-bold text-accent uppercase">
            {text}
          </span>
        )}

        {actionLabel && (
          <Button
            onClick={onAction}
            loading={actionLoading}
            className="py-2 px-4 text-base"
          >
            {actionLabel}
          </Button>
        )}

        {isPresenter && !actionLabel && !text && (
          <span className="text-xs text-text-muted">
            {he.joinAt}{" "}
            <span className="text-primary font-bold">bullshit.wtf</span>{" "}
            {he.withPin}{" "}
            <span className="text-accent font-bold font-mono">{pin}</span>
          </span>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={he.leaveConfirmTitle}
        actions={
          <>
            <Button onClick={() => setShowModal(false)}>{he.keepPlaying}</Button>
            <Button variant="ghost" onClick={handleLeave}>
              {he.backHome}
            </Button>
          </>
        }
      >
        {he.leaveConfirmBody}
      </Modal>
    </>
  );
}
