"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export type ProjectIntegrationsCardProps = {
  projectId: string;
  initialJiraProjectKey: string | null;
  initialJiraBaseUrl: string | null;
  initialJiraEmail: string | null;
  initialJiraProjects: Array<{ key: string; name: string }>;
  jiraTokenConfigured: boolean;
  lastValidatedAt: string | null;
  canEdit: boolean;
};

export const ProjectIntegrationsCard = ({
  projectId,
  initialJiraProjectKey,
  initialJiraBaseUrl,
  initialJiraEmail,
  initialJiraProjects,
  jiraTokenConfigured,
  lastValidatedAt,
  canEdit,
}: ProjectIntegrationsCardProps) => {
  const router = useRouter();
  const initialProjectsSorted = useMemo(
    () =>
      [...initialJiraProjects].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [initialJiraProjects]
  );

  const [jiraProjectKey, setJiraProjectKey] = useState(initialJiraProjectKey ?? "");
  const [storedProjectKey, setStoredProjectKey] = useState(initialJiraProjectKey ?? "");
  const [jiraBaseUrl, setJiraBaseUrl] = useState(initialJiraBaseUrl ?? "");
  const [storedBaseUrl, setStoredBaseUrl] = useState(initialJiraBaseUrl ?? "");
  const [jiraEmail, setJiraEmail] = useState(initialJiraEmail ?? "");
  const [storedEmail, setStoredEmail] = useState(initialJiraEmail ?? "");
  const [availableProjects, setAvailableProjects] = useState(initialProjectsSorted);
  const initialJiraMatchesList = Boolean(
    initialJiraProjectKey &&
      initialProjectsSorted.some((project) => project.key === initialJiraProjectKey)
  );
  const [useCustomProjectKey, setUseCustomProjectKey] = useState(
    !initialJiraMatchesList || initialProjectsSorted.length === 0
  );
  const [tokenConfigured, setTokenConfigured] = useState(jiraTokenConfigured);
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [shouldClearToken, setShouldClearToken] = useState(false);
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [lastValidatedAtState, setLastValidatedAtState] = useState(lastValidatedAt);
  const [isTesting, setIsTesting] = useState(false);
  const [testingMessage, setTestingMessage] = useState<string | null>(null);
  const [testingError, setTestingError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const CUSTOM_SELECT_VALUE = "__custom__";

  const selectValue = useCustomProjectKey
    ? CUSTOM_SELECT_VALUE
    : jiraProjectKey.length > 0
    ? jiraProjectKey
    : "";

  const formatTimestamp = (value: string | null) => {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) {
      return null;
    }

    return parsed.toLocaleString();
  };

  const buildPayload = ({
    includeProjectKey,
    includeToken,
  }: {
    includeProjectKey: boolean;
    includeToken: boolean;
  }) => {
    const payload: Record<string, unknown> = {};

    if (includeProjectKey) {
      const trimmedKey = jiraProjectKey.trim();
      if (trimmedKey.length > 0) {
        payload.jiraProjectKey = trimmedKey;
      } else if (storedProjectKey.length > 0) {
        payload.jiraProjectKey = "";
      }
    }

    const trimmedBaseUrl = jiraBaseUrl.trim();
    if (trimmedBaseUrl.length > 0) {
      payload.jiraBaseUrl = trimmedBaseUrl;
    } else if (storedBaseUrl.length > 0) {
      payload.jiraBaseUrl = "";
    }

    const trimmedEmail = jiraEmail.trim();
    if (trimmedEmail.length > 0) {
      payload.jiraEmail = trimmedEmail;
    } else if (storedEmail.length > 0) {
      payload.jiraEmail = "";
    }

    if (includeToken) {
      const trimmedToken = jiraApiToken.trim();
      if (isEditingToken && trimmedToken.length > 0) {
        payload.jiraApiToken = trimmedToken;
      }
    }

    if (shouldClearToken) {
      payload.clearJiraApiToken = true;
    }

    return payload;
  };

  const updateStateFromResponse = (
    body: Record<string, unknown> | null,
    message: string
  ) => {
    const jiraPayload =
      body && typeof body.jira === "object" && body.jira !== null
        ? (body.jira as Record<string, unknown>)
        : null;

    if (jiraPayload) {
      const nextProjectKey =
        typeof jiraPayload.projectKey === "string"
          ? (jiraPayload.projectKey as string)
          : "";
      const nextBaseUrl =
        typeof jiraPayload.baseUrl === "string"
          ? (jiraPayload.baseUrl as string)
          : "";
      const nextEmail =
        typeof jiraPayload.email === "string"
          ? (jiraPayload.email as string)
          : "";
      const nextAvailableProjectsRaw = Array.isArray(jiraPayload.availableProjects)
        ? (jiraPayload.availableProjects as Array<{ key?: string; name?: string }>)
        : [];
      const nextAvailableProjects = nextAvailableProjectsRaw
        .filter(
          (project): project is { key: string; name: string } =>
            Boolean(project?.key) && Boolean(project?.name)
        )
        .map((project) => ({ key: project.key, name: project.name }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      const nextLastValidatedAt =
        typeof jiraPayload.lastValidatedAt === "string"
          ? (jiraPayload.lastValidatedAt as string)
          : null;
      const nextTokenConfigured = Boolean(jiraPayload.tokenConfigured);

      setJiraProjectKey(nextProjectKey);
      setStoredProjectKey(nextProjectKey);
      setJiraBaseUrl(nextBaseUrl);
      setStoredBaseUrl(nextBaseUrl);
      setJiraEmail(nextEmail);
      setStoredEmail(nextEmail);
      setAvailableProjects(nextAvailableProjects);
      setUseCustomProjectKey(
        nextProjectKey.length === 0 ||
          !nextAvailableProjects.some((project) => project.key === nextProjectKey)
      );
      setTokenConfigured(nextTokenConfigured);
      setLastValidatedAtState(nextLastValidatedAt);
    } else {
      setJiraProjectKey("");
      setStoredProjectKey("");
      setJiraBaseUrl("");
      setStoredBaseUrl("");
      setJiraEmail("");
      setStoredEmail("");
      setAvailableProjects([]);
      setUseCustomProjectKey(true);
      setTokenConfigured(false);
      setLastValidatedAtState(null);
    }

    setShouldClearToken(false);
    setIsEditingToken(false);
    setJiraApiToken("");
    setTestingMessage(null);
    setTestingError(null);
    setSuccess(message);
  };

  const submitIntegrations = async (
    payload: Record<string, unknown>,
    successMessage: string
  ) => {
    if (!canEdit) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/integrations`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof body.error === "string" && body.error.length > 0
            ? body.error
            : "Unable to update integrations";
        throw new Error(message);
      }

      updateStateFromResponse(body, successMessage);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update integrations");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload({ includeProjectKey: true, includeToken: true });
    await submitIntegrations(payload, "Integrations updated");
  };

  const handleClear = async () => {
    const payload: Record<string, unknown> = {};

    if (storedProjectKey.length > 0 || jiraProjectKey.trim().length > 0) {
      payload.jiraProjectKey = "";
    }

    if (storedBaseUrl.length > 0 || jiraBaseUrl.trim().length > 0) {
      payload.jiraBaseUrl = "";
    }

    if (storedEmail.length > 0 || jiraEmail.trim().length > 0) {
      payload.jiraEmail = "";
    }

    if (tokenConfigured || shouldClearToken) {
      payload.clearJiraApiToken = true;
    }

    await submitIntegrations(payload, "Integration removed");
  };

  const handleTestConnection = async () => {
    if (!canEdit) {
      return;
    }

    setIsTesting(true);
    setTestingMessage(null);
    setTestingError(null);

    const payload = buildPayload({ includeProjectKey: false, includeToken: true });

    try {
      const response = await fetch(`/api/integrations/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId, ...payload }),
      });

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof body.error === "string" && body.error.length > 0
            ? body.error
            : "Unable to reach JIRA";
        throw new Error(message);
      }

      const nextProjectsRaw = Array.isArray(body.projects)
        ? (body.projects as Array<{ key?: string; name?: string }>)
        : [];
      const nextProjects = nextProjectsRaw
        .filter(
          (project): project is { key: string; name: string } =>
            Boolean(project?.key) && Boolean(project?.name)
        )
        .map((project) => ({ key: project.key, name: project.name }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      setAvailableProjects(nextProjects);

      const hasMatch =
        nextProjects.length > 0 &&
        jiraProjectKey.trim().length > 0 &&
        nextProjects.some((project) => project.key === jiraProjectKey.trim());
      setUseCustomProjectKey(!hasMatch);

      const tokenSource =
        typeof body.tokenSource === "string" && body.tokenSource.length > 0
          ? body.tokenSource
          : "environment";

      const validatedAt =
        typeof body.validatedAt === "string" && body.validatedAt.length > 0
          ? (body.validatedAt as string)
          : null;

      if (validatedAt) {
        setLastValidatedAtState(validatedAt);
      }

      setTestingMessage(
        `Connection successful. Found ${nextProjects.length} project${
          nextProjects.length === 1 ? "" : "s"
        } using ${tokenSource === "project" ? "project-specific" : "global"} credentials.`
      );
    } catch (caught) {
      setTestingError(
        caught instanceof Error ? caught.message : "Unable to reach JIRA"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const isSaveDisabled = !canEdit || isSaving;
  const isClearDisabled =
    !canEdit ||
    (storedProjectKey.length === 0 &&
      storedBaseUrl.length === 0 &&
      storedEmail.length === 0 &&
      !tokenConfigured);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Integrations</h2>
          <p className="mt-2 text-sm text-slate-600">
            Configure JIRA connectivity to surface linked issues inside this project.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="jira-base-url" className="text-sm font-medium text-slate-700">
              JIRA base URL
            </label>
            <Input
              id="jira-base-url"
              value={jiraBaseUrl}
              onChange={(event) => setJiraBaseUrl(event.target.value)}
              placeholder="https://your-domain.atlassian.net"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="jira-email" className="text-sm font-medium text-slate-700">
              JIRA account email
            </label>
            <Input
              id="jira-email"
              value={jiraEmail}
              onChange={(event) => setJiraEmail(event.target.value)}
              placeholder="ops@example.com"
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-700">JIRA API token</span>
          {tokenConfigured && !isEditingToken && !shouldClearToken ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Token stored securely
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditingToken(true);
                  setShouldClearToken(false);
                  setJiraApiToken("");
                }}
                disabled={!canEdit}
              >
                Replace token
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShouldClearToken(true);
                  setIsEditingToken(false);
                  setTokenConfigured(false);
                  setJiraApiToken("");
                }}
                disabled={!canEdit}
              >
                Remove token
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                id="jira-api-token"
                type="password"
                value={jiraApiToken}
                onChange={(event) => setJiraApiToken(event.target.value)}
                placeholder="Paste a new API token"
                disabled={!canEdit}
              />
              {tokenConfigured && shouldClearToken ? (
                <p className="text-xs text-amber-600">
                  The stored token will be cleared when you save.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Linked JIRA project</label>
          {availableProjects.length > 0 ? (
            <Select
              value={selectValue}
              onChange={(event) => {
                const value = event.target.value;
                if (value === CUSTOM_SELECT_VALUE) {
                  setUseCustomProjectKey(true);
                  if (!jiraProjectKey) {
                    setJiraProjectKey("");
                  }
                  return;
                }
                setUseCustomProjectKey(false);
                setJiraProjectKey(value);
              }}
              disabled={!canEdit}
            >
              <option value="">Select a project</option>
              {availableProjects.map((project) => (
                <option key={project.key} value={project.key}>
                  {project.name} ({project.key})
                </option>
              ))}
              <option value={CUSTOM_SELECT_VALUE}>Enter a custom key…</option>
            </Select>
          ) : null}
          {(useCustomProjectKey || availableProjects.length === 0) && (
            <Input
              value={jiraProjectKey}
              onChange={(event) => setJiraProjectKey(event.target.value)}
              placeholder="NEXT"
              disabled={!canEdit}
            />
          )}
          <p className="text-xs text-slate-500">
            Use the project key exactly as it appears in JIRA. The dropdown populates after a successful connection test.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            Credentials: {tokenConfigured ? "project overrides" : "environment"}
          </span>
          {lastValidatedAtState ? (
            <span>Last validated {formatTimestamp(lastValidatedAtState)}</span>
          ) : (
            <span>Validation pending</span>
          )}
        </div>

        {testingError ? (
          <p className="text-sm text-red-600">{testingError}</p>
        ) : null}
        {testingMessage ? (
          <p className="text-sm text-emerald-600">{testingMessage}</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleTestConnection}
            disabled={!canEdit || isTesting || isSaving}
          >
            {isTesting ? "Testing..." : "Test connection"}
          </Button>
          <Button type="submit" disabled={isSaveDisabled}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={isClearDisabled || isSaving}
          >
            Remove integration
          </Button>
        </div>

        {!canEdit ? (
          <p className="text-xs text-slate-500">
            Only project admins can change integrations.
          </p>
        ) : null}
      </form>
    </Card>
  );
};
