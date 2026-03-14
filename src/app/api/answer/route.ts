import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { GameState } from "@/lib/types";
import { MAX_ANSWER_LEN } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { pin, playerId, text } = await req.json();
  const supabase = createServiceClient();
  const upperPin = (pin as string).toUpperCase();
  const trimmedText = (text as string).trim().slice(0, MAX_ANSWER_LEN);

  if (!trimmedText) {
    return NextResponse.json({ error: "Empty answer" }, { status: 400 });
  }

  // Get current game
  const { data: game } = await supabase
    .from("games")
    .select("question_index")
    .eq("pin", upperPin)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Get the real answer for this question
  const { data: gq } = await supabase
    .from("game_questions")
    .select("question_id")
    .eq("game_pin", upperPin)
    .eq("q_index", game.question_index)
    .single();

  const { data: question } = await supabase
    .from("questions")
    .select("real_answer")
    .eq("id", gq!.question_id)
    .single();

  // Reject if matches real answer
  if (
    question!.real_answer.toLowerCase() === trimmedText.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "CORRECT_ANSWER", message: "הכנסת את התשובה הנכונה! נסה משהו אחר" },
      { status: 400 }
    );
  }

  // Insert the answer
  const { error: aErr } = await supabase.from("answers").insert({
    game_pin: upperPin,
    question_index: game.question_index,
    player_id: playerId,
    answer_text: trimmedText.toLowerCase(),
    is_house_lie: false,
    is_real_answer: false,
    score: 0,
  });

  if (aErr) {
    return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  // Check if all players answered
  const { count: answerCount } = await supabase
    .from("answers")
    .select("*", { count: "exact", head: true })
    .eq("game_pin", upperPin)
    .eq("question_index", game.question_index)
    .eq("is_house_lie", false)
    .eq("is_real_answer", false);

  const { count: playerCount } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("game_pin", upperPin);

  // Auto-advance if all answered
  if ((answerCount ?? 0) >= (playerCount ?? 0)) {
    await fetch(new URL("/api/tick", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: upperPin }),
    });
  }

  return NextResponse.json({ ok: true });
}
