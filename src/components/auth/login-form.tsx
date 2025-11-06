"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const upcomingProviders = [
  { provider: "google", label: "Google" },
  { provider: "github", label: "GitHub" },
  { provider: "auth0", label: "Auth0" },
] as const;

export const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Enforce safe internal redirects compatible with Next.js typedRoutes
  const redirect: Route = (() => {
    const candidate = searchParams.get("redirect");
    const fallback: Route = "/projects";
    if (!candidate) return fallback;
    // Only allow same-origin internal paths; disallow protocol/host and protocol-relative
    const isInternal = candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("://");
    return (isInternal ? (candidate as Route) : fallback);
  })();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    "OAuth sign-in (Google, GitHub, Auth0) is coming in the next release."
  );

  const supabase = getSupabaseBrowserClient();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfoMessage(
      "OAuth sign-in (Google, GitHub, Auth0) is coming soon."
    );
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <form className="space-y-6" method="post" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {infoMessage ? (
        <p className="text-sm text-slate-600">{infoMessage}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>

      <div className="space-y-3">
        <p className="text-center text-xs text-slate-500">
          OAuth providers will be available in the next version.
        </p>
        <div className="grid gap-2">
          {upcomingProviders.map(({ provider, label }) => (
            <Button
              key={provider}
              type="button"
              variant="secondary"
              className="w-full"
              disabled
            >
              {label} · Coming soon
            </Button>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-slate-600">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-slate-900">
          Register now
        </Link>
      </p>
    </form>
  );
};
