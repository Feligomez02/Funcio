import { NextResponse } from "next/server";
import {
  getProjectRole,
  requireAuthenticatedUser,
} from "@/lib/auth";
import {
  getDocumentById,
  listDocumentCandidates,
  listDocumentPages,
} from "@/lib/data/requirements";
import { getProjectById } from "@/lib/data/projects";
import { groupDuplicates } from "@/lib/requirements/dedupe";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { documentId } = await context.params;
    const user = await requireAuthenticatedUser();

    const document = await getDocumentById(documentId);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const role = await getProjectRole(document.project_id, user.id);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [pages, candidates, project] = await Promise.all([
      listDocumentPages(documentId),
      listDocumentCandidates(documentId),
      getProjectById(document.project_id),
    ]);

    const dedupeCandidates = candidates.filter((candidate) =>
      ["draft", "low_confidence"].includes(candidate.status),
    );
    const duplicates = groupDuplicates(
      dedupeCandidates.map((candidate) => ({
        id: candidate.id,
        text: candidate.text,
      })),
    );

    const jiraIntegration =
      project &&
      project.integrations &&
      typeof project.integrations === "object" &&
      !Array.isArray(project.integrations) &&
      project.integrations.jira &&
      typeof project.integrations.jira === "object" &&
      !Array.isArray(project.integrations.jira)
        ? (project.integrations.jira as Record<string, unknown>)
        : null;

    const jiraConfig = jiraIntegration
      ? {
          projectKey:
            typeof jiraIntegration.projectKey === "string"
              ? (jiraIntegration.projectKey as string)
              : null,
          issueType:
            typeof jiraIntegration.issueType === "string"
              ? (jiraIntegration.issueType as string)
              : null,
          availableProjects: Array.isArray(jiraIntegration.availableProjects)
            ? (jiraIntegration.availableProjects as Array<{
                key?: string;
                name?: string;
              }>)
            : [],
        }
      : null;

    return NextResponse.json({
      document,
      pages,
      candidates,
      duplicates,
      jira: jiraConfig,
    });
  } catch (error) {
    console.error("Document fetch error", error);
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
