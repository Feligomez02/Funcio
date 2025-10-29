import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ImproveRequirement } from "@/components/requirements/improve-requirement";
import { EditRequirementModal } from "@/components/requirements/edit-requirement-modal";
import { ChangeLogModal } from "@/components/requirements/change-log-modal";
import {
  RequirementJiraIssues,
  type RequirementLinkInfo,
} from "@/components/requirements/jira-issues-section";
import {
  fetchJiraIssuesByProjectKey,
  type JiraIssueResult,
} from "@/lib/integrations/jira";
import { decryptSecret } from "@/lib/crypto";
import {
  buildRequirementMatchText,
  scoreJiraIssues,
} from "@/lib/integrations/jira-matching";
import { getSession, getProjectRole } from "@/lib/auth";
import { getProjectById } from "@/lib/data/projects";
import { getRequirementById } from "@/lib/data/requirements";
import { listRequirementHistory } from "@/lib/data/requirement-history";
import { listRequirementLinks } from "@/lib/data/requirement-links";

interface RequirementPageProps {
  params: Promise<{ requirementId: string }>;
}

const RequirementPage = async ({ params }: RequirementPageProps) => {
  const { requirementId } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const requirement = await getRequirementById(requirementId);

  if (!requirement) {
    notFound();
  }

  const role = await getProjectRole(requirement.project_id, session.user.id);

  if (!role) {
    redirect("/projects");
  }

  const project = await getProjectById(requirement.project_id);
  const canEdit = role === "analyst" || role === "admin";
  const [history, requirementLinks] = await Promise.all([
    listRequirementHistory(requirement.id),
    listRequirementLinks(requirement.id),
  ]);
  const integrations =
    project?.integrations &&
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
  const jiraBaseUrl =
    jiraIntegration && typeof jiraIntegration.baseUrl === "string"
      ? (jiraIntegration.baseUrl as string)
      : null;
  const jiraEmail =
    jiraIntegration && typeof jiraIntegration.email === "string"
      ? (jiraIntegration.email as string)
      : null;
  const encryptedJiraToken =
    jiraIntegration && typeof jiraIntegration.apiTokenEncrypted === "string"
      ? (jiraIntegration.apiTokenEncrypted as string)
      : null;

  let jiraApiToken: string | null = null;

  if (encryptedJiraToken) {
    try {
      jiraApiToken = decryptSecret(encryptedJiraToken);
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
  const emptyJiraResult: JiraIssueResult = {
    issues: [],
    error: undefined,
    cacheHit: false,
  };

  const jiraIssueResult = jiraProjectKey
    ? await fetchJiraIssuesByProjectKey(jiraProjectKey, {
        auth: {
          baseUrl: jiraBaseUrl ?? undefined,
          email: jiraEmail ?? undefined,
          apiToken: jiraApiToken ?? undefined,
        },
      })
    : emptyJiraResult;

  const jiraIssues = jiraIssueResult.issues;

  const acceptanceCriteria = Array.isArray(
    requirement.ai_acceptance_criteria
  )
    ? requirement.ai_acceptance_criteria.filter(
        (item): item is string => typeof item === "string"
      )
    : [];

  const issues = Array.isArray(requirement.ai_issues)
    ? requirement.ai_issues.filter((item): item is string => typeof item === "string")
    : [];

  const jiraAvailableProjectsRaw =
    jiraIntegration && Array.isArray((jiraIntegration as { availableProjects?: unknown }).availableProjects)
      ? ((
          jiraIntegration as {
            availableProjects: Array<{ key?: string; name?: string }>;
          }
        ).availableProjects)
      : [];

  const jiraAvailableProjects = jiraAvailableProjectsRaw
    .map((item) => {
      const key =
        typeof item?.key === "string" && item.key.trim().length > 0
          ? item.key.trim()
          : null;
      const name =
        typeof item?.name === "string" && item.name.trim().length > 0
          ? item.name.trim()
          : null;
      if (!key) {
        return null;
      }
      return {
        key,
        name: name ?? key,
      };
    })
    .filter((item): item is { key: string; name: string } => Boolean(item));

  const canPushToJira = (role === "analyst" || role === "admin") && Boolean(jiraProjectKey);

  const requirementMatchText = buildRequirementMatchText({
    title: requirement.title,
    description: requirement.description,
    userStory: requirement.ai_user_story,
    acceptanceCriteria,
    issues,
  });

  const scoredJiraIssues = scoreJiraIssues(jiraIssues, requirementMatchText);

  const normalizedLinks: RequirementLinkInfo[] = requirementLinks.map((link) => ({
    id: link.id,
    provider: link.provider,
    externalType: link.external_type,
    externalId: link.external_id,
    externalKey: link.external_key,
    summary: link.summary,
    status: link.status,
    url: link.url,
    createdAt: link.created_at,
  }));

  const initialAi =
    requirement.ai_user_story || acceptanceCriteria.length > 0 || issues.length > 0
      ? {
          improvedText: requirement.description,
          userStory: requirement.ai_user_story ?? "",
          acceptanceCriteria,
          issues,
          confidence: requirement.ai_confidence ?? undefined,
          tokensUsed: requirement.ai_tokens_used ?? undefined,
          provider: requirement.ai_provider ?? "unknown",
          language: requirement.ai_language ?? undefined,
          typeSuggestion: requirement.ai_type_suggestion ?? null,
          typeConfidence: requirement.ai_type_confidence ?? null,
          typeReason: requirement.ai_type_reason ?? null,
          typeChangeNote: null,
        }
      : null;

  return (
    <div className="space-y-10">
      <PageHeader
        backHref={`/projects/${project?.id ?? requirement.project_id}`}
        backLabel="Back to project"
        title={requirement.title}
        description={project?.name ?? "Project"}
        actions={
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {role}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Current requirement</h2>
            <div className="flex flex-wrap gap-2">
              <ChangeLogModal history={history} />
              {canEdit ? (
                <EditRequirementModal
                  projectId={requirement.project_id}
                  requirementId={requirement.id}
                  initialValues={{
                    title: requirement.title,
                    description: requirement.description,
                    type: requirement.type,
                    priority: requirement.priority,
                    status: requirement.status,
                    aiUserStory: requirement.ai_user_story,
                    aiAcceptanceCriteria: acceptanceCriteria,
                    aiIssues: issues,
                    aiTypeSuggestion: requirement.ai_type_suggestion,
                    aiTypeConfidence: requirement.ai_type_confidence,
                    aiTypeReason: requirement.ai_type_reason,
                  }}
                />
              ) : null}
            </div>
          </div>
          <dl className="mt-5 space-y-6 text-sm text-slate-700">
            <div className="space-y-2">
              <dt className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Description
              </dt>
              <dd className="leading-relaxed text-slate-800">{requirement.description}</dd>
            </div>
            <div className="space-y-2">
              <dt className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Summary
              </dt>
              <dd className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium capitalize text-slate-800">
                  {requirement.type ?? "functional"}
                </span>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-800">
                  Priority {requirement.priority ?? 3}
                </span>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-800">
                  Status {requirement.status ?? "analysis"}
                </span>
              </dd>
            </div>
            <div className="space-y-2">
              <dt className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Metadata
              </dt>
              <dd className="text-xs text-slate-500">
                Created {new Date(requirement.created_at ?? "").toLocaleString()} · Last updated {new Date(requirement.updated_at ?? "").toLocaleString()}
              </dd>
            </div>
            {requirement.ai_user_story ? (
              <div className="space-y-2">
                <dt className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  User story
                </dt>
                <dd className="text-sm text-slate-800">{requirement.ai_user_story}</dd>
              </div>
            ) : null}
            {acceptanceCriteria.length > 0 ? (
              <div className="space-y-2">
                <dt className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Acceptance criteria
                </dt>
                <dd>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
                    {acceptanceCriteria.map((criteria, index) => (
                      <li key={`${criteria}-${index}`}>{criteria}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            {issues.length > 0 ? (
              <div className="space-y-2">
                <dt className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Issues
                </dt>
                <dd>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
                    {issues.map((issue, index) => (
                      <li key={`${issue}-${index}`}>{issue}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            {requirement.ai_provider ? (
              <div className="space-y-2">
                <dt className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  AI metadata
                </dt>
                <dd className="text-xs text-slate-500">
                  Provider: {requirement.ai_provider}
                  {requirement.ai_language ? ` · Language: ${requirement.ai_language}` : ""}
                  {typeof requirement.ai_confidence === "number"
                    ? ` · Confidence: ${Math.round(Number(requirement.ai_confidence) * 100)}%`
                    : ""}
                  {typeof requirement.ai_tokens_used === "number"
                    ? ` · Tokens: ${requirement.ai_tokens_used}`
                    : ""}
                </dd>
              </div>
            ) : null}
            {jiraProjectKey ? (
              <RequirementJiraIssues
                requirementId={requirement.id}
                projectKey={jiraProjectKey}
                initialIssues={scoredJiraIssues}
                initialCacheHit={jiraIssueResult.cacheHit}
                initialError={jiraIssueResult.error}
                initialLinks={normalizedLinks}
                canManageLinks={role === "admin"}
                canPushToJira={canPushToJira}
                availableProjects={jiraAvailableProjects}
              />
            ) : null}
          </dl>
        </Card>
        <Card className="h-fit">
          <h2 className="text-lg font-semibold text-slate-900">Improve with AI</h2>
          <p className="mt-2 text-sm text-slate-600">
            Suggestions require manual review before adoption. Outputs exclude
            sensitive data and must be approved before saving.
          </p>
          <div className="mt-6">
            <ImproveRequirement
              projectId={requirement.project_id}
              requirementId={requirement.id}
              initialText={requirement.description}
              initialAi={initialAi}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RequirementPage;
