"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useGame } from "./GameProvider";
import { Splash } from "./Shell";

const NAV = [
  { href: "/admin", label: "Control room" },
  { href: "/admin/qr", label: "QR codes" },
  { href: "/screen", label: "Big screen ↗", external: true },
  { href: "/screen/finale", label: "Finale ↗", external: true },
  { href: "/lab", label: "Player view" },
];

/** UI gate only — every admin RPC also checks is_admin in the database. */
export function AdminGate({ children }: { children: ReactNode }) {
  const { status, state, toasts } = useGame();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (status === "signed_out") router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [status, path, router]);

  if (status !== "ready" || !state) return <Splash text="Loading control room…" />;
  if (!state.player.is_admin) return <Splash text="Organizers only." />;

  return (
    <div className="min-h-dvh bg-cobalt-950 print:bg-white">
      <header className="print:hidden border-b border-cobalt-700 px-6 py-3 flex items-center gap-6">
        <p className="wide">Secret Catalyst · Control</p>
        <nav className="flex gap-4 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} target={n.external ? "_blank" : undefined}
              className={path === n.href ? "text-amber" : "text-label-dim hover:text-label"}>{n.label}</Link>
          ))}
        </nav>
      </header>
      <main className="px-6 py-6 max-w-7xl mx-auto print:p-0 print:max-w-none">{children}</main>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 print:hidden" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={`rounded-label px-4 py-3 text-sm font-semibold shadow-lg ${t.tone === "bad" ? "bg-hazard" : "bg-label text-cobalt-900"}`}>{t.text}</p>
        ))}
      </div>
    </div>
  );
}
