import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { getSession, getProjectRole } from "@/lib/auth";
import { getProjectById } from "@/lib/data/projects";
import { decryptSecret } from "@/lib/crypto";
import { fetchJiraProjects, resolveJiraConfig } from "@/lib/integrations/jira";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

const validateSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  jiraBaseUrl: z
    .string()
    .trim()
    .url("JIRA base URL must be a valid URL")
    .or(z.literal(""))
    .optional(),
  jiraEmail: z
    .string()
    .trim()
    .email("JIRA email must be valid")
    .or(z.literal(""))
    .optional(),
  jiraApiToken: z.string().optional(),
  clearJiraApiToken: z.boolean().optional(),
});

export const POST = async (request: Request) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await await assertValidCsrf(request);
  } catch {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = validateSchema.safeParse(raw ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { projectId, jiraBaseUrl, jiraEmail, jiraApiToken, clearJiraApiToken } = parsed.data;

  const rate = consumeRateLimit(
    `integration-validate:${session.user.id}:${projectId}`,
    5,
    60_000
  );

  if (!rate.success) {
    const retryAfterSeconds = rate.retryAfter
      ? Math.ceil(rate.retryAfter / 1000)
      : undefined;

    return NextResponse.json(
      {
        error: "Too many validation attempts. Try again in a moment.",
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: retryAfterSeconds
          ? {
              "Retry-After": retryAfterSeconds.toString(),
            }
          : undefined,
      }
    );
  }

  const project = await getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const role = await getProjectRole(projectId, session.user.id);

  if (!role || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const integrationsRaw =
    project.integrations &&
    typeof project.integrations === "object" &&
    !Array.isArray(project.integrations)
      ? (project.integrations as Record<string, unknown>)
      : {};

  const existingJira =
    integrationsRaw &&
    typeof integrationsRaw.jira === "object" &&
    integrationsRaw.jira !== null
      ? (integrationsRaw.jira as Record<string, unknown>)
      : {};

  const normalizedBaseUrl =
    typeof jiraBaseUrl === "string" && jiraBaseUrl.length > 0
      ? jiraBaseUrl.trim()
      : undefined;
  const nextBaseUrl = jiraBaseUrl === ""
    ? null
    : normalizedBaseUrl ??
      (typeof existingJira.baseUrl === "string"
        ? (existingJira.baseUrl as string)
        : null);

  const normalizedEmail =
    typeof jiraEmail === "string" && jiraEmail.length > 0
      ? jiraEmail.trim()
      : undefined;
  const nextEmail = jiraEmail === ""
    ? null
    : normalizedEmail ??
      (typeof existingJira.email === "string"
        ? (existingJira.email as string)
        : null);

  const normalizedApiToken =
    typeof jiraApiToken === "string" && jiraApiToken.trim().length > 0
      ? jiraApiToken.trim()
      : undefined;
  const clearToken = clearJiraApiToken ?? false;

  const legacyToken =
    typeof existingJira.apiToken === "string" && existingJira.apiToken.trim().length > 0
      ? existingJira.apiToken.trim()
      : null;

  const existingEncryptedToken =
    typeof existingJira.apiTokenEncrypted === "string" &&
    existingJira.apiTokenEncrypted.trim().length > 0
      ? (existingJira.apiTokenEncrypted as string)
      : null;

  let decryptedExistingToken: string | null = null;

  if (existingEncryptedToken) {
    try {
      decryptedExistingToken = decryptSecret(existingEncryptedToken);
    } catch {
      console.error("Unable to decrypt stored JIRA token", error);
      decryptedExistingToken = null;
    }
  }

  let activeApiToken: string | null = null;

  if (clearToken) {
    activeApiToken = null;
  } else if (normalizedApiToken) {
    activeApiToken = normalizedApiToken;
  } else if (decryptedExistingToken) {
    activeApiToken = decryptedExistingToken;
  } else if (legacyToken) {
    activeApiToken = legacyToken;
  } else {
    activeApiToken = null;
  }

  const resolved = resolveJiraConfig({
    baseUrl: nextBaseUrl ?? undefined,
    email: nextEmail ?? undefined,
    apiToken: clearToken ? null : activeApiToken ?? undefined,
  });

  if (!resolved) {
    return NextResponse.json(
      {
        error:
          "JIRA credentials are incomplete. Provide a base URL, email, and API token or configure them globally.",
      },
      { status: 400 }
    );
  }

  const validationAttemptPayload = {
    baseUrlProvided: Boolean(normalizedBaseUrl),
    emailProvided: Boolean(normalizedEmail),
    usedProjectToken: Boolean(activeApiToken),
  } as const;

  const projects = await fetchJiraProjects({
    baseUrl: resolved.baseUrl,
    email: resolved.email,
    apiToken: resolved.apiToken,
  });

  if (projects.error) {
    await logAuditEvent({
      userId: session.user.id,
      action: "jira.validate",
      entity: "project",
      entityId: projectId,
      payload: {
        ...validationAttemptPayload,
        cacheHit: projects.cacheHit,
        result: "error",
        error: projects.error,
      },
    });

    return NextResponse.json({ error: projects.error }, { status: 400 });
  }

  const validatedAt = new Date().toISOString();

  await logAuditEvent({
    userId: session.user.id,
    action: "jira.validate",
    entity: "project",
    entityId: projectId,
    payload: {
      ...validationAttemptPayload,
      cacheHit: projects.cacheHit,
      result: "success",
    },
  });

  const tokenSource = activeApiToken ? "project" : "environment";

  return NextResponse.json({
    projects: projects.projects,
    cacheHit: projects.cacheHit,
    tokenSource,
    validatedAt,
  });
};
