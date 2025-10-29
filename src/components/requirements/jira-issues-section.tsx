"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type JiraIssueWithScore = {
  id: string;
  key: string;
  summary: string;
  status: string;
  url: string;
  matchScore: number;
};

export type RequirementLinkInfo = {
  id: string;
  provider: string;
  externalType: string;
  externalId: string;
  externalKey: string | null;
  summary: string | null;
  status: string | null;
  url: string | null;
  createdAt: string | null;
};

export type RequirementJiraIssuesProps = {
  requirementId: string;
  projectKey: string;
  initialIssues: JiraIssueWithScore[];
  initialCacheHit: boolean;
  initialLinks: RequirementLinkInfo[];
  canManageLinks: boolean;
  canPushToJira?: boolean;
  availableProjects?: Array<{ key: string; name: string }>;
  initialError?: string | null;
};

const SUGGESTION_THRESHOLD = 0.25;
const ISSUE_TYPE_PRESETS = ["Story", "Task", "Bug", "Epic"];

const sortLinks = (items: RequirementLinkInfo[]) =>
  [...items].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).valueOf() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).valueOf() : 0;
    return bTime - aTime;
  });

const formatMatchPercentage = (score: number) => `${Math.round(score * 100)}% match`;

const resolveLinkDisplayKey = (link: RequirementLinkInfo) =>
  link.externalKey && link.externalKey.length > 0 ? link.externalKey : link.externalId;

export const RequirementJiraIssues = ({
  requirementId,
  projectKey,
  initialIssues,
  initialCacheHit,
  initialLinks,
  canManageLinks,
  canPushToJira,
  availableProjects,
  initialError,
}: RequirementJiraIssuesProps) => {
  const [issues, setIssues] = useState<JiraIssueWithScore[]>(initialIssues);
  const [links, setLinks] = useState<RequirementLinkInfo[]>(() => sortLinks(initialLinks));
  const [cacheHit, setCacheHit] = useState(initialCacheHit);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLinkingIssueId, setIsLinkingIssueId] = useState<string | null>(null);
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [selectedProjectKey, setSelectedProjectKey] = useState(projectKey);
  const [issueType, setIssueType] = useState("Story");
  const [isPushing, setIsPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const allowPush = Boolean(canPushToJira);

  const linkedIssueTokens = useMemo(() => {
    const tokens = new Set<string>();
    links.forEach((link) => {
      if (link.externalId) {
        tokens.add(link.externalId);
      }
      if (link.externalKey) {
        tokens.add(link.externalKey);
      }
    });
    return tokens;
  }, [links]);

  const suggestedIssue =
    issues.find((issue) => issue.matchScore >= SUGGESTION_THRESHOLD) ?? null;
  const remainingIssues = suggestedIssue
    ? issues.filter((issue) => issue.id !== suggestedIssue.id)
    : issues;

  const isIssueLinked = (issue: JiraIssueWithScore) =>
    linkedIssueTokens.has(issue.id) || linkedIssueTokens.has(issue.key);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();

    if (Array.isArray(availableProjects)) {
      availableProjects.forEach((project) => {
        if (project?.key) {
          map.set(project.key, project.name ?? project.key);
        }
      });
    }

    if (projectKey && !map.has(projectKey)) {
      map.set(projectKey, projectKey);
    }

    return Array.from(map.entries()).map(([key, name]) => ({ key, name }));
  }, [availableProjects, projectKey]);

  const existingJiraLink = useMemo(
    () =>
      links.find(
        (link) => link.provider === "jira" && link.externalType === "issue"
      ) ?? null,
    [links]
  );

  const upsertLink = (next: RequirementLinkInfo) => {
    setLinks((prev) => {
      const filtered = prev.filter((link) => link.id !== next.id);
      filtered.push(next);
      return sortLinks(filtered);
    });
  };

  const removeLink = (linkId: string) => {
    setLinks((prev) => prev.filter((link) => link.id !== linkId));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`/api/requirements/${requirementId}/jira/issues`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof body.error === "string" && body.error.length > 0
            ? body.error
            : "Unable to refresh issues";
        throw new Error(message);
      }

      const nextIssues = Array.isArray(body.issues)
        ? (body.issues as Array<JiraIssueWithScore>)
        : [];

      setIssues(nextIssues);
      setCacheHit(Boolean(body.cacheHit));
      setError(
        typeof body.error === "string" && body.error.length > 0 ? body.error : null
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to refresh issues");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLinkIssue = async (issue: JiraIssueWithScore) => {
    if (!canManageLinks || isIssueLinked(issue)) {
      return;
    }

    setIsLinkingIssueId(issue.id);
    setLinkError(null);
    setLinkMessage(null);

    try {
      const response = await fetch(`/api/requirements/${requirementId}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "jira",
          externalType: "issue",
          externalId: issue.id,
          externalKey: issue.key,
          summary: issue.summary,
          status: issue.status,
          url: issue.url,
          metadata: issue.matchScore > 0 ? { matchScore: issue.matchScore } : undefined,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof body.error === "string" && body.error.length > 0
            ? body.error
            : "Unable to create link";
        throw new Error(message);
      }

      const linkPayload =
        body.link && typeof body.link === "object"
          ? (body.link as RequirementLinkInfo)
          : null;

      if (!linkPayload) {
        throw new Error("Link payload is missing from the server response");
      }

      upsertLink(linkPayload);
      setLinkMessage(`Linked ${resolveLinkDisplayKey(linkPayload)}`);
    } catch (caught) {
      setLinkError(caught instanceof Error ? caught.message : "Unable to create link");
    } finally {
      setIsLinkingIssueId(null);
    }
  };

  const handleRemoveLink = async (link: RequirementLinkInfo) => {
    if (!canManageLinks) {
      return;
    }

    setRemovingLinkId(link.id);
    setLinkError(null);
    setLinkMessage(null);

    try {
      const response = await fetch(
        `/api/requirements/${requirementId}/links/${link.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const message =
          typeof body.error === "string" && body.error.length > 0
            ? body.error
            : "Unable to remove link";
        throw new Error(message);
      }

      removeLink(link.id);
      setLinkMessage(`Removed ${resolveLinkDisplayKey(link)}`);
    } catch (caught) {
      setLinkError(caught instanceof Error ? caught.message : "Unable to remove link");
    } finally {
      setRemovingLinkId(null);
    }
  };

  const handleOpenPushModal = () => {
    if (!allowPush) {
      return;
    }
    setSelectedProjectKey((prev) => prev || projectKey);
    setIssueType(existingJiraLink ? "Task" : "Story");
    setPushError(null);
    setLinkError(null);
    setIsPushModalOpen(true);
  };

  const handleClosePushModal = () => {
    setIsPushModalOpen(false);
    setPushError(null);
  };

  const handlePushToJira = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const fallbackProjectKey =
      selectedProjectKey || projectOptions[0]?.key || projectKey || "";
    const normalizedProjectKey = fallbackProjectKey.trim();
    const normalizedIssueType = issueType.trim();

    if (!normalizedProjectKey || !normalizedIssueType) {
      setPushError("Project and issue type are required.");
      return;
    }

    setIsPushing(true);
    setPushError(null);
    setLinkError(null);

    try {
      const response = await fetch(
        `/api/requirements/${requirementId}/jira/push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectKey: normalizedProjectKey,
            issueType: normalizedIssueType,
            issueKey:
              existingJiraLink?.externalKey ?? existingJiraLink?.externalId ?? undefined,
          }),
        }
      );

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof body.error === "string" && body.error.length > 0
            ? body.error
            : "Unable to push requirement to JIRA";
        throw new Error(message);
      }

      const linkPayload =
        body.link && typeof body.link === "object"
          ? (body.link as RequirementLinkInfo)
          : null;

      if (linkPayload) {
        upsertLink(linkPayload);
      }

      const successMessage =
        typeof body.message === "string" && body.message.length > 0
          ? body.message
          : linkPayload
          ? `Linked ${resolveLinkDisplayKey(linkPayload)}`
          : "Pushed to JIRA successfully";

      setLinkMessage(successMessage);
      setIsPushModalOpen(false);
    } catch (caught) {
      setPushError(
        caught instanceof Error ? caught.message : "Unable to push requirement to JIRA"
      );
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="space-y-2">
      <dt className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
        Linked JIRA issues
      </dt>
      <dd className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            Project {projectKey}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? "Refreshing…" : "Refresh issues"}
          </button>
        </div>
        {linkError ? <p className="text-xs text-rose-600">{linkError}</p> : null}
        {linkMessage ? <p className="text-xs text-emerald-600">{linkMessage}</p> : null}
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}

        {allowPush ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Manual sync
                </p>
                <p className="text-xs text-amber-800">
                  Create or refresh a linked JIRA issue when this requirement is ready.
                </p>
              </div>
              <Button
                type="button"
                variant={existingJiraLink ? "secondary" : "primary"}
                onClick={handleOpenPushModal}
              >
                {existingJiraLink ? "Re-sync to JIRA" : "Push to JIRA"}
              </Button>
            </div>
            {existingJiraLink ? (
              <p className="mt-2 text-xs text-amber-800">
                Linked to{" "}
                {existingJiraLink.url ? (
                  <a
                    href={existingJiraLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline decoration-amber-500/60 underline-offset-2"
                  >
                    {resolveLinkDisplayKey(existingJiraLink)}
                  </a>
                ) : (
                  <span className="font-semibold">
                    {resolveLinkDisplayKey(existingJiraLink)}
                  </span>
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Saved links
            </p>
            {!canManageLinks ? (
              <span className="text-[11px] text-slate-400">View only</span>
            ) : null}
          </div>
          {links.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2"
                >
                  <a
                    href={link.url ?? undefined}
                    target={link.url ? "_blank" : undefined}
                    rel={link.url ? "noreferrer" : undefined}
                    className="flex-1 truncate text-slate-700"
                  >
                    <span className="font-semibold text-slate-900">
                      {resolveLinkDisplayKey(link)}
                    </span>
                    {link.summary ? (
                      <span className="ml-2 truncate text-slate-600">{link.summary}</span>
                    ) : null}
                  </a>
                  {link.status ? (
                    <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {link.status}
                    </span>
                  ) : null}
                  {canManageLinks ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(link)}
                      disabled={removingLinkId === link.id}
                      className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingLinkId === link.id ? "Removing…" : "Remove"}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              {canManageLinks
                ? "No saved links yet. Use the list below to link an issue."
                : "No saved links yet."}
            </p>
          )}
        </div>

        {suggestedIssue ? (
          <div className="rounded-lg border border-indigo-300 bg-indigo-50/60 p-3 text-sm text-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Suggested link
              </p>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                {formatMatchPercentage(suggestedIssue.matchScore)}
              </span>
            </div>
            <a
              href={suggestedIssue.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-3 rounded-md border border-indigo-200 bg-white/70 px-3 py-2 transition hover:bg-white"
            >
              <span className="font-semibold text-slate-900">{suggestedIssue.key}</span>
              <span className="truncate text-slate-700">{suggestedIssue.summary}</span>
              <span className="ml-auto rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {suggestedIssue.status}
              </span>
            </a>
            <p className="mt-2 text-xs text-slate-600">
              Based on overlapping phrases in the requirement title, description, and AI outputs.
            </p>
            {canManageLinks ? (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleLinkIssue(suggestedIssue)}
                  disabled={
                    isIssueLinked(suggestedIssue) || isLinkingIssueId === suggestedIssue.id
                  }
                  className="inline-flex items-center rounded-md border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isIssueLinked(suggestedIssue)
                    ? "Already linked"
                    : isLinkingIssueId === suggestedIssue.id
                    ? "Linking…"
                    : "Link issue"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {remainingIssues.length > 0 ? (
          <ul className="space-y-2 text-sm text-slate-800">
            {remainingIssues.map((issue) => {
              const linked = isIssueLinked(issue);

              return (
                <li
                  key={issue.id}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 truncate text-slate-700 transition hover:text-slate-900"
                    >
                      <span className="font-semibold text-slate-900">{issue.key}</span>
                      <span className="ml-2 truncate text-slate-600">{issue.summary}</span>
                    </a>
                    <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {issue.status}
                    </span>
                    {issue.matchScore > 0 ? (
                      <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {formatMatchPercentage(issue.matchScore)}
                      </span>
                    ) : null}
                    {canManageLinks ? (
                      <button
                        type="button"
                        onClick={() => handleLinkIssue(issue)}
                        disabled={linked || isLinkingIssueId === issue.id}
                        className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {linked
                          ? "Already linked"
                          : isLinkingIssueId === issue.id
                          ? "Linking…"
                          : "Link issue"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : !suggestedIssue ? (
          <p className="text-xs text-slate-500">No issues found for project {projectKey}.</p>
        ) : null}

        {!error && cacheHit ? (
          <p className="text-[11px] text-slate-400">
            Showing cached results from the last few minutes.
          </p>
        ) : null}
      </dd>

      <Modal
        open={isPushModalOpen}
        onClose={handleClosePushModal}
        title={existingJiraLink ? "Re-sync to JIRA" : "Push to JIRA"}
        description="Choose a project and issue type to create or update the linked issue."
      >
        <form onSubmit={handlePushToJira} className="space-y-4 text-sm text-slate-700">
          <div className="space-y-2">
            <label htmlFor="jira-project" className="text-xs font-semibold uppercase">
              JIRA project
            </label>
            <Select
              id="jira-project"
              value={selectedProjectKey}
              onChange={(event) => setSelectedProjectKey(event.target.value)}
              disabled={projectOptions.length === 0}
            >
              {projectOptions.map((project) => (
                <option key={project.key} value={project.key}>
                  {project.name} ({project.key})
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-slate-500">
              Projects listed here come from the integration configured for this project.
            </p>
            {projectOptions.length === 0 ? (
              <p className="text-[11px] text-amber-700">
                Configure available JIRA projects in the project integrations panel.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="jira-issue-type" className="text-xs font-semibold uppercase">
              Issue type
            </label>
            <div className="flex flex-wrap gap-2">
              {ISSUE_TYPE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setIssueType(preset)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    issueType === preset
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Input
              id="jira-issue-type"
              value={issueType}
              onChange={(event) => setIssueType(event.target.value)}
              placeholder="Issue type (e.g. Story, Task)"
            />
          </div>

          <p className="text-xs text-slate-500">
            The current title, description, acceptance criteria, and open issues will be synced to
            the JIRA issue description.
          </p>

          {pushError ? <p className="text-xs text-rose-600">{pushError}</p> : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClosePushModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPushing}>
              {isPushing
                ? existingJiraLink
                  ? "Updating…"
                  : "Creating…"
                : existingJiraLink
                ? "Re-sync to JIRA"
                : "Push to JIRA"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
