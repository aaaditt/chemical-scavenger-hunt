import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// 1080×1920 Instagram story cards. Text is kept inside IG's safe zone (top 250px / bottom 340px stay clear).
const W = 1080;
const H = 1920;
const COBALT = "#16246b";
const DEEP = "#0b1340";
const AMBER = "#f2a93b";
const LABEL = "#f7f8fc";
const URANIUM = "#c6ff3d";
const TIER: Record<string, string> = {
  basic: LABEL, catalyzed: "#9aa8e6", uncommon: "#3fc6a8", rare: AMBER, isotope: URANIUM, legendary: "#ff7ad9",
};

const clip = (s: string | null, n: number) => (s ?? "").slice(0, n);

// Archivo (expanded, extra-bold) to match the app. Fetched once per server instance; falls back to the default font.
let fontPromise: Promise<ArrayBuffer | null> | null = null;
function archivo(): Promise<ArrayBuffer | null> {
  fontPromise ??= (async () => {
    try {
      // No browser UA → Google serves TTF, which the image renderer supports.
      const css = await (await fetch("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800")).text();
      const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
      return url ? await (await fetch(url)).arrayBuffer() : null;
    } catch {
      return null;
    }
  })();
  return fontPromise;
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/card/[kind]">) {
  const { kind } = await ctx.params;
  const q = req.nextUrl.searchParams;
  let body: React.ReactElement;

  if (kind === "compound") {
    const tier = q.get("tier") ?? "basic";
    const color = TIER[tier] ?? LABEL;
    body = (
      <Frame>
        <div style={{ display: "flex", fontSize: 44, color: "#c9cfea" }}>{clip(q.get("player"), 24)} just synthesized</div>
        <div style={{ display: "flex", fontSize: 210, fontWeight: 800, color, marginTop: 40, letterSpacing: -4 }}>{clip(q.get("formula"), 14)}</div>
        <div style={{ display: "flex", fontSize: 86, fontWeight: 800, marginTop: 10 }}>{clip(q.get("name"), 28)}</div>
        <div style={{ display: "flex", marginTop: 50, gap: 24, alignItems: "center" }}>
          <div style={{ display: "flex", background: color, color: DEEP, fontSize: 40, fontWeight: 800, padding: "12px 28px", borderRadius: 10 }}>{tier.toUpperCase()}</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: AMBER }}>+{clip(q.get("points"), 4)}</div>
        </div>
        {q.get("first") === "1" && (
          <div style={{ display: "flex", marginTop: 60, background: AMBER, color: DEEP, fontSize: 46, fontWeight: 800, padding: "20px 36px", borderRadius: 12 }}>
            ⭐ First on campus to make it
          </div>
        )}
      </Frame>
    );
  } else if (kind === "rank") {
    body = (
      <Frame>
        <div style={{ display: "flex", fontSize: 48, color: "#c9cfea" }}>{clip(q.get("name"), 24)} finished</div>
        <div style={{ display: "flex", fontSize: 300, fontWeight: 800, color: AMBER, letterSpacing: -8 }}>#{clip(q.get("rank"), 4)}</div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>{clip(q.get("score"), 6)} points · {clip(q.get("compounds"), 3)} compounds</div>
        <div style={{ display: "flex", fontSize: 48, marginTop: 70, color: "#c9cfea" }}>My secret catalyst was</div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, marginTop: 10 }}>{clip(q.get("catalyst"), 20)}</div>
      </Frame>
    );
  } else if (kind === "drop") {
    const isotope = q.get("kind") === "isotope";
    const color = isotope ? URANIUM : AMBER;
    body = (
      <Frame bg={isotope ? COBALT : "#000"}>
        <div style={{ display: "flex", fontSize: 160 }}>{isotope ? "☢️" : "🕶️"}</div>
        <div style={{ display: "flex", fontSize: 60, color, marginTop: 30, fontWeight: 800 }}>{isotope ? "UNSTABLE ISOTOPE DETECTED" : "THE BLACK MARKET IS OPEN"}</div>
        <div style={{ display: "flex", fontSize: 130, fontWeight: 800, marginTop: 30, textAlign: "center" }}>{clip(q.get("title"), 24)}</div>
        <div style={{ display: "flex", fontSize: 72, marginTop: 40, color }}>{clip(q.get("minutes"), 3)} minutes. Go.</div>
        {q.get("hint") && <div style={{ display: "flex", fontSize: 48, marginTop: 40, color: "#c9cfea", textAlign: "center" }}>Last seen: {clip(q.get("hint"), 60)}</div>}
      </Frame>
    );
  } else {
    return new Response("Unknown card", { status: 404 });
  }

  const font = await archivo();
  return new ImageResponse(body, {
    width: W,
    height: H,
    fonts: font ? [{ name: "Archivo", data: font, weight: 800, style: "normal" }] : undefined,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

function Frame({ children, bg = COBALT }: { children: React.ReactNode; bg?: string }) {
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: bg, color: LABEL, fontFamily: "Archivo", padding: "260px 80px 360px", position: "relative" }}>
      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>{children}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>Secret Catalyst</div>
        <div style={{ display: "flex", fontSize: 32, color: "#c9cfea", marginTop: 8 }}>BITS Pilani Dubai · #SecretCatalyst</div>
      </div>
    </div>
  );
}
