import { Suspense } from "react";
import { GameProvider } from "@/components/GameProvider";
import { Shell, Splash } from "@/components/Shell";

// Everything inside the game is per-player and live, so it renders on the client behind one boundary.
export default function GameLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<Splash text="Opening your lab…" />}>
      <GameProvider>
        <Shell>{children}</Shell>
      </GameProvider>
    </Suspense>
  );
}
