import { Suspense } from "react";
import { GameProvider } from "@/components/GameProvider";
import { AdminGate } from "@/components/AdminGate";
import { Splash } from "@/components/Shell";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<Splash text="Loading control room…" />}>
      <GameProvider>
        <AdminGate>{children}</AdminGate>
      </GameProvider>
    </Suspense>
  );
}
