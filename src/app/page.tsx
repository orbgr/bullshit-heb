import { MenuButton } from "@/components/layout/MenuButton";
import { he } from "@/lib/i18n";

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-dvh p-6">
      <div className="text-center mt-12 mb-10">
        <h1 className="text-7xl font-black text-primary">{he.gameName}</h1>
        <p className="text-xl text-text-muted mt-2">{he.tagline}</p>
        <div className="text-accent text-2xl mt-3">&#9830;</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
        <MenuButton
          href="/join"
          icon="🎮"
          label={he.joinGame}
          subtitle={he.joinGameSub}
        />
        <MenuButton
          href="/create"
          icon="➕"
          label={he.createGame}
          subtitle={he.createGameSub}
        />
        <MenuButton
          href="/present"
          icon="🖥️"
          label={he.presentGame}
          subtitle={he.presentGameSub}
        />
        <MenuButton
          href="/learn"
          icon="🎓"
          label={he.howToPlay}
          subtitle={he.howToPlaySub}
        />
      </div>
    </div>
  );
}
