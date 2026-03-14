import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generatePin } from "@/lib/pin";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const supabase = createServiceClient();
  const upperPin = (pin as string).toUpperCase();

  // Get original game
  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("pin", upperPin)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Get original players
  const { data: players } = await supabase
    .from("players")
    .select("nickname, join_order")
    .eq("game_pin", upperPin)
    .order("join_order");

  // Generate new PIN
  let newPin = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    newPin = generatePin();
    const { data: existing } = await supabase
      .from("games")
      .select("pin")
      .eq("pin", newPin)
      .single();
    if (!existing) break;
  }

  // Pick new random questions
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("lang", "he")
    .limit(300);

  const shuffled = (questions ?? []).sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, game.total_q);

  // Create new game
  await supabase.from("games").insert({
    pin: newPin,
    locale: game.locale,
    state: 0,
    state_ts: Date.now(),
    round_index: 0,
    question_index: 0,
    total_q: game.total_q,
    has_presenter: game.has_presenter,
  });

  // Assign questions
  await supabase.from("game_questions").insert(
    selected.map((q, i) => ({
      game_pin: newPin,
      q_index: i,
      question_id: q.id,
    }))
  );

  // Copy players with reset scores
  if (players && players.length > 0) {
    await supabase.from("players").insert(
      players.map((p) => ({
        game_pin: newPin,
        nickname: p.nickname,
        score: 0,
        join_order: p.join_order,
      }))
    );
  }

  // Set fork_pin on old game to trigger client redirect
  await supabase
    .from("games")
    .update({ fork_pin: newPin })
    .eq("pin", upperPin);

  return NextResponse.json({ pin: newPin });
}
