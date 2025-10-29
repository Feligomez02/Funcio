import { NextResponse } from "next/server";
import { getSession, getProjectRole } from "@/lib/auth";
import { getRequirementById } from "@/lib/data/requirements";
import { getProjectById } from "@/lib/data/projects";
import { decryptSecret } from "@/lib/crypto";
import { fetchJiraIssuesByProjectKey } from "@/lib/integrations/jira";
import {
  buildRequirementMatchText,
  scoreJiraIssues,
} from "@/lib/integrations/jira-matching";

export const GET = async (
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

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await getProjectById(requirement.project_id);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

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

  const jiraProjectKey =
    jiraIntegration && typeof jiraIntegration.projectKey === "string"
      ? (jiraIntegration.projectKey as string)
      : null;

  if (!jiraProjectKey) {
    return NextResponse.json({ issues: [], cacheHit: false, error: null });
  }

  const jiraBaseUrl =
    jiraIntegration && typeof jiraIntegration.baseUrl === "string"
      ? (jiraIntegration.baseUrl as string)
      : null;
  const jiraEmail =
    jiraIntegration && typeof jiraIntegration.email === "string"
      ? (jiraIntegration.email as string)
      : null;
  const encryptedToken =
    jiraIntegration && typeof jiraIntegration.apiTokenEncrypted === "string"
      ? (jiraIntegration.apiTokenEncrypted as string)
      : null;

  let jiraApiToken: string | null = null;

  if (encryptedToken) {
    try {
      jiraApiToken = decryptSecret(encryptedToken);
    } catch (error) {
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

  const jiraResult = await fetchJiraIssuesByProjectKey(jiraProjectKey, {
    auth: {
      baseUrl: jiraBaseUrl ?? undefined,
      email: jiraEmail ?? undefined,
      apiToken: jiraApiToken ?? undefined,
    },
  });

  const acceptanceCriteria = Array.isArray(requirement.ai_acceptance_criteria)
    ? requirement.ai_acceptance_criteria.filter(
        (item): item is string => typeof item === "string"
      )
    : [];

  const issues = Array.isArray(requirement.ai_issues)
    ? requirement.ai_issues.filter((item): item is string => typeof item === "string")
    : [];

  const matchText = buildRequirementMatchText({
    title: requirement.title,
    description: requirement.description,
    userStory: requirement.ai_user_story,
    acceptanceCriteria,
    issues,
  });

  const scoredIssues = scoreJiraIssues(jiraResult.issues, matchText);

  return NextResponse.json({
    issues: scoredIssues,
    cacheHit: jiraResult.cacheHit,
    error: jiraResult.error ?? null,
  });
};
