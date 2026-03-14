import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { MAX_PLAYERS, MAX_NICKNAME_LEN } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { pin, nickname } = await req.json();
  const supabase = createServiceClient();
  const upperPin = (pin as string).toUpperCase();
  const trimmedNick = (nickname as string).trim().slice(0, MAX_NICKNAME_LEN);

  if (!trimmedNick) {
    return NextResponse.json({ error: "כינוי לא תקין" }, { status: 400 });
  }

  // Check game exists
  const { data: game } = await supabase
    .from("games")
    .select("pin")
    .eq("pin", upperPin)
    .single();

  if (!game) {
    return NextResponse.json({ error: "קוד משחק שגוי" }, { status: 404 });
  }

  // Count current players for join_order
  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("game_pin", upperPin);

  const playerCount = count ?? 0;
  if (playerCount >= MAX_PLAYERS) {
    return NextResponse.json({ error: "מצטערים, המשחק מלא" }, { status: 400 });
  }

  // Insert player
  const { data: player, error: pErr } = await supabase
    .from("players")
    .insert({
      game_pin: upperPin,
      nickname: trimmedNick.toLowerCase(),
      score: 0,
      join_order: playerCount,
    })
    .select("id")
    .single();

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  return NextResponse.json({ playerId: player.id });
}
