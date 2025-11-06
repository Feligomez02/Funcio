import { notFound, redirect } from "next/navigation";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { getSession, getProjectRole } from "@/lib/auth";
import { getProjectById } from "@/lib/data/projects";
import { listProjectMembers } from "@/lib/data/project-members";
import { listRequirements } from "@/lib/data/requirements";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { serverEnv } from "@/env";

type JiraConnectionState = "connected" | "expired" | "invalid";
type JiraTokenSource = "project" | "environment" | "missing";

const VALIDATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type JiraStatusMeta = {
  state: JiraConnectionState;
  message: string;
  lastValidatedAt: string | null;
  tokenSource: JiraTokenSource;
};

const deriveJiraStatus = (
  integrations: unknown,
  hasGlobalCredentials: boolean
): JiraStatusMeta => {
  if (!integrations || typeof integrations !== "object") {
    return {
      state: "invalid",
      message: "JIRA is not configured",
      lastValidatedAt: null,
      tokenSource: hasGlobalCredentials ? "environment" : "missing",
    };
  }

  const container = integrations as { jira?: unknown };
  const jira = container.jira;

  if (!jira || typeof jira !== "object" || Array.isArray(jira)) {
    return {
      state: "invalid",
      message: "JIRA is not configured",
      lastValidatedAt: null,
      tokenSource: hasGlobalCredentials ? "environment" : "missing",
    };
  }

  const record = jira as Record<string, unknown>;
  const projectKey =
    typeof record.projectKey === "string" && record.projectKey.trim().length > 0
      ? record.projectKey.trim()
      : null;
  const lastValidatedAt =
    typeof record.lastValidatedAt === "string" ? record.lastValidatedAt : null;
  const projectToken =
    (typeof record.apiTokenEncrypted === "string" &&
      record.apiTokenEncrypted.trim().length > 0) ||
    (typeof record.apiToken === "string" && record.apiToken.trim().length > 0);
  const lastValidationError =
    typeof record.lastValidationError === "string" &&
    record.lastValidationError.trim().length > 0
      ? record.lastValidationError.trim()
      : null;
  const tokenSource: JiraTokenSource = projectToken
    ? "project"
    : hasGlobalCredentials
    ? "environment"
    : "missing";

  if (!projectKey) {
    return {
      state: "invalid",
      message: "Missing project key",
      lastValidatedAt,
      tokenSource,
    };
  }

  if (tokenSource === "missing") {
    return {
      state: "invalid",
      message: "Credentials are missing",
      lastValidatedAt,
      tokenSource,
    };
  }

  if (!lastValidatedAt) {
    return {
      state: "invalid",
      message: "Validation pending",
      lastValidatedAt: null,
      tokenSource,
    };
  }

  if (lastValidationError) {
    return {
      state: "invalid",
      message: lastValidationError,
      lastValidatedAt,
      tokenSource,
    };
  }

  const parsed = new Date(lastValidatedAt);
  if (Number.isNaN(parsed.valueOf())) {
    return {
      state: "invalid",
      message: "Validation timestamp is invalid",
      lastValidatedAt: null,
      tokenSource,
    };
  }

  const ageMs = Date.now() - parsed.getTime();

  if (ageMs > VALIDATION_TTL_MS) {
    return {
      state: "expired",
      message: "Revalidate credentials",
      lastValidatedAt,
      tokenSource,
    };
  }

  return {
    state: "connected",
    message: "Connection active",
    lastValidatedAt,
    tokenSource,
  };
};

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

const ProjectPage = async ({ params }: ProjectPageProps) => {
  const { projectId } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);

  const [project, members] = await Promise.all([
    getProjectById(projectId),
    listProjectMembers(projectId),
  ] as const);

  if (!project) {
    notFound();
  }

  const role = await getProjectRole(projectId, session.user.id);

  if (!role) {
    redirect("/projects");
  }

  const requirements = await listRequirements(projectId);
  const canCreate = role === "analyst" || role === "admin";
  const roleLabel = dictionary.projectMembersCard.roles[role] ?? role;
  const hasGlobalCredentials = Boolean(
    serverEnv.JIRA_BASE_URL && serverEnv.JIRA_API_EMAIL && serverEnv.JIRA_API_TOKEN
  );

  const statusCounts = requirements.reduce<Record<string, number>>((counts, requirement) => {
    const key = requirement.status ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  const projectUpdatedAt =
    (project as { updated_at?: string | null }).updated_at ?? project.created_at;

  const projectSummary = {
    id: project.id,
    name: project.name,
    description: project.description,
    role,
    roleLabel,
    updatedAt: projectUpdatedAt,
    jira: deriveJiraStatus(
      project.integrations,
      hasGlobalCredentials
    ),
    totalRequirements: requirements.length,
    statusCounts,
  } as const;

  const normalizedRequirements = requirements.map((requirement) => {
    const acceptanceCriteria = Array.isArray(requirement.ai_acceptance_criteria)
      ? requirement.ai_acceptance_criteria.filter(
          (item): item is string => typeof item === "string"
        )
      : null;
    const issues = Array.isArray(requirement.ai_issues)
      ? requirement.ai_issues.filter((item): item is string => typeof item === "string")
      : null;

    return {
      id: requirement.id,
      title: requirement.title,
      description: requirement.description,
      type: requirement.type,
      priority: requirement.priority,
      status: requirement.status,
      updatedAt: requirement.updated_at,
      aiUserStory: requirement.ai_user_story,
      aiAcceptanceCriteria: acceptanceCriteria,
      aiIssues: issues,
    };
  });

  const rawIntegration =
    project.integrations &&
    typeof project.integrations === "object" &&
    !Array.isArray(project.integrations) &&
    typeof (project.integrations as { jira?: unknown }).jira === "object" &&
    (project.integrations as { jira?: unknown }).jira !== null
      ? ((project.integrations as { jira?: unknown }).jira as Record<string, unknown>)
      : null;

  const integrations = {
    initialJiraProjectKey:
      rawIntegration && typeof rawIntegration.projectKey === "string"
        ? (rawIntegration.projectKey as string)
        : null,
    initialJiraBaseUrl:
      rawIntegration && typeof rawIntegration.baseUrl === "string"
        ? (rawIntegration.baseUrl as string)
        : null,
    initialJiraEmail:
      rawIntegration && typeof rawIntegration.email === "string"
        ? (rawIntegration.email as string)
        : null,
    initialJiraProjects:
      rawIntegration && Array.isArray(rawIntegration.availableProjects)
        ? (rawIntegration.availableProjects as Array<{ key?: string; name?: string }>).filter(
            (item): item is { key: string; name: string } =>
              Boolean(item?.key) && Boolean(item?.name)
          )
        : [],
    jiraTokenConfigured: Boolean(
      rawIntegration &&
        ((typeof rawIntegration.apiTokenEncrypted === "string" &&
          rawIntegration.apiTokenEncrypted.trim().length > 0) ||
          (typeof rawIntegration.apiToken === "string" &&
            rawIntegration.apiToken.trim().length > 0))
    ),
    lastValidatedAt:
      rawIntegration && typeof rawIntegration.lastValidatedAt === "string"
        ? (rawIntegration.lastValidatedAt as string)
        : null,
  };

  return (
    <div className="space-y-10">
      
      <ProjectWorkspace
        project={projectSummary}
        requirements={normalizedRequirements}
        members={members}
        canCreateRequirements={canCreate}
        canManageMembers={role === "admin"}
        canManageIntegrations={role === "admin"}
        canManageRequirementLinks={role === "admin"}
        canImportFromPdf={role === "admin"}
        dictionary={dictionary.projectPage}
        requirementFormCopy={dictionary.requirementForm}
        projectMembersCopy={dictionary.projectMembersCard}
        locale={locale}
        integrations={integrations}
      />
    </div>
  );
};

export default ProjectPage;
