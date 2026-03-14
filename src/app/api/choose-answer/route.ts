import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { pin, playerId, answerId } = await req.json();
  const supabase = createServiceClient();
  const upperPin = (pin as string).toUpperCase();

  // Get game
  const { data: game } = await supabase
    .from("games")
    .select("question_index")
    .eq("pin", upperPin)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Insert selection
  const { error: sErr } = await supabase.from("answer_selections").insert({
    game_pin: upperPin,
    question_index: game.question_index,
    player_id: playerId,
    selected_answer_id: answerId,
    score: 0,
  });

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  // Check if all players voted
  const { count: selectionCount } = await supabase
    .from("answer_selections")
    .select("*", { count: "exact", head: true })
    .eq("game_pin", upperPin)
    .eq("question_index", game.question_index);

  const { count: playerCount } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("game_pin", upperPin);

  // Auto-advance if all voted
  if ((selectionCount ?? 0) >= (playerCount ?? 0)) {
    await fetch(new URL("/api/tick", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: upperPin }),
    });
  }

  return NextResponse.json({ ok: true });
}
