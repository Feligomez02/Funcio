"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/dialog";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { STATUS_COLOR_CLASSES } from "@/components/projects/requirements-board";
import type {
  ProjectMembersCardDictionary,
  ProjectsPageDictionary,
  RequirementFormDictionary,
} from "@/lib/i18n/types";

type RequirementSummary = {
  id: string;
  title: string;
  status: string | null;
  updatedAt: string | null;
};

type ProjectSummary = {
  id: string;
  name: string | null;
  description: string | null;
  role: string;
  updatedAt: string | null;
  totalRequirements: number;
  statusCounts: Record<string, number>;
  recentRequirements: RequirementSummary[];
  jira: {
    state: "connected" | "expired" | "invalid";
    message: string;
    lastValidatedAt: string | null;
    tokenSource: "project" | "environment" | "missing";
  };
};

type ProjectsOverviewProps = {
  projects: ProjectSummary[];
  dictionary: ProjectsPageDictionary;
  roleLabels: ProjectMembersCardDictionary["roles"];
  statusLabels: RequirementFormDictionary["requirementStatuses"];
};

const STATUS_BADGE_CLASSES: Record<ProjectSummary["jira"]["state"], string> = {
  connected: "bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-200",
  expired: "bg-amber-600/10 text-amber-700 ring-1 ring-amber-200",
  invalid: "bg-rose-600/10 text-rose-700 ring-1 ring-rose-200",
};

const FALLBACK_STATUS_TONE = {
  border: "border-slate-200",
  background: "bg-slate-100",
  badge: "bg-slate-200 text-slate-700",
};

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

export const ProjectsOverview = ({
  projects,
  dictionary,
  roleLabels,
  statusLabels,
}: ProjectsOverviewProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projects[0]?.id ?? null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!query.trim()) {
      return projects;
    }

    const term = query.trim().toLowerCase();
    return projects.filter((project) => {
      const name = (project.name ?? "").toLowerCase();
      const description = (project.description ?? "").toLowerCase();
      return name.includes(term) || description.includes(term);
    });
  }, [projects, query]);

  const selectedProject = useMemo(() => {
    if (filteredProjects.length === 0) {
      return null;
    }

    if (selectedProjectId) {
      const match = filteredProjects.find((project) => project.id === selectedProjectId);
      if (match) {
        return match;
      }
    }

    return filteredProjects[0];
  }, [filteredProjects, selectedProjectId]);

  const activeProjectId = selectedProject?.id ?? null;

  const sidebarCopy = dictionary.sidebar;
  const overviewCopy = dictionary.overview;
  const projectCountLabel =
    projects.length === 1
      ? sidebarCopy.countLabel.singular
      : sidebarCopy.countLabel.plural;

  const statusBreakdown = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    return Object.entries(selectedProject.statusCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [selectedProject]);

  const handleOpenProject = () => {
    if (!selectedProject) {
      return;
    }
    router.push(`/projects/${selectedProject.id}`);
  };

  const handleNewRequirement = () => {
    if (!selectedProject) {
      return;
    }
    router.push(`/projects/${selectedProject.id}#requirements`);
  };

  const handleViewAllRequirements = () => {
    if (!selectedProject) {
      return;
    }
    router.push(`/projects/${selectedProject.id}#requirements`);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside>
        <Card className="space-y-4 border border-slate-200 bg-white/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">
                  {sidebarCopy.title}
                </h2>
              <p className="text-xs text-slate-400">
                {projects.length} {projectCountLabel}
              </p>
            </div>
            <Button
              type="button"
              variant="tertiary"
              className="rounded-full px-3 py-2 text-xs font-semibold"
              onClick={() => setIsModalOpen(true)}
            >
              + {sidebarCopy.newProject}
            </Button>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={sidebarCopy.searchPlaceholder}
            className="text-sm"
          />
          {filteredProjects.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-sm text-slate-600">
              {sidebarCopy.empty}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredProjects.map((project) => {
                const isSelected = project.id === activeProjectId;
                const roleLabel =
                  roleLabels[project.role as keyof typeof roleLabels] ?? project.role;

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border border-black bg-black text-white shadow-lg shadow-slate-600/20"
                          : "border border-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate text-sm font-semibold">
                        {project.name ?? dictionary.card.titleFallback}
                      </span>
                      <span
                        className={`mt-1 text-xs ${
                        isSelected ? "text-white/80" : "text-slate-400"
                      }`}
                    >
                      {roleLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </aside>

      <section className="space-y-6">
        {!selectedProject ? (
          <Card className="flex h-full flex-col items-center justify-center gap-3 p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              {overviewCopy.noProjectTitle}
            </h3>
            <p className="max-w-md text-sm text-slate-600">
              {overviewCopy.noProjectDescription}
            </p>
            <Button type="button" onClick={() => setIsModalOpen(true)}>
              {sidebarCopy.newProject}
            </Button>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {selectedProject.name ?? dictionary.card.titleFallback}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  {selectedProject.description ?? overviewCopy.descriptionFallback}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {overviewCopy.roleLabel}:{" "}
                  {roleLabels[
                    selectedProject.role as keyof ProjectMembersCardDictionary["roles"]
                  ] ?? selectedProject.role}
                </span>
                {selectedProject.updatedAt ? (
                  <span className="text-xs text-slate-400">
                    {overviewCopy.updatedLabel.replace(
                      "{value}",
                      formatDateTime(selectedProject.updatedAt) ?? "—"
                    )}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handleNewRequirement}>
                {overviewCopy.actions.newRequirement}
              </Button>
              <Button type="button" variant="secondary" onClick={handleOpenProject}>
                {overviewCopy.actions.openProject}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-slate-700 hover:text-slate-900"
                onClick={handleViewAllRequirements}
              >
                {overviewCopy.actions.viewAllRequirements}
              </Button>
            </div>

            <Card className="space-y-4 border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {overviewCopy.credentialsLabel}
                  </h3>
                  <p className="text-sm text-slate-700">
                    {selectedProject.jira.message}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[selectedProject.jira.state]}`}
                >
                  {overviewCopy.connectionStates[selectedProject.jira.state] ??
                    selectedProject.jira.state}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  Source:{" "}
                  {overviewCopy.credentialSources[
                    selectedProject.jira.tokenSource
                  ] ?? selectedProject.jira.tokenSource}
                </span>
                <span>
                  {overviewCopy.lastValidatedLabel.replace(
                    "{value}",
                    formatDateTime(selectedProject.jira.lastValidatedAt) ?? "—"
                  )}
                </span>
              </div>
            </Card>

            <Card className="space-y-4 border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {overviewCopy.metricsTitle}
                </h3>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
                  {selectedProject.totalRequirements}
                </span>
              </div>

              {selectedProject.totalRequirements === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                  {overviewCopy.metricsEmpty}
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-600">
                  {statusBreakdown.map(([status, count]) => {
                    const tone =
                      STATUS_COLOR_CLASSES[
                        status as keyof typeof STATUS_COLOR_CLASSES
                      ] ?? FALLBACK_STATUS_TONE;
                    const label =
                      statusLabels[
                        status as keyof RequirementFormDictionary["requirementStatuses"]
                      ] ?? status;
                    return (
                      <li
                        key={status}
                        className={`flex items-center justify-between rounded-lg border px-4 py-2 ${tone.border} ${tone.background}`}
                      >
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${tone.badge}`}
                        >
                          {label}
                        </span>
                        <span className="text-base font-semibold text-slate-900">
                          {count}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {overviewCopy.recentRequirementsTitle}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-2 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
                  onClick={handleViewAllRequirements}
                >
                  {overviewCopy.actions.viewAllRequirements}
                </Button>
              </div>
              {selectedProject.recentRequirements.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                  {overviewCopy.recentRequirementsEmpty}
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {selectedProject.recentRequirements.slice(0, 5).map((requirement) => (
                    <li key={requirement.id} className="space-y-1">
                      <Link
                        href={`/requirements/${requirement.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {requirement.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-wide ${
                            STATUS_COLOR_CLASSES[
                              (requirement.status ??
                                "") as keyof typeof STATUS_COLOR_CLASSES
                            ]?.badge ?? FALLBACK_STATUS_TONE.badge
                          }`}
                        >
                          {statusLabels[
                            requirement.status as keyof RequirementFormDictionary["requirementStatuses"]
                          ] ?? requirement.status ?? "—"}
                        </span>
                        {requirement.updatedAt ? (
                          <span>{formatDateTime(requirement.updatedAt)}</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </section>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={dictionary.newProjectCard.title}
        description={dictionary.newProjectCard.description}
      >
        <CreateProjectForm
          onSuccess={() => {
            setIsModalOpen(false);
            setQuery("");
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
};
