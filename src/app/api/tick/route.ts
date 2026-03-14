import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { GameState } from "@/lib/types";
import { calculateScores } from "@/lib/scoring";
import { generateRevealAnswers } from "@/lib/reveal";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pin = (body.pin as string).toUpperCase();
  const supabase = createServiceClient();

  // Handle setPresenter flag
  if (body.setPresenter) {
    await supabase.from("games").update({ has_presenter: true }).eq("pin", pin);
    return NextResponse.json({ ok: true });
  }

  // Read current game
  const { data: game, error: gErr } = await supabase
    .from("games")
    .select("*")
    .eq("pin", pin)
    .single();

  if (gErr || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const now = Date.now();

  switch (game.state) {
    case GameState.GameStaging: {
      await supabase
        .from("games")
        .update({ state: GameState.RoundIntro, state_ts: now })
        .eq("pin", pin);
      break;
    }

    case GameState.RoundIntro: {
      // Get the current question
      const { data: gq } = await supabase
        .from("game_questions")
        .select("question_id")
        .eq("game_pin", pin)
        .eq("q_index", game.question_index)
        .single();

      const { data: question } = await supabase
        .from("questions")
        .select("question_text")
        .eq("id", gq!.question_id)
        .single();

      // Clean up old answers/selections/reveals for this question
      await supabase
        .from("answers")
        .delete()
        .eq("game_pin", pin)
        .eq("question_index", game.question_index);
      await supabase
        .from("answer_selections")
        .delete()
        .eq("game_pin", pin)
        .eq("question_index", game.question_index);
      await supabase
        .from("reveal_answers")
        .delete()
        .eq("game_pin", pin)
        .eq("question_index", game.question_index);

      await supabase
        .from("games")
        .update({
          state: GameState.ShowQuestion,
          state_ts: now,
          current_q: question!.question_text,
        })
        .eq("pin", pin);
      break;
    }

    case GameState.ShowQuestion: {
      // Add house lies + real answer
      const { data: gq } = await supabase
        .from("game_questions")
        .select("question_id")
        .eq("game_pin", pin)
        .eq("q_index", game.question_index)
        .single();

      const { data: question } = await supabase
        .from("questions")
        .select("real_answer, fake_answers")
        .eq("id", gq!.question_id)
        .single();

      // Get player answers
      const { data: playerAnswers } = await supabase
        .from("answers")
        .select("answer_text")
        .eq("game_pin", pin)
        .eq("question_index", game.question_index);

      const { count: playerCount } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("game_pin", pin);

      // Count unique player answers
      const uniquePlayerTexts = new Set(
        (playerAnswers ?? []).map((a) => a.answer_text.toLowerCase())
      );
      // Ensure at least 3 non-real answers total (player answers + house lies)
      // so there are always at least 4 answer buttons (3 fake + 1 real)
      const MIN_FAKE_ANSWERS = 3;
      const totalFakeAnswers = uniquePlayerTexts.size;
      const houseLiesNeeded = Math.max(
        MIN_FAKE_ANSWERS - totalFakeAnswers,
        (playerCount ?? 0) - uniquePlayerTexts.size
      );
      const houseLies = (question!.fake_answers as string[]).slice(
        0,
        Math.max(0, houseLiesNeeded)
      );

      // Insert house lies
      if (houseLies.length > 0) {
        await supabase.from("answers").insert(
          houseLies.map((text) => ({
            game_pin: pin,
            question_index: game.question_index,
            player_id: null,
            answer_text: text,
            is_house_lie: true,
            is_real_answer: false,
            score: 0,
          }))
        );
      }

      // Insert real answer
      await supabase.from("answers").insert({
        game_pin: pin,
        question_index: game.question_index,
        player_id: null,
        answer_text: question!.real_answer,
        is_house_lie: false,
        is_real_answer: true,
        score: 0,
      });

      await supabase
        .from("games")
        .update({ state: GameState.ShowAnswers, state_ts: now })
        .eq("pin", pin);
      break;
    }

    case GameState.ShowAnswers: {
      // Calculate scores
      const { data: answers } = await supabase
        .from("answers")
        .select("*")
        .eq("game_pin", pin)
        .eq("question_index", game.question_index);

      const { data: selectionsRaw } = await supabase
        .from("answer_selections")
        .select("*")
        .eq("game_pin", pin)
        .eq("question_index", game.question_index);

      const answersArr = answers ?? [];
      const answerMap = new Map(answersArr.map((a) => [a.id, a]));

      const scoringAnswers = answersArr.map((a) => ({
        id: a.id,
        playerId: a.player_id,
        text: a.answer_text,
        isHouseLie: a.is_house_lie,
        isRealAnswer: a.is_real_answer,
      }));

      const scoringSelections = (selectionsRaw ?? []).map((s) => ({
        playerId: s.player_id,
        answerId: s.selected_answer_id,
        answerText: answerMap.get(s.selected_answer_id)?.answer_text ?? "",
      }));

      const { answerScores, selectionScores } = calculateScores(
        scoringAnswers,
        scoringSelections,
        game.round_index
      );

      // Update answer scores
      for (const [answerId, score] of answerScores) {
        await supabase
          .from("answers")
          .update({ score })
          .eq("id", answerId);
      }

      // Update selection scores
      for (const [playerId, score] of selectionScores) {
        await supabase
          .from("answer_selections")
          .update({ score })
          .eq("game_pin", pin)
          .eq("question_index", game.question_index)
          .eq("player_id", playerId);
      }

      // Generate reveal answers
      const updatedAnswers = answersArr.map((a) => ({
        answerId: a.id,
        text: a.answer_text,
        isRealAnswer: a.is_real_answer,
        isHouseLie: a.is_house_lie,
        playerId: a.player_id,
        answerScore: answerScores.get(a.id) ?? 0,
      }));

      const updatedSelections = (selectionsRaw ?? []).map((s) => ({
        playerId: s.player_id,
        answerText: answerMap.get(s.selected_answer_id)?.answer_text ?? "",
        selectionScore: selectionScores.get(s.player_id) ?? 0,
      }));

      const revealItems = generateRevealAnswers(
        updatedAnswers,
        updatedSelections
      );

      // Clean existing reveals (idempotent if tick fires twice)
      await supabase
        .from("reveal_answers")
        .delete()
        .eq("game_pin", pin)
        .eq("question_index", game.question_index);

      // Insert reveal answers
      if (revealItems.length > 0) {
        await supabase.from("reveal_answers").insert(
          revealItems.map((item) => ({
            game_pin: pin,
            question_index: game.question_index,
            answer_text: item.answerText,
            is_real_answer: item.isRealAnswer,
            is_house_lie: item.isHouseLie,
            creator_ids: item.creatorIds,
            selector_ids: item.selectorIds,
            points: item.points,
            display_order: item.displayOrder,
          }))
        );
      }

      await supabase
        .from("games")
        .update({ state: GameState.RevealTheTruth, state_ts: now })
        .eq("pin", pin);
      break;
    }

    case GameState.RevealTheTruth: {
      // Update player cumulative scores
      const { data: answers } = await supabase
        .from("answers")
        .select("player_id, score")
        .eq("game_pin", pin)
        .eq("question_index", game.question_index)
        .not("player_id", "is", null);

      const { data: selections } = await supabase
        .from("answer_selections")
        .select("player_id, score")
        .eq("game_pin", pin)
        .eq("question_index", game.question_index);

      // Aggregate by player
      const playerScoreDeltas = new Map<string, number>();
      for (const a of answers ?? []) {
        if (a.player_id) {
          playerScoreDeltas.set(
            a.player_id,
            (playerScoreDeltas.get(a.player_id) ?? 0) + a.score
          );
        }
      }
      for (const s of selections ?? []) {
        playerScoreDeltas.set(
          s.player_id,
          (playerScoreDeltas.get(s.player_id) ?? 0) + s.score
        );
      }

      // Update each player's cumulative score
      const { data: players } = await supabase
        .from("players")
        .select("id, score")
        .eq("game_pin", pin);

      for (const player of players ?? []) {
        const delta = playerScoreDeltas.get(player.id) ?? 0;
        if (delta !== 0) {
          await supabase
            .from("players")
            .update({ score: player.score + delta })
            .eq("id", player.id);
        }
      }

      await supabase
        .from("games")
        .update({ state: GameState.ScoreBoard, state_ts: now })
        .eq("pin", pin);
      break;
    }

    case GameState.ScoreBoard: {
      const qIdx = game.question_index;
      const totalQ = game.total_q;
      const gameOver = qIdx === totalQ - 1;
      const secondRound = qIdx === Math.floor(totalQ / 2) - 1;
      const lastRound = qIdx === totalQ - 2;

      if (gameOver) {
        await supabase
          .from("games")
          .update({
            state: GameState.ScoreBoardFinal,
            state_ts: now,
          })
          .eq("pin", pin);
      } else if (secondRound || lastRound) {
        // New round — show RoundIntro with bumped round_index
        await supabase
          .from("games")
          .update({
            state: GameState.RoundIntro,
            state_ts: now,
            round_index: game.round_index + 1,
            question_index: qIdx + 1,
          })
          .eq("pin", pin);
      } else {
        // Next question in same round
        const nextQIdx = qIdx + 1;
        const { data: gq } = await supabase
          .from("game_questions")
          .select("question_id")
          .eq("game_pin", pin)
          .eq("q_index", nextQIdx)
          .single();

        const { data: question } = await supabase
          .from("questions")
          .select("question_text")
          .eq("id", gq!.question_id)
          .single();

        // Clean up for next question
        await supabase
          .from("answers")
          .delete()
          .eq("game_pin", pin)
          .eq("question_index", nextQIdx);
        await supabase
          .from("answer_selections")
          .delete()
          .eq("game_pin", pin)
          .eq("question_index", nextQIdx);

        await supabase
          .from("games")
          .update({
            state: GameState.ShowQuestion,
            state_ts: now,
            question_index: nextQIdx,
            current_q: question!.question_text,
          })
          .eq("pin", pin);
      }
      break;
    }

    default:
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
