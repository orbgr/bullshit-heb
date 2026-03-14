"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameRow } from "@/lib/types";

export function useGameSubscription(pin: string) {
  const [game, setGame] = useState<GameRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase
      .from("games")
      .select("*")
      .eq("pin", pin)
      .single()
      .then(({ data }) => {
        if (data) setGame(data as GameRow);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`game:${pin}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `pin=eq.${pin}`,
        },
        (payload) => {
          setGame(payload.new as GameRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pin]);

  return { game, loading };
}
