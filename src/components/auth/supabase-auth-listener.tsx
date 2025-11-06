"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthLifecycleEvent = AuthChangeEvent;

const shouldSyncSession = (event: AuthLifecycleEvent) =>
  event === "SIGNED_IN" || event === "TOKEN_REFRESHED";

const shouldClearSession = (event: AuthLifecycleEvent) =>
  event === "SIGNED_OUT";

const syncAuthToServer = async (event: AuthLifecycleEvent, session: Session | null) => {
  const payload = JSON.stringify({ event, session });

  await fetch("/api/auth/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: payload,
  });
};

export const SupabaseAuthListener = () => {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (shouldSyncSession(event) && session) {
          await syncAuthToServer(event, session);
        }

        if (shouldClearSession(event)) {
          await syncAuthToServer(event, null);
        }
      } catch (error) {
        console.error("Failed to sync auth state", error);
      } finally {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
};
