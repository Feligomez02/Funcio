import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/env";

type AuthCallbackPayload = {
  event: AuthChangeEvent;
  session: Session | null;
};

const createSupabaseClientForRoute = () => {
  const cookieStore = cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore
            .getAll()
            .map((cookie) => ({ name: cookie.name, value: cookie.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
};

const persistSession = async (session: Session) => {
  const supabase = createSupabaseClientForRoute();

  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
};

const clearSession = async () => {
  const supabase = createSupabaseClientForRoute();
  await supabase.auth.signOut();
};

export async function POST(request: Request) {
  let payload: AuthCallbackPayload | null = null;

  try {
    payload = (await request.json()) as AuthCallbackPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { event, session } = payload ?? {};

  if (!event) {
    return NextResponse.json({ error: "Missing auth event" }, { status: 400 });
  }

  try {
    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
      if (!session.access_token || !session.refresh_token) {
        return NextResponse.json(
          { error: "Incomplete session payload" },
          { status: 400 }
        );
      }

      await persistSession(session);
    }

    if (event === "SIGNED_OUT" || event === "USER_DELETED") {
      await clearSession();
    }
  } catch (error) {
    console.error("Auth callback failed", error);
    return NextResponse.json(
      { error: "Failed to update auth state" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
