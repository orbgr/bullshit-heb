"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PlayerRow } from "@/lib/types";

export function usePlayersSubscription(pin: string) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const refetch = async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("game_pin", pin)
        .order("join_order");
      if (data) setPlayers(data as PlayerRow[]);
    };

    // Initial fetch
    refetch().then(() => setLoading(false));

    // On any change, re-fetch the full list
    const channel = supabase
      .channel(`players:${pin}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_pin=eq.${pin}`,
        },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pin]);

  return { players, loading };
}
