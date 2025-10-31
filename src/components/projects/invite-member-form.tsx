"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/i18n/i18n-provider";
import type { RolesDictionary } from "@/lib/i18n/types";
import { fetchWithCsrf } from "@/lib/security/csrf";

const ROLE_ORDER: Array<keyof RolesDictionary> = [
  "collaborator",
  "analyst",
  "admin",
];

export const InviteMemberForm = ({ projectId }: { projectId: string }) => {
  const router = useRouter();
  const {
    dictionary: { inviteMemberForm: copy, projectMembersCard },
  } = useI18n();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<keyof RolesDictionary>("collaborator");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  const roleOptions = useMemo(
    () =>
      ROLE_ORDER.map((value) => ({
        value,
        label: projectMembersCard.roles[value] ?? value,
      })),
    [projectMembersCard.roles]
  );

  const isEmailValid = useMemo(() => {
    const value = email.trim().toLowerCase();
    // Lightweight email validation; server performs authoritative checks.
    return /.+@.+\..+/.test(value);
  }, [email]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setToastMessage(null);
      setIsSubmitting(true);

      const sanitizedEmail = email.trim().toLowerCase();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s safety timeout

      try {
        const response = await fetchWithCsrf(`/api/projects/${projectId}/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: sanitizedEmail, role }),
          signal: controller.signal,
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const rawCode =
            data && typeof data.code === "string" ? data.code : undefined;
          const code = rawCode as keyof typeof copy.errors | undefined;
          const message =
            (code && copy.errors[code]) ??
            (data && typeof data.error === "string"
              ? data.error.slice(0, 160)
              : copy.errors.generic);
          setError(message);
          return;
        }

        setEmail("");
        setRole("collaborator");
        setToastMessage(copy.success);
        router.refresh();
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          setError(copy.errors.timeout);
        } else {
          setError(copy.errors.network);
        }
      } finally {
        clearTimeout(timeout);
        setIsSubmitting(false);
      }
    },
    [copy, email, isSubmitting, projectId, role, router]
  );

  useEffect(() => {
    if (!toastMessage) {
      setIsToastVisible(false);
      return;
    }

    setIsToastVisible(true);
    const timeout = window.setTimeout(() => {
      setIsToastVisible(false);
      setToastMessage(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2 sm:flex-1">
          <label htmlFor="invite-email" className="text-sm font-medium text-slate-800">
            {copy.emailLabel}
          </label>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            aria-invalid={!isEmailValid && email.length > 0}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="person@example.com"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
          />
        </div>
        <div className="space-y-2 sm:w-44">
          <label htmlFor="invite-role" className="text-sm font-medium text-slate-800">
            {copy.roleLabel}
          </label>
          <Select
            id="invite-role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as keyof RolesDictionary)
            }
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end sm:ml-auto sm:w-auto">
          <Button
            type="submit"
            className="w-full sm:min-w-[8.5rem]"
            disabled={!isEmailValid || isSubmitting}
          >
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
        </div>
      </div>
      <div className="min-h-[1rem]" aria-live="assertive">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
      <p className="text-xs text-slate-500">{copy.hint}</p>
      {isToastVisible && toastMessage ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-600/40">
            {toastMessage}
          </div>
        </div>
      ) : null}
    </form>
  );
};
