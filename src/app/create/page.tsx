"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { he } from "@/lib/i18n";

export default function CreateGame() {
  const router = useRouter();
  const [totalQ, setTotalQ] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/create-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalQ }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || he.somethingWentWrong);
      router.push(`/join?pin=${data.pin}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : he.somethingWentWrong);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-dvh p-6">
      <div className="text-center mt-12 mb-8">
        <h1 className="text-5xl font-black text-primary">{he.gameName}</h1>
        <h2 className="text-xl text-text-muted mt-2">{he.createNewGame}</h2>
        <div className="text-accent text-2xl mt-3">&#9830;</div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div>
          <label className="block text-lg font-bold mb-3">
            {he.questionCount}
          </label>
          <div className="flex gap-3">
            {[5, 7, 9].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTotalQ(n)}
                className={`flex-1 py-3 rounded-lg text-lg font-bold transition-colors ${
                  totalQ === n
                    ? "bg-primary text-white"
                    : "bg-surface-light text-text-muted hover:bg-surface-lighter"
                }`}
              >
                {n} {he.questions}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-danger/20 text-danger rounded-lg p-3 text-center">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading}>
          {he.create}
        </Button>
      </form>
    </div>
  );
}
