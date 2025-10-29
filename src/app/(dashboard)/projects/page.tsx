import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectsOverview } from "@/components/projects/projects-overview";
import { getSession } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/data/projects";
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

const ProjectsPage = async () => {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);
  const projects = await listProjectsForUser(session.user.id);
  const roleLabels = dictionary.projectMembersCard.roles;
  const hasGlobalCredentials = Boolean(
    serverEnv.JIRA_BASE_URL &&
      serverEnv.JIRA_API_EMAIL &&
      serverEnv.JIRA_API_TOKEN
  );

  const projectSummaries = await Promise.all(
    projects.map(async (project) => {
      const requirements = await listRequirements(project.id);
      const statusCounts = requirements.reduce((counts, requirement) => {
        const statusKey = requirement.status ?? "unknown";
        counts[statusKey] = (counts[statusKey] ?? 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const jiraStatus = deriveJiraStatus(project.integrations, hasGlobalCredentials);

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        role: project.role,
        updatedAt: (project as { updated_at?: string | null }).updated_at ?? project.created_at,
        totalRequirements: requirements.length,
        statusCounts,
        recentRequirements: requirements.slice(0, 5).map((requirement) => ({
          id: requirement.id,
          title: requirement.title,
          status: requirement.status,
          updatedAt: requirement.updated_at,
        })),
        jira: {
          state: jiraStatus.state,
          message: jiraStatus.message,
          lastValidatedAt: jiraStatus.lastValidatedAt,
          tokenSource: jiraStatus.tokenSource,
        },
      };
    })
  );

  return (
    <div className="space-y-10">
      <PageHeader
        title={dictionary.projectsPage.headerTitle}
        description={dictionary.projectsPage.headerDescription}
        actions={null}
        showBack={false}
      />

      <ProjectsOverview
        projects={projectSummaries}
        dictionary={dictionary.projectsPage}
        roleLabels={roleLabels}
        statusLabels={dictionary.requirementForm.requirementStatuses}
      />
    </div>
  );
};

export default ProjectsPage;
