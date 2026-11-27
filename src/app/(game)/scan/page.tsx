"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClaimResult, type ClaimResponse } from "@/components/ClaimResult";
import { useGame } from "@/components/GameProvider";
import { parseScan } from "@/lib/game";
import { rpc } from "@/lib/supabase";

export default function ScanPage() {
  const { refresh, toast } = useGame();
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);
  const [result, setResult] = useState<ClaimResponse | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const handle = useCallback(
    async (text: string) => {
      if (busy.current) return;
      const parsed = parseScan(text);
      if (!parsed) {
        toast("That QR isn't part of the game.", "bad");
        return;
      }
      if (parsed.kind === "gift") return router.push(`/g/${parsed.code}`);
      if (parsed.kind === "catalyst") return router.push(`/mix?cat=${parsed.code}`);
      if (parsed.kind === "alliance") return router.push(`/join/${parsed.code}`);
      busy.current = true;
      navigator.vibrate?.(60);
      const r = (await rpc("claim_qr", { p_code: parsed.code })) as ClaimResponse;
      setResult(r);
      void refresh();
      busy.current = false;
    },
    [refresh, router, toast]
  );

  // Camera scanner; paused while a result is showing.
  useEffect(() => {
    if (result) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          video.current!,
          (res) => {
            if (res && !cancelled) void handle(res.getText());
          }
        );
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      } catch {
        setCamError("Camera unavailable. Allow camera access, or type the code printed under the QR.");
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [result, handle]);

  if (result) return <ClaimResult result={result} onClose={() => setResult(null)} />;

  return (
    <div>
      <h1 className="pf-24">Scan</h1>
      <div className="mt-4 relative aspect-square  overflow-hidden bg-cobalt-950">
        <video ref={video} className="absolute inset-0 size-full object-cover" muted playsInline />
        {/* viewfinder */}
        <div className="absolute inset-10 border-4 border-amber " aria-hidden />
        {camError && <p className="absolute inset-x-4 bottom-4 panel-dark/90 p-3 text-sm">{camError}</p>}
      </div>
      <p className="mt-3 text-sm text-fog">Point at any Secret Catalyst QR — elements, hints, gifts, catalyst codes and alliance invites all work here.</p>

      <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) void handle(manual.trim()); }}>
        <input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="Or type the code"
          aria-label="QR code" autoCapitalize="characters" className="flex-1 min-w-0 h-12 bg-bench text-text px-3 font-num text-[18px] tracking-wider shadow-px" />
        <button className="btn btn-plain">Claim</button>
      </form>
    </div>
  );
}
