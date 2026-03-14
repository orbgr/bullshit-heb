"use client";

import { use } from "react";
import { useGameSubscription } from "@/hooks/useGameSubscription";
import { usePlayersSubscription } from "@/hooks/usePlayersSubscription";
import { useSessionStore } from "@/stores/sessionStore";
import { GameState } from "@/lib/types";
import { GameStaging } from "@/components/game/GameStaging";
import { RoundIntro } from "@/components/game/RoundIntro";
import { ShowQuestion } from "@/components/game/ShowQuestion";
import { ShowAnswers } from "@/components/game/ShowAnswers";
import { RevealTheTruth } from "@/components/game/RevealTheTruth";
import { ScoreBoard } from "@/components/game/ScoreBoard";
import { ScoreBoardFinal } from "@/components/game/ScoreBoardFinal";

export default function GamePage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = use(params);
  const { game, loading } = useGameSubscription(pin);
  const { players } = usePlayersSubscription(pin);
  const playerId = useSessionStore((s) => s.playerId);

  if (loading || !game) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myScore =
    players.find((p) => p.id === playerId)?.score ?? 0;
  const hp = game.has_presenter;

  switch (game.state) {
    case GameState.GameStaging:
      return <GameStaging pin={pin} />;

    case GameState.RoundIntro:
      return (
        <RoundIntro
          pin={pin}
          roundIndex={game.round_index}
          hasPresenter={hp}
          playerScore={myScore}
        />
      );

    case GameState.ShowQuestion:
      return (
        <ShowQuestion
          pin={pin}
          questionText={game.current_q ?? ""}
          questionIndex={game.question_index}
          totalQ={game.total_q}
          hasPresenter={hp}
          playerScore={myScore}
        />
      );

    case GameState.ShowAnswers:
      return (
        <ShowAnswers
          pin={pin}
          questionText={game.current_q ?? ""}
          questionIndex={game.question_index}
          totalQ={game.total_q}
          hasPresenter={hp}
          playerScore={myScore}
        />
      );

    case GameState.RevealTheTruth:
      return (
        <RevealTheTruth
          pin={pin}
          questionIndex={game.question_index}
          totalQ={game.total_q}
          hasPresenter={hp}
          playerScore={myScore}
        />
      );

    case GameState.ScoreBoard:
      return (
        <ScoreBoard
          pin={pin}
          hasPresenter={hp}
          playerScore={myScore}
        />
      );

    case GameState.ScoreBoardFinal:
      return <ScoreBoardFinal pin={pin} />;

    default:
      return <div>Unknown state</div>;
  }
}
