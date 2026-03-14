"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSessionStore } from "@/stores/sessionStore";
import { he } from "@/lib/i18n";

export default function PresentGame() {
  const router = useRouter();
  const setPresenter = useSessionStore((s) => s.setPresenter);

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/validate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || he.somethingWentWrong);

      // Set presenter flag on the game
      const presRes = await fetch("/api/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.toUpperCase(), setPresenter: true }),
      });
      if (!presRes.ok) {
        const presData = await presRes.json();
        throw new Error(presData.error || he.somethingWentWrong);
      }

      setPresenter(pin.toUpperCase());
      router.push(`/game/${pin.toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : he.somethingWentWrong);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-dvh p-6">
      <div className="text-center mt-12 mb-8">
        <h1 className="text-5xl font-black text-primary">{he.gameName}</h1>
        <h2 className="text-xl text-text-muted mt-2">{he.enterPin}</h2>
        <div className="text-accent text-2xl mt-3">&#9830;</div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <Input
          type="text"
          placeholder={he.gamePin}
          value={pin}
          onChange={(e) => setPin(e.target.value.toUpperCase().slice(0, 4))}
          autoFocus
          autoComplete="off"
        />

        {error && (
          <div className="bg-danger/20 text-danger rounded-lg p-3 text-center">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} disabled={!pin}>
          {he.present}
        </Button>
      </form>
    </div>
  );
}
