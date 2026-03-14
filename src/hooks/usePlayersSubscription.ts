"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PlayerRow } from "@/lib/types";

export function usePlayersSubscription(pin: string) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase
      .from("players")
      .select("*")
      .eq("game_pin", pin)
      .order("join_order")
      .then(({ data }) => {
        if (data) setPlayers(data as PlayerRow[]);
        setLoading(false);
      });

    // Realtime: new players joining + score updates
    const channel = supabase
      .channel(`players:${pin}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `game_pin=eq.${pin}`,
        },
        (payload) => {
          setPlayers((prev) =>
            [...prev, payload.new as PlayerRow].sort(
              (a, b) => a.join_order - b.join_order
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `game_pin=eq.${pin}`,
        },
        (payload) => {
          setPlayers((prev) =>
            prev
              .map((p) =>
                p.id === (payload.new as PlayerRow).id
                  ? (payload.new as PlayerRow)
                  : p
              )
              .sort((a, b) => a.join_order - b.join_order)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pin]);

  return { players, loading };
}
