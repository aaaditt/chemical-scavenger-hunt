"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Browser Supabase client (singleton). All game writes go through RPCs on this client. */
export function supabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

export type RpcResult<T = Record<string, unknown>> = ({ ok: true } & T) | { ok: false; error: string; [k: string]: unknown };

/** Call a game RPC. Network/DB exceptions are normalised into {ok:false,error}. */
export async function rpc<T = Record<string, unknown>>(fn: string, args?: Record<string, unknown>): Promise<RpcResult<T>> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) {
    const msg = error.message || "network";
    return { ok: false, error: /admin only/.test(msg) ? "admin_only" : /fetch|network/i.test(msg) ? "network" : msg };
  }
  if (data && typeof data === "object" && !Array.isArray(data) && "ok" in data) return data as RpcResult<T>;
  return { ok: true, data } as unknown as RpcResult<T>;
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
