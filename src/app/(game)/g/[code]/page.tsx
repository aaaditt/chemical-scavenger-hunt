"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bottle } from "@/components/Bottle";
import { useGame } from "@/components/GameProvider";
import type { Tier } from "@/lib/game";
import { errorMessage } from "@/lib/messages";
import { rpc } from "@/lib/supabase";

type Gift = { element: { symbol: string; name: string; tier: Tier }; from: string; points: number };

export default function GiftPage() {
  const { code } = useParams<{ code: string }>();
  const { refresh } = useGame();
  const [res, setRes] = useState<{ ok: true; gift: Gift } | { ok: false; error: string } | null>(null);
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    rpc<Gift>("redeem_gift", { p_code: code }).then((r) => {
      setRes(r.ok ? { ok: true, gift: r as unknown as Gift } : { ok: false, error: r.error });
      void refresh();
    });
  }, [code, refresh]);

  if (!res) return <p className="py-20 text-center text-fog">Unwrapping…</p>;
  return (
    <div className="text-center py-10">
      {res.ok ? (
        <>
          <p className="text-fog">{res.gift.from} sent you</p>
          <div className="mt-4 animate-pop flex justify-center"><Bottle symbol={res.gift.element.symbol} name={res.gift.element.name} tier={res.gift.element.tier} size={140} /></div>
          <p className="mt-3 wide text-4xl text-candle">+{res.gift.points}</p>
        </>
      ) : (
        <p className="text-fog max-w-[28ch] mx-auto">{errorMessage(res.error)}</p>
      )}
      <Link href="/lab" className="mt-8 inline-block btn btn-primary">My lab</Link>
    </div>
  );
}
