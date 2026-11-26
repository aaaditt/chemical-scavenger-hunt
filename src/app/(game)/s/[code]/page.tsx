"use client";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClaimResult, type ClaimResponse } from "@/components/ClaimResult";
import { useGame } from "@/components/GameProvider";
import { rpc } from "@/lib/supabase";

// Phone-camera entry point: a printed QR encodes https://<site>/s/<CODE>.
export default function ScanLanding() {
  const { code } = useParams<{ code: string }>();
  const { refresh } = useGame();
  const [result, setResult] = useState<ClaimResponse | null>(null);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    rpc("claim_qr", { p_code: code }).then((r) => {
      setResult(r as ClaimResponse);
      void refresh();
    });
  }, [code, refresh]);

  if (!result) return <p className="py-20 text-center text-label-dim">Analysing sample…</p>;
  return <ClaimResult result={result} />;
}
