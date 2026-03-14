import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generatePin } from "@/lib/pin";

export async function POST(req: NextRequest) {
  const { totalQ } = await req.json();
  const supabase = createServiceClient();

  if (![5, 7, 9].includes(totalQ)) {
    return NextResponse.json({ error: "Invalid question count" }, { status: 400 });
  }

  // Generate unique PIN (retry on collision)
  let pin = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    pin = generatePin();
    const { data: existing } = await supabase
      .from("games")
      .select("pin")
      .eq("pin", pin)
      .single();
    if (!existing) break;
  }

  // Pick random questions
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id")
    .eq("lang", "he")
    .limit(300);

  if (qErr || !questions || questions.length < totalQ) {
    return NextResponse.json(
      { error: "Not enough questions available" },
      { status: 500 }
    );
  }

  // Shuffle and pick
  const shuffled = questions.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, totalQ);

  // Create game
  const { error: gameErr } = await supabase.from("games").insert({
    pin,
    locale: "he",
    state: 0,
    state_ts: Date.now(),
    round_index: 0,
    question_index: 0,
    total_q: totalQ,
    has_presenter: false,
  });

  if (gameErr) {
    return NextResponse.json({ error: gameErr.message }, { status: 500 });
  }

  // Assign questions
  const gameQuestions = selected.map((q, i) => ({
    game_pin: pin,
    q_index: i,
    question_id: q.id,
  }));
  const { error: gqErr } = await supabase
    .from("game_questions")
    .insert(gameQuestions);

  if (gqErr) {
    return NextResponse.json({ error: gqErr.message }, { status: 500 });
  }

  return NextResponse.json({ pin });
}
