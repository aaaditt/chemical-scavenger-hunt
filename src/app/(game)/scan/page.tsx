"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClaimResult, type ClaimResponse } from "@/components/ClaimResult";
import { useGame } from "@/components/GameProvider";
import { parseScan } from "@/lib/game";
import { rpc } from "@/lib/supabase";
import { Sprite } from "@/components/Sprite";

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
      <h1 className="font-num text-[24px] text-text">Point at a QR code</h1>
      <p className="mt-1 font-num text-[16px] leading-[22px] text-fog" style={{ fontWeight: 400 }}>Hold your phone steady about a hand away. It scans by itself.</p>
      <div className="mt-4 relative aspect-square overflow-hidden bg-ink" style={{ boxShadow: "var(--shadow-px)" }}>
        <video ref={video} className="absolute inset-0 size-full object-cover" muted playsInline />
        {/* Viewfinder: four hard pixel corners and a sweeping red scan line (ref-2 alarm red). */}
        <div className="absolute inset-10" aria-hidden>
          {["left-0 top-0 border-l-8 border-t-8", "right-0 top-0 border-r-8 border-t-8", "left-0 bottom-0 border-l-8 border-b-8", "right-0 bottom-0 border-r-8 border-b-8"].map((c) => (
            <span key={c} className={`absolute size-12 border-candle ${c}`} />
          ))}
          {!camError && <span className="scanline absolute left-2 right-2 top-0 h-1 bg-alarm" style={{ ["--scan-h" as string]: "264px" }} />}
        </div>
        {camError && (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div>
              <div className="flex justify-center"><Sprite name="qr" scale={6} pal={{ k: "#2c5a52" }} /></div>
              <p className="mt-4 font-num text-[18px] text-text">Camera is off</p>
              <p className="mt-2 font-num text-[15px] leading-[20px] text-fog" style={{ fontWeight: 400 }}>Allow camera access in your browser, or type the code printed under the QR below.</p>
            </div>
          </div>
        )}
      </div>

      <form className="mt-6 flex gap-3" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) void handle(manual.trim()); }}>
        <input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="Type the code"
          aria-label="QR code" autoCapitalize="characters" className="flex-1 min-w-0 h-12 bg-bench text-text px-3 font-num text-[18px] tracking-wider shadow-px placeholder:text-fog" />
        <button className="btn btn-primary">Claim</button>
      </form>

      <ul className="mt-8 flex flex-col gap-3 font-num text-[15px] leading-[20px] text-fog" style={{ fontWeight: 400 }}>
        <li className="flex gap-3 items-center"><span className="shrink-0 w-8 grid place-items-center"><Sprite name="n_lab" scale={3} /></span>Element QRs put a bottle on your shelf.</li>
        <li className="flex gap-3 items-center"><span className="shrink-0 w-8 grid place-items-center"><Sprite name="lock" scale={3} /></span>Hint QRs unlock an exact recipe in your Hint Book.</li>
        <li className="flex gap-3 items-center"><span className="shrink-0 w-8 grid place-items-center"><Sprite name="n_crew" scale={3} /></span>Friends&apos; catalyst, gift and alliance codes work here too.</li>
      </ul>
    </div>
  );
}
