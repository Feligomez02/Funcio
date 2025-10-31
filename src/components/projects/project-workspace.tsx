"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import {
  RequirementsBoard,
  STATUS_COLOR_CLASSES,
} from "@/components/projects/requirements-board";
import { CreateRequirementForm } from "@/components/requirements/create-requirement-form";
import { EditRequirementForm } from "@/components/requirements/edit-requirement-form";
import { ProjectMembersCard } from "@/components/projects/project-members-card";
import { ProjectIntegrationsCard } from "@/components/projects/project-integrations-card";
import { ProjectOverflowMenu } from "@/components/projects/project-overflow-menu";
import { RequirementJiraDrawerSection } from "@/components/requirements/requirement-jira-drawer-section";
import { RequirementsImportCard } from "@/components/requirements/import-from-pdf-card";
import { RequirementCandidatesPanel } from "@/components/requirements/requirement-candidates-panel";
import type { ProjectMemberSummary } from "@/lib/data/project-members";
import type {
  ProjectMembersCardDictionary,
  ProjectPageDictionary,
  RequirementFormDictionary,
} from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import {
  REQUIREMENT_STATUS_VALUES,
  type RequirementStatusValue,
} from "@/components/requirements/options";
import { PageHeader } from "@/components/layout/page-header";

type RequirementRecord = {
  id: string;
  title: string;
  description: string;
  type: string | null;
  priority: number | null;
  status: string | null;
  updatedAt: string | null;
  aiUserStory: string | null;
  aiAcceptanceCriteria: string[] | null;
  aiIssues: string[] | null;
};

type JiraMeta = {
  state: "connected" | "expired" | "invalid";
  message: string;
  lastValidatedAt: string | null;
  tokenSource: "project" | "environment" | "missing";
};

type ProjectSummary = {
  id: string;
  name: string | null;
  description: string | null;
  role: string;
  roleLabel: string | null;
  updatedAt: string | null;
  jira: JiraMeta;
  totalRequirements: number;
  statusCounts: Record<string, number>;
};

type ProjectWorkspaceProps = {
  project: ProjectSummary;
  requirements: RequirementRecord[];
  members: ProjectMemberSummary[];
  canCreateRequirements: boolean;
  canManageMembers: boolean;
  canManageIntegrations: boolean;
  canManageRequirementLinks: boolean;
  canImportFromPdf: boolean;
  dictionary: ProjectPageDictionary;
  requirementFormCopy: RequirementFormDictionary;
  projectMembersCopy: ProjectMembersCardDictionary;
  locale: Locale;
  integrations: {
    initialJiraProjectKey: string | null;
    initialJiraBaseUrl: string | null;
    initialJiraEmail: string | null;
    initialJiraProjects: Array<{ key: string; name: string }>;
    jiraTokenConfigured: boolean;
    lastValidatedAt: string | null;
  };
};

type DrawerState =
  | { mode: "create"; initialStatus: RequirementStatusValue | null }
  | { mode: "edit"; requirementId: string }
  | null;

const formatDateTime = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed.toLocaleString();
};

export const ProjectWorkspace = ({
  project,
  requirements,
  members,
  canCreateRequirements,
  canManageMembers,
  canManageIntegrations,
  canManageRequirementLinks,
  canImportFromPdf,
  dictionary,
  requirementFormCopy,
  projectMembersCopy,
  locale,
  integrations,
}: ProjectWorkspaceProps) => {
  const router = useRouter();
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [boardRequirements, setBoardRequirements] =
    useState<RequirementRecord[]>(requirements);

  useEffect(() => {
    setBoardRequirements(requirements);
  }, [requirements]);

  const statusMap = useMemo(
    () =>
      REQUIREMENT_STATUS_VALUES.map((value) => ({
        id: value,
        label: requirementFormCopy.requirementStatuses[value] ?? value,
      })),
    [requirementFormCopy.requirementStatuses]
  );

  const derivedStatusCounts = useMemo(() => {
    return boardRequirements.reduce<Record<string, number>>((counts, requirement) => {
      const key = requirement.status ?? "unassigned";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }, [boardRequirements]);

  const metricEntries = useMemo(() => {
    return statusMap.map((status) => ({
      id: status.id,
      label: status.label,
      count: derivedStatusCounts[status.id] ?? 0,
    }));
  }, [derivedStatusCounts, statusMap]);

  const credentialsSourceLabel =
    dictionary.header.sources?.[project.jira.tokenSource] ?? project.jira.tokenSource;
  const connectionStateLabel =
    dictionary.header.connectionStates?.[project.jira.state] ?? project.jira.state;
  const connectionBadgeClass =
    {
      connected: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      expired: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      invalid: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
    }[project.jira.state] ?? "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  const connectionMessage =
    dictionary.header.connectionStates?.[project.jira.state] ?? project.jira.message;

  const selectedRequirement =
    drawerState && drawerState.mode === "edit"
      ? boardRequirements.find((item) => item.id === drawerState.requirementId) ?? null
      : null;

  const closeDrawer = () => setDrawerState(null);

  const handleRequirementMove = async (
    requirementId: string,
    fromStatus: string | null,
    toStatus: string | null
  ) => {
    if (!canCreateRequirements || fromStatus === toStatus) {
      return;
    }

    const snapshot = boardRequirements.map((item) => ({ ...item }));

    setBoardRequirements((prev) =>
      prev.map((item) =>
        item.id === requirementId ? { ...item, status: toStatus } : item
      )
    );

    const response = await fetch(`/api/requirements/${requirementId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: project.id,
        status: toStatus,
      }),
    });

    if (!response.ok) {
      console.error("Unable to update requirement status from drag-and-drop");
      setBoardRequirements(snapshot);
      return;
    }

    router.refresh();
  };

  const handleViewRequirement = (requirementId: string) => {
    router.push(`/requirements/${requirementId}`);
  };
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-12">
      <PageHeader
        title={project.name ?? "Untitled project"}
        description={project.description ?? dictionary.defaultDescription}
        backHref="/projects"
        backLabel="Volver a proyectos"
        actions={
          <div className="flex items-center gap-2">
            {project.roleLabel ? (
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {dictionary.header.roleLabel}: {project.roleLabel}
              </span>
            ) : null}
            <ProjectOverflowMenu
              projectId={project.id}
              name={project.name}
              description={project.description}
              canEdit={project.role === "admin"}
              copy={dictionary.menu}
              onUpdated={() => router.refresh()}
              onDeleted={() => {
                router.push("/projects");
                router.refresh();
              }}
            />
          </div>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <Card className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() =>
                setDrawerState({
                  mode: "create",
                  initialStatus: "analysis",
                })
              }
              disabled={!canCreateRequirements}
            >
              {dictionary.actions.newRequirement}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsMembersOpen(true)}
              disabled={!canManageMembers}
            >
              {dictionary.actions.inviteMember}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsIntegrationsOpen(true)}
              disabled={!canManageIntegrations}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              {dictionary.actions.manageIntegrations}
            </Button>
          </div>

          <div className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {dictionary.metrics.title}
            </span>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricEntries.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {metric.count}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {dictionary.header.jiraStatusLabel}
                </p>
                <p className="text-sm text-slate-600">{connectionMessage}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${connectionBadgeClass}`}
              >
                {connectionStateLabel}
              </span>
            </div>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>
                {dictionary.header.sourceLabel}: {credentialsSourceLabel}
              </li>
              <li>
                {dictionary.header.lastValidatedLabel.replace(
                  "{value}",
                  formatDateTime(project.jira.lastValidatedAt) ?? "--",
                )}
              </li>
            </ul>
          </Card>

          <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <p className="text-base font-semibold text-slate-900">
              Flujo de trabajo recomendado
            </p>
            <p>
              Importa documentos, revisa los candidatos sugeridos y promueve solo
              aquellos que aporten valor al backlog. Usa el tablero para coordinar
              el estado y sincronizarlos con Jira.
            </p>
            <p className="text-xs text-slate-500">
              Consejo: mantén los documentos cortos para acelerar las iteraciones de OCR.
            </p>
          </Card>
        </div>
      </section>

      {canImportFromPdf ? (
        <section className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <RequirementsImportCard
              projectId={project.id}
              projectName={project.name}
            />
            <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              <p className="text-base font-semibold text-slate-900">
                Pipeline de candidatos
              </p>
              <p>
                Cada documento importado crea un conjunto de requerimientos preliminares.
                Revísalos y edítalos antes de integrarlos al tablero principal.
              </p>
              <p className="text-xs text-slate-500">
                Una vez aprobados, los verás a continuación listos para su promoción o push a Jira.
              </p>
            </Card>
          </div>
          <RequirementCandidatesPanel projectId={project.id} />
        </section>
      ) : (
        <RequirementCandidatesPanel projectId={project.id} />
      )}

      <section id="requirements-board" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {dictionary.board.title}
          </h2>
          {requirements.length === 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setDrawerState({
                  mode: "create",
                  initialStatus: "analysis",
                })
              }
              disabled={!canCreateRequirements}
            >
              {dictionary.actions.newRequirement}
            </Button>
          ) : null}
        </div>

        {boardRequirements.length === 0 ? (
          <Card className="p-10 text-center text-sm text-slate-500">
            {dictionary.board.empty}
          </Card>
        ) : (
          <RequirementsBoard
            statuses={statusMap}
            requirements={boardRequirements.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              status: item.status,
              priority: item.priority,
              updatedAt: item.updatedAt,
            }))}
            unassignedTitle={dictionary.board.unassignedTitle}
            emptyColumnLabel={dictionary.board.columnEmpty}
            addRequirementLabel={dictionary.board.addRequirement}
            openRequirementLabel={dictionary.board.openRequirement}
            onCreateRequirement={(status) =>
              setDrawerState({
                mode: "create",
                initialStatus: (status as RequirementStatusValue) ?? "analysis",
              })
            }
            onOpenRequirement={(requirementId) => router.push(`/requirements/${requirementId}`)}
            onViewRequirement={handleViewRequirement}
            onMoveRequirement={handleRequirementMove}
            canReorder={canCreateRequirements}
          />
        )}
      </section>

      <Modal
        open={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        title={dictionary.actions.inviteMember}
      >
        <ProjectMembersCard
          projectId={project.id}
          members={members}
          canInvite={canManageMembers}
          locale={locale}
          copy={projectMembersCopy}
        />
      </Modal>

      <Modal
        open={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
        title={dictionary.actions.manageIntegrations}
      >
        <ProjectIntegrationsCard
          projectId={project.id}
          initialJiraProjectKey={integrations.initialJiraProjectKey}
          initialJiraBaseUrl={integrations.initialJiraBaseUrl}
          initialJiraEmail={integrations.initialJiraEmail}
          initialJiraProjects={integrations.initialJiraProjects}
          jiraTokenConfigured={integrations.jiraTokenConfigured}
          lastValidatedAt={integrations.lastValidatedAt}
          canEdit={canManageIntegrations}
        />
      </Modal>

      <Drawer
        open={Boolean(drawerState)}
        onClose={closeDrawer}
        title={
          drawerState?.mode === "edit"
            ? dictionary.drawer.editTitle
            : dictionary.drawer.createTitle
        }
      >
        {drawerState?.mode === "edit" && selectedRequirement ? (
          <div className="space-y-6">
            <EditRequirementForm
              projectId={project.id}
              requirementId={selectedRequirement.id}
              initialValues={{
                title: selectedRequirement.title,
                description: selectedRequirement.description,
                type: selectedRequirement.type,
                priority: selectedRequirement.priority,
                status: selectedRequirement.status,
                aiUserStory: selectedRequirement.aiUserStory,
                aiAcceptanceCriteria: selectedRequirement.aiAcceptanceCriteria,
                aiIssues: selectedRequirement.aiIssues,
              }}
              disabled={!canCreateRequirements}
              onSuccess={() => {
                closeDrawer();
                router.refresh();
              }}
            />
            {integrations.initialJiraProjectKey ? (
              <RequirementJiraDrawerSection
                requirementId={selectedRequirement.id}
                projectKey={integrations.initialJiraProjectKey}
                canManageLinks={canManageRequirementLinks}
              />
            ) : (
              <Card className="border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                Configure a JIRA integration to link this requirement with issues.
              </Card>
            )}
          </div>
        ) : null}

        {drawerState?.mode === "create" ? (
          <CreateRequirementForm
            projectId={project.id}
            disabled={!canCreateRequirements}
            initialStatus={(drawerState.initialStatus ?? "analysis") as RequirementStatusValue}
            onSuccess={() => {
              closeDrawer();
              router.refresh();
            }}
          />
        ) : null}
      </Drawer>
    </div>
  );
};
