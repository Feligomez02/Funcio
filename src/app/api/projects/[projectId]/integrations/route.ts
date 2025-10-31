import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getProjectRole } from "@/lib/auth";
import { getProjectById, updateProjectIntegrations } from "@/lib/data/projects";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { fetchJiraProjects, resolveJiraConfig } from "@/lib/integrations/jira";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

const patchSchema = z.object({
  jiraProjectKey: z
    .string()
    .trim()
    .max(120, "JIRA project key is too long")
    .optional(),
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

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const role = await getProjectRole(projectId, session.user.id);

  if (!role || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await assertValidCsrf(request);
  } catch {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const project = await getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const jiraProjectKeyInput = parsed.data.jiraProjectKey;
  const jiraProjectKey =
    typeof jiraProjectKeyInput === "string" ? jiraProjectKeyInput.trim() : undefined;
  const jiraBaseUrlRaw = parsed.data.jiraBaseUrl;
  const jiraEmailRaw = parsed.data.jiraEmail;
  const jiraApiTokenRaw = parsed.data.jiraApiToken;
  const clearJiraApiToken = parsed.data.clearJiraApiToken ?? false;

  const integrations =
    project.integrations &&
    typeof project.integrations === "object" &&
    !Array.isArray(project.integrations)
      ? { ...(project.integrations as Record<string, unknown>) }
      : {};

  const existingJira =
    typeof integrations.jira === "object" && integrations.jira !== null
      ? ({ ...(integrations.jira as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : {};

  const legacyToken =
    typeof existingJira.apiToken === "string" && existingJira.apiToken.trim().length > 0
      ? existingJira.apiToken.trim()
      : null;

  if ("apiToken" in existingJira) {
    delete existingJira.apiToken;
  }

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

  const normalizedBaseUrl =
    typeof jiraBaseUrlRaw === "string" && jiraBaseUrlRaw.length > 0
      ? jiraBaseUrlRaw.trim()
      : undefined;
  const nextBaseUrl = jiraBaseUrlRaw === ""
    ? null
    : normalizedBaseUrl ??
      (typeof existingJira.baseUrl === "string" ? (existingJira.baseUrl as string) : null);

  const normalizedEmail =
    typeof jiraEmailRaw === "string" && jiraEmailRaw.length > 0
      ? jiraEmailRaw.trim()
      : undefined;
  const nextEmail = jiraEmailRaw === ""
    ? null
    : normalizedEmail ??
      (typeof existingJira.email === "string" ? (existingJira.email as string) : null);

  const normalizedApiToken =
    typeof jiraApiTokenRaw === "string" && jiraApiTokenRaw.trim().length > 0
      ? jiraApiTokenRaw.trim()
      : undefined;

  let activeApiToken: string | null = null;
  let encryptedTokenToPersist: string | null = existingEncryptedToken;

  if (clearJiraApiToken) {
    activeApiToken = null;
    encryptedTokenToPersist = null;
  } else if (normalizedApiToken) {
    activeApiToken = normalizedApiToken;
    encryptedTokenToPersist = encryptSecret(normalizedApiToken);
  } else if (decryptedExistingToken) {
    activeApiToken = decryptedExistingToken;
    encryptedTokenToPersist = existingEncryptedToken;
  } else if (legacyToken) {
    activeApiToken = legacyToken;
    encryptedTokenToPersist = encryptSecret(legacyToken);
  } else {
    activeApiToken = null;
    encryptedTokenToPersist = null;
  }

  const nextProjectKey = jiraProjectKey !== undefined && jiraProjectKey.length === 0
    ? null
    : jiraProjectKey !== undefined && jiraProjectKey.length > 0
    ? jiraProjectKey
    : typeof existingJira.projectKey === "string"
    ? (existingJira.projectKey as string)
    : null;

  const nextJira: Record<string, unknown> = {};

  if (nextProjectKey) {
    nextJira.projectKey = nextProjectKey;
  }

  if (nextBaseUrl) {
    nextJira.baseUrl = nextBaseUrl;
  }

  if (nextEmail) {
    nextJira.email = nextEmail;
  }

  if (encryptedTokenToPersist) {
    nextJira.apiTokenEncrypted = encryptedTokenToPersist;
  } else {
    delete nextJira.apiTokenEncrypted;
  }

  const convertedLegacyToken =
    !clearJiraApiToken &&
    !normalizedApiToken &&
    Boolean(legacyToken) &&
    !existingEncryptedToken;

  const shouldValidate = Boolean(
    nextProjectKey || nextBaseUrl || nextEmail || normalizedApiToken || convertedLegacyToken
  );

  if (shouldValidate) {
    const resolved = resolveJiraConfig({
      baseUrl: nextBaseUrl ?? undefined,
      email: nextEmail ?? undefined,
      apiToken: clearJiraApiToken ? null : activeApiToken ?? undefined,
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

    const projectFetch = await fetchJiraProjects({
      baseUrl: resolved.baseUrl,
      email: resolved.email,
      apiToken: resolved.apiToken,
    });

    if (projectFetch.error) {
      return NextResponse.json(
        { error: projectFetch.error },
        { status: 400 }
      );
    }

    nextJira.availableProjects = projectFetch.projects;
    nextJira.lastValidatedAt = new Date().toISOString();
  } else if (nextProjectKey) {
    if (Array.isArray(existingJira.availableProjects)) {
      nextJira.availableProjects = existingJira.availableProjects;
    }
    if (typeof existingJira.lastValidatedAt === "string") {
      nextJira.lastValidatedAt = existingJira.lastValidatedAt;
    }
  }

  if (Object.keys(nextJira).length > 0) {
    integrations.jira = nextJira;
  } else {
    delete integrations.jira;
  }

  const updated = await updateProjectIntegrations({
    projectId,
    integrations: Object.keys(integrations).length > 0 ? integrations : null,
    updatedBy: session.user.id,
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Unable to update integrations" },
      { status: 500 }
    );
  }

  const sanitizedIntegrations =
    updated.integrations &&
    typeof updated.integrations === "object" &&
    !Array.isArray(updated.integrations)
      ? ({ ...(updated.integrations as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : null;

  if (sanitizedIntegrations?.jira && typeof sanitizedIntegrations.jira === "object") {
    delete (sanitizedIntegrations.jira as Record<string, unknown>).apiToken;
    delete (sanitizedIntegrations.jira as Record<string, unknown>).apiTokenEncrypted;
  }

  const tokenConfigured = Boolean(encryptedTokenToPersist);
  const responseJira = integrations.jira && typeof integrations.jira === "object"
    ? {
        projectKey: nextProjectKey,
        baseUrl: nextBaseUrl,
        email: nextEmail,
        tokenConfigured,
        availableProjects: Array.isArray(nextJira.availableProjects)
          ? (nextJira.availableProjects as Array<{ key: string; name: string }>)
          : [],
        lastValidatedAt:
          typeof nextJira.lastValidatedAt === "string"
            ? (nextJira.lastValidatedAt as string)
            : null,
      }
    : null;

  return NextResponse.json({ integrations: sanitizedIntegrations, jira: responseJira });
};
