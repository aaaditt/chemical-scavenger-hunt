"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useGame } from "@/components/GameProvider";
import { errorMessage } from "@/lib/messages";
import { rpc } from "@/lib/supabase";

// Joining is a choice, so it needs a tap — never auto-join from a link.
export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const { refresh } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="text-center py-14">
      <p className="text-5xl" aria-hidden>⚭</p>
      <h1 className="wide text-2xl mt-3">Alliance invite</h1>
      <p className="mt-2 text-label-dim">Code <span className="wide tracking-widest text-label">{code}</span>. Allies share common elements and hints. Leaving later costs points.</p>
      {msg ? (
        <p className="mt-6 font-semibold">{msg}</p>
      ) : (
        <button disabled={busy} onClick={async () => {
          setBusy(true);
          const r = await rpc<{ alliance: string }>("alliance_join", { p_code: code });
          setMsg(r.ok ? `You joined ${(r as unknown as { alliance: string }).alliance}.` : errorMessage(r.error));
          void refresh();
        }} className="mt-8 rounded-label bg-amber text-cobalt-950 font-bold px-8 py-3">Join alliance</button>
      )}
      <p className="mt-6"><Link href="/crew" className="underline text-label-dim">Go to crew</Link></p>
    </div>
  );
}
