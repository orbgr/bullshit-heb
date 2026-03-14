"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSessionStore } from "@/stores/sessionStore";
import { he } from "@/lib/i18n";
import { MAX_NICKNAME_LEN } from "@/lib/constants";

export default function JoinGamePage() {
  return (
    <Suspense>
      <JoinGame />
    </Suspense>
  );
}

function JoinGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setPlayer = useSessionStore((s) => s.setPlayer);

  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState<"pin" | "nickname">("pin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const paramPin = searchParams.get("pin");
    if (paramPin) {
      setPin(paramPin.toUpperCase());
      setStep("nickname");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (step === "pin") {
      try {
        const res = await fetch("/api/validate-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pin.toUpperCase() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || he.somethingWentWrong);
        setStep("nickname");
      } catch (err) {
        setError(err instanceof Error ? err.message : he.somethingWentWrong);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const res = await fetch("/api/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: pin.toUpperCase(),
            nickname: nickname.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || he.somethingWentWrong);
        setPlayer(nickname.trim().toLowerCase(), data.playerId, pin.toUpperCase());
        router.push(`/game/${pin.toUpperCase()}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : he.somethingWentWrong);
        setLoading(false);
      }
    }
  }

  return (
    <div className="flex flex-col items-center min-h-dvh p-6">
      <div className="text-center mt-12 mb-8">
        <h1 className="text-5xl font-black text-primary">{he.gameName}</h1>
        <h2 className="text-xl text-text-muted mt-2">
          {step === "pin" ? he.enterPin : he.enterNickname}
        </h2>
        <div className="text-accent text-2xl mt-3">&#9830;</div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {step === "pin" ? (
          <Input
            type="text"
            placeholder={he.gamePin}
            value={pin}
            onChange={(e) => setPin(e.target.value.toUpperCase().slice(0, 4))}
            autoFocus
            autoComplete="off"
          />
        ) : (
          <Input
            type="text"
            placeholder={he.nickname}
            value={nickname}
            onChange={(e) =>
              setNickname(e.target.value.slice(0, MAX_NICKNAME_LEN))
            }
            maxLength={MAX_NICKNAME_LEN}
            autoFocus
            autoComplete="off"
          />
        )}

        {error && (
          <div className="bg-danger/20 text-danger rounded-lg p-3 text-center">
            {error}
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={step === "pin" ? !pin : !nickname.trim()}
        >
          {step === "pin" ? he.next : he.join}
        </Button>
      </form>
    </div>
  );
}
