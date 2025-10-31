import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getProjectRole } from "@/lib/auth";
import { getRequirementById } from "@/lib/data/requirements";
import { getProjectById } from "@/lib/data/projects";
import { decryptSecret } from "@/lib/crypto";
import {
  JiraRequestError,
  createJiraIssue,
  updateJiraIssue,
  type JiraIssuePushInput,
} from "@/lib/integrations/jira";
import {
  createRequirementLink,
  updateRequirementLink,
  listRequirementLinks,
  type RequirementLink,
} from "@/lib/data/requirement-links";
import { assertValidCsrf } from "@/lib/security/verify-csrf";

const pushSchema = z.object({
  projectKey: z.string().trim().min(1, "Project key is required."),
  issueType: z.string().trim().min(1, "Issue type is required."),
  issueKey: z.string().trim().min(1).optional(),
  labels: z
    .array(z.string().trim().min(1))
    .max(10)
    .optional(),
});

const mapLinkResponse = (link: RequirementLink) => ({
  id: link.id,
  requirementId: link.requirement_id,
  provider: link.provider,
  externalType: link.external_type,
  externalId: link.external_id,
  externalKey: link.external_key,
  summary: link.summary,
  status: link.status,
  url: link.url,
  createdAt: link.created_at,
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ requirementId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requirementId } = await params;

  if (!requirementId) {
    return NextResponse.json({ error: "Missing requirementId" }, { status: 400 });
  }

  const requirement = await getRequirementById(requirementId);

  if (!requirement) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  const role = await getProjectRole(requirement.project_id, session.user.id);

  if (role !== "admin" && role !== "analyst") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await assertValidCsrf(request);
  } catch {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const project = await getProjectById(requirement.project_id);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = pushSchema.safeParse(rawBody ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;

  const integrations =
    project.integrations &&
    typeof project.integrations === "object" &&
    !Array.isArray(project.integrations)
      ? (project.integrations as Record<string, unknown>)
      : null;

  const jiraIntegration =
    integrations &&
    typeof integrations.jira === "object" &&
    integrations.jira !== null &&
    !Array.isArray(integrations.jira)
      ? (integrations.jira as Record<string, unknown>)
      : null;

  const configuredProjectKey =
    jiraIntegration && typeof jiraIntegration.projectKey === "string"
      ? jiraIntegration.projectKey.trim()
      : null;

  const availableProjectsRaw =
    jiraIntegration && Array.isArray(jiraIntegration.availableProjects)
      ? (jiraIntegration.availableProjects as Array<{ key?: string; name?: string }>)
      : [];

  const availableProjectKeys = new Set(
    availableProjectsRaw
      .map((item) => (typeof item?.key === "string" ? item.key.trim() : null))
      .filter((key): key is string => Boolean(key))
  );

  if (
    configuredProjectKey &&
    configuredProjectKey.length > 0 &&
    body.projectKey !== configuredProjectKey &&
    !availableProjectKeys.has(body.projectKey)
  ) {
    return NextResponse.json(
      { error: "Project key is not linked to this project." },
      { status: 400 }
    );
  }

  const jiraBaseUrl =
    jiraIntegration && typeof jiraIntegration.baseUrl === "string"
      ? jiraIntegration.baseUrl
      : null;
  const jiraEmail =
    jiraIntegration && typeof jiraIntegration.email === "string"
      ? jiraIntegration.email
      : null;
  const encryptedToken =
    jiraIntegration && typeof jiraIntegration.apiTokenEncrypted === "string"
      ? jiraIntegration.apiTokenEncrypted
      : null;

  let jiraApiToken: string | null = null;

  if (encryptedToken) {
    try {
      jiraApiToken = decryptSecret(encryptedToken);
    } catch {
      console.error("Unable to decrypt stored JIRA token", error);
      jiraApiToken = null;
    }
  } else if (
    jiraIntegration &&
    typeof jiraIntegration.apiToken === "string" &&
    jiraIntegration.apiToken.trim().length > 0
  ) {
    jiraApiToken = jiraIntegration.apiToken as string;
  }

  const acceptanceCriteria = Array.isArray(requirement.ai_acceptance_criteria)
    ? requirement.ai_acceptance_criteria.filter(
        (item): item is string => typeof item === "string"
      )
    : [];

  const issues = Array.isArray(requirement.ai_issues)
    ? requirement.ai_issues.filter((item): item is string => typeof item === "string")
    : [];

  const jiraPayload: JiraIssuePushInput = {
    projectKey: body.projectKey,
    issueType: body.issueType,
    summary: requirement.title ?? "Untitled requirement",
    description: requirement.description ?? "",
    acceptanceCriteria,
    issues,
    labels: body.labels,
  };

  const jiraAuth = {
    baseUrl: jiraBaseUrl ?? undefined,
    email: jiraEmail ?? undefined,
    apiToken: jiraApiToken ?? undefined,
  };

  const existingLinks = await listRequirementLinks(requirementId);
  const jiraLink = existingLinks.find(
    (link) => link.provider === "jira" && link.external_type === "issue"
  );

  const issueIdentifier =
    body.issueKey ?? jiraLink?.external_key ?? jiraLink?.external_id ?? null;

  const pushMode = issueIdentifier ? "update" : "create";

  try {
    const issue =
      pushMode === "create"
        ? await createJiraIssue(jiraPayload, { auth: jiraAuth })
        : await updateJiraIssue(
            issueIdentifier as string,
            {
              summary: jiraPayload.summary,
              description: jiraPayload.description,
              acceptanceCriteria: jiraPayload.acceptanceCriteria,
              issues: jiraPayload.issues,
              labels: jiraPayload.labels,
            },
            { auth: jiraAuth }
          );

    const metadata = {
      projectKey: body.projectKey,
      issueType: body.issueType,
      pushedAt: new Date().toISOString(),
      pushedBy: session.user.id,
      mode: pushMode,
      labels: body.labels ?? undefined,
    };

    const linkInput = {
      requirementId,
      projectId: requirement.project_id,
      provider: "jira",
      externalType: "issue",
      externalId: issue.id,
      externalKey: issue.key,
      summary: issue.summary,
      status: issue.status,
      url: issue.url,
      metadata,
      createdBy: session.user.id,
    };

    let linkResult = await createRequirementLink(linkInput);
    let linkRecord: RequirementLink | null = null;

    if (!linkResult.success) {
      if (linkResult.reason === "duplicate") {
        const updateResult = await updateRequirementLink({
          requirementId,
          projectId: requirement.project_id,
          provider: "jira",
          externalType: "issue",
          externalId: issue.id,
          externalKey: issue.key,
          summary: issue.summary,
          status: issue.status,
          url: issue.url,
          metadata,
          updatedBy: session.user.id,
        });

        if (!updateResult.success) {
          if (updateResult.reason === "not_found") {
            // Record vanished in between; try to insert again.
            linkResult = await createRequirementLink(linkInput);
            if (!linkResult.success) {
              return NextResponse.json(
                { error: "Unable to persist JIRA link" },
                { status: 500 }
              );
            }
            linkRecord = linkResult.link;
          } else {
            return NextResponse.json(
              { error: "Unable to persist JIRA link" },
              { status: 500 }
            );
          }
        } else {
          linkRecord = updateResult.link;
        }
      } else {
        return NextResponse.json(
          { error: "Unable to persist JIRA link" },
          { status: 500 }
        );
      }
    } else {
      linkRecord = linkResult.link;
    }

    if (!linkRecord) {
      return NextResponse.json(
        { error: "Unable to persist JIRA link" },
        { status: 500 }
      );
    }

    const responseStatus = pushMode === "create" ? 200 : 200;
    const message =
      pushMode === "create"
        ? `Issue ${issue.key} created successfully in JIRA`
        : `Issue ${issue.key} updated successfully in JIRA`;

    return NextResponse.json(
      {
        message,
        issue,
        link: mapLinkResponse(linkRecord),
      },
      { status: responseStatus }
    );
  } catch {
    if (error instanceof JiraRequestError) {
      const detailMessage =
        error.message && error.message.length > 0
          ? error.message
          : "JIRA request failed.";

      if (error.status >= 500) {
        console.warn("JIRA service error", {
          status: error.status,
          message: detailMessage,
        });
      }

      return NextResponse.json(
        {
          error: "JIRA request failed",
          details: detailMessage,
          status: error.status,
          retryable: error.status >= 500,
        },
        { status: error.status }
      );
    }

    const fallbackMessage =
      error instanceof Error && error.message
        ? error.message.slice(0, 500)
        : "Unknown error.";

    console.error("Failed to push requirement to JIRA", error);
    return NextResponse.json(
      {
        error: "Failed to push requirement to JIRA",
        details: fallbackMessage,
        status: 502,
        retryable: true,
      },
      { status: 502 }
    );
  }
};
