"use client";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { rpc, supabase } from "@/lib/supabase";
import type { MyState } from "@/lib/game";

type Toast = { id: number; tone: "good" | "bad" | "info" | "rare"; text: string };

type GameCtx = {
  status: "loading" | "signed_out" | "ready" | "error";
  session: Session | null;
  state: MyState | null;
  error: string | null;
  refresh: () => Promise<void>;
  toast: (text: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
};

const Ctx = createContext<GameCtx | null>(null);

export function useGame(): GameCtx {
  const v = use(Ctx);
  if (!v) throw new Error("useGame must be inside <GameProvider>");
  return v;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<GameCtx["status"]>("loading");
  const [state, setState] = useState<MyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const refresh = useCallback(async () => {
    const r = await rpc<MyState>("my_state");
    if (r.ok) {
      setState(r as unknown as MyState);
      setStatus("ready");
      setError(null);
    } else if (r.error === "not_registered") {
      setStatus("error");
      setError(r.error);
    } else {
      // Keep showing the last good state on transient errors.
      setError(r.error);
      setStatus((s) => (s === "loading" ? "error" : s));
    }
  }, []);

  // Auth lifecycle.
  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setStatus("signed_out");
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setState(null);
        setStatus("signed_out");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load state + live updates once signed in.
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState runs after await
    void refresh();
    const sb = supabase();
    const ch = sb
      .channel(`me-${uid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "players", filter: `id=eq.${uid}` }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_settings" }, () => void refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_events" }, () => void refresh())
      .subscribe();
    // Safety net in case a realtime message is missed (spotty campus wifi).
    const poll = setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      void sb.removeChannel(ch);
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
  }, [uid, refresh]);

  return <Ctx value={{ status, session, state, error, refresh, toast, toasts }}>{children}</Ctx>;
}
