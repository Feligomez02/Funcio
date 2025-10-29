import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { serverEnv } from "@/env";

export type JiraIssue = {
  id: string;
  key: string;
  summary: string;
  status: string;
  url: string;
};

export type JiraProject = {
  id: string;
  key: string;
  name: string;
};

export type JiraAuthConfig = {
  baseUrl?: string | null;
  email?: string | null;
  apiToken?: string | null;
};

type ResolvedJiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
};

export class JiraRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "JiraRequestError";
  }
}

const normalizeString = (value: string | null | undefined): string =>
  (value ?? "").trim();

export const resolveJiraConfig = (
  auth?: JiraAuthConfig | null
): ResolvedJiraConfig | null => {
  const baseUrl = normalizeString(auth?.baseUrl) || serverEnv.JIRA_BASE_URL;
  const email = normalizeString(auth?.email) || serverEnv.JIRA_API_EMAIL;
  const apiToken = normalizeString(auth?.apiToken) || serverEnv.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    return null;
  }

  return {
    baseUrl,
    email,
    apiToken,
  };
};

const isConfigured = () => Boolean(resolveJiraConfig());

const buildAuthHeader = (config: ResolvedJiraConfig) => {
  const credentials = `${config.email}:${config.apiToken}`;
  const encoded = Buffer.from(credentials).toString("base64");
  return `Basic ${encoded}`;
};
type JiraIssueCacheEntry = {
  expiresAt: number;
  issues: JiraIssue[];
  error?: string;
};

type JiraProjectCacheEntry = {
  expiresAt: number;
  projects: JiraProject[];
  error?: string;
};

const CACHE_TTL_MS = 1000 * 60 * 5; // 5-minute cache window for successful fetches
const ERROR_CACHE_TTL_MS = 1000 * 60; // Shorter cache for error states to avoid hammering the API
const jiraIssueCache = new Map<string, JiraIssueCacheEntry>();
const jiraProjectCache = new Map<string, JiraProjectCacheEntry>();

const buildIssueCacheKey = (
  config: ResolvedJiraConfig,
  projectKey: string,
  maxResults: number
) => {
  const tokenHash = createHash("sha1")
    .update(config.apiToken)
    .digest("hex");
  return `${config.baseUrl}|${config.email}|${tokenHash}|${projectKey}|${maxResults}`;
};

const buildProjectCacheKey = (config: ResolvedJiraConfig) => {
  const tokenHash = createHash("sha1")
    .update(config.apiToken)
    .digest("hex");
  return `${config.baseUrl}|${config.email}|${tokenHash}`;
};

export type JiraIssueResult = {
  issues: JiraIssue[];
  error?: string;
  cacheHit: boolean;
};

export type JiraProjectResult = {
  projects: JiraProject[];
  error?: string;
  cacheHit: boolean;
};

type JiraDescriptionInput = {
  description?: string | null;
  acceptanceCriteria?: string[];
  issues?: string[];
};

const buildIssueBrowseUrl = (baseUrl: string, key: string) => {
  try {
    return new URL(`/browse/${encodeURIComponent(key)}`, baseUrl).toString();
  } catch {
    return `${baseUrl.replace(/\/$/, "")}/browse/${encodeURIComponent(key)}`;
  }
};

const buildTextParagraphs = (text?: string | null) => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  return text.split(/\r?\n/).map((entry) => ({
    type: "paragraph",
    content:
      entry && entry.length > 0
        ? [
            {
              type: "text",
              text: entry,
            },
          ]
        : [],
  }));
};

const buildBulletList = (label: string, items?: string[]) => {
  if (!items || items.length === 0) {
    return [];
  }

  const trimmed = items
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (trimmed.length === 0) {
    return [];
  }

  return [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: label,
          marks: [{ type: "strong" }],
        },
      ],
    },
    {
      type: "bulletList",
      content: trimmed.map((value) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: value,
              },
            ],
          },
        ],
      })),
    },
  ];
};

const buildJiraDescriptionDoc = (input: JiraDescriptionInput) => {
  const content = [
    ...buildTextParagraphs(input.description),
    ...buildBulletList("Acceptance criteria", input.acceptanceCriteria),
    ...buildBulletList("Open questions / issues", input.issues),
  ];

  if (content.length === 0) {
    content.push({
      type: "paragraph",
      content: [],
    });
  }

  return {
    type: "doc",
    version: 1,
    content,
  };
};

const extractJiraError = async (response: Response) => {
  const defaultMessage =
    response.status >= 500
      ? "JIRA service is unavailable."
      : "JIRA request failed.";

  try {
    const data = await response.json();

    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      const errorMessages = Array.isArray(record.errorMessages)
        ? record.errorMessages.filter(
            (item): item is string => typeof item === "string" && item.length > 0
          )
        : [];

      if (errorMessages.length > 0) {
        return errorMessages.join(" ");
      }

      if (typeof record.message === "string" && record.message.length > 0) {
        return record.message;
      }
    }
  } catch {
    try {
      const text = await response.clone().text();
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch {
      /* ignore */
    }
  }

  return defaultMessage;
};

export type JiraIssuePushInput = {
  projectKey: string;
  issueType: string;
  summary: string;
  description: string;
  acceptanceCriteria?: string[];
  issues?: string[];
  labels?: string[];
};

const resolveStatusCode = (status: number) => (status >= 500 ? 502 : 400);

export const fetchJiraIssue = async (
  issueKeyOrId: string,
  options?: { auth?: JiraAuthConfig }
): Promise<JiraIssue> => {
  const resolved = resolveJiraConfig(options?.auth);

  if (!resolved) {
    throw new JiraRequestError("JIRA integration is not configured.", 400);
  }

  const url = new URL(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}`,
    resolved.baseUrl
  );
  url.searchParams.set("fields", "id,key,summary,status");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: buildAuthHeader(resolved),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await extractJiraError(response);
    throw new JiraRequestError(message, resolveStatusCode(response.status));
  }

  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const fields =
    payload.fields && typeof payload.fields === "object"
      ? (payload.fields as Record<string, unknown>)
      : {};

  const statusRecord =
    fields.status && typeof fields.status === "object"
      ? (fields.status as Record<string, unknown>)
      : null;

  const status =
    (statusRecord?.name as string | undefined) ?? (statusRecord?.statusCategory as string | undefined) ?? "Unknown";

  const key =
    (payload.key as string | undefined) ??
    (payload.issueKey as string | undefined) ??
    issueKeyOrId;
  const id =
    (payload.id as string | undefined) ??
    (payload.issueId as string | undefined) ??
    key;
  const summary = (fields.summary as string | undefined) ?? "";

  return {
    id,
    key,
    summary,
    status,
    url: buildIssueBrowseUrl(resolved.baseUrl, key),
  };
};

export const createJiraIssue = async (
  input: JiraIssuePushInput,
  options?: { auth?: JiraAuthConfig }
): Promise<JiraIssue> => {
  const resolved = resolveJiraConfig(options?.auth);

  if (!resolved) {
    throw new JiraRequestError("JIRA integration is not configured.", 400);
  }

  const description = buildJiraDescriptionDoc({
    description: input.description,
    acceptanceCriteria: input.acceptanceCriteria,
    issues: input.issues,
  });

  const payload = {
    fields: {
      project: { key: input.projectKey },
      summary: input.summary,
      issuetype: { name: input.issueType },
      description,
      ...(input.labels && input.labels.length > 0 ? { labels: input.labels } : {}),
    },
  };

  const response = await fetch(
    new URL("/rest/api/3/issue", resolved.baseUrl).toString(),
    {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader(resolved),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const message = await extractJiraError(response);
    throw new JiraRequestError(message, resolveStatusCode(response.status));
  }

  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const issueKey =
    (body.key as string | undefined) ?? (body.issueKey as string | undefined);
  const issueId =
    (body.id as string | undefined) ?? (body.issueId as string | undefined);

  const identifier = issueKey ?? issueId;

  if (!identifier) {
    throw new JiraRequestError(
      "JIRA did not return an issue identifier.",
      502
    );
  }

  return fetchJiraIssue(identifier, { auth: resolved });
};

export const updateJiraIssue = async (
  issueKeyOrId: string,
  input: Omit<JiraIssuePushInput, "projectKey" | "issueType">,
  options?: { auth?: JiraAuthConfig }
): Promise<JiraIssue> => {
  const resolved = resolveJiraConfig(options?.auth);

  if (!resolved) {
    throw new JiraRequestError("JIRA integration is not configured.", 400);
  }

  const description = buildJiraDescriptionDoc({
    description: input.description,
    acceptanceCriteria: input.acceptanceCriteria,
    issues: input.issues,
  });

  const payload = {
    fields: {
      summary: input.summary,
      description,
      ...(input.labels && input.labels.length > 0 ? { labels: input.labels } : {}),
    },
  };

  const response = await fetch(
    new URL(
      `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}`,
      resolved.baseUrl
    ).toString(),
    {
      method: "PUT",
      headers: {
        Authorization: buildAuthHeader(resolved),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const message = await extractJiraError(response);
    throw new JiraRequestError(message, resolveStatusCode(response.status));
  }

  return fetchJiraIssue(issueKeyOrId, { auth: resolved });
};

export const fetchJiraIssuesByProjectKey = async (
  projectKey: string,
  options?: { maxResults?: number; auth?: JiraAuthConfig }
): Promise<JiraIssueResult> => {
  const resolved = resolveJiraConfig(options?.auth);

  if (!resolved) {
    return {
      issues: [],
      error: "JIRA integration is not configured.",
      cacheHit: false,
    };
  }

  const maxResults = options?.maxResults ?? 10;
  const cacheKey = buildIssueCacheKey(resolved, projectKey, maxResults);
  const now = Date.now();
  const cached = jiraIssueCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return { issues: cached.issues, error: cached.error, cacheHit: true };
  }

  const url = new URL("/rest/api/3/search/jql", resolved.baseUrl);
  const searchQuery = `project = "${projectKey}" ORDER BY updated DESC`;
  const headers = {
    Authorization: buildAuthHeader(resolved),
    Accept: "application/json",
    "Content-Type": "application/json",
  } as const;

  try {
    const performSearch = (payload: Record<string, unknown>) =>
      fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });

    let response = await performSearch({
      query: searchQuery,
      maxResults,
      fields: ["summary", "status"],
    });

    if (!response.ok && response.status === 400) {
      response = await performSearch({
        jql: `project=${projectKey}`,
        maxResults,
        fields: ["summary", "status"],
      });
    }

    if (!response.ok) {
      const message = await response.text();
      console.error("Unable to fetch JIRA issues", message);
      const result = {
        issues: [],
        error: "Unable to fetch JIRA issues.",
        cacheHit: false,
      } as JiraIssueResult;
      jiraIssueCache.set(cacheKey, {
        expiresAt: now + ERROR_CACHE_TTL_MS,
        issues: [],
        error: result.error,
      });
      return result;
    }

    const data = await response.json();

    const normalizeIssue = (input: unknown): JiraIssue | null => {
      if (!input || typeof input !== "object") {
        return null;
      }

      const record = input as Record<string, unknown>;
      const candidate =
        record.issue && typeof record.issue === "object"
          ? (record.issue as Record<string, unknown>)
          : record;

      const key =
        typeof candidate.key === "string"
          ? candidate.key
          : typeof candidate.issueKey === "string"
          ? candidate.issueKey
          : undefined;

      if (!key) {
        return null;
      }

      const id =
        typeof candidate.id === "string"
          ? candidate.id
          : typeof candidate.issueId === "string"
          ? candidate.issueId
          : key;

      const fields =
        candidate.fields && typeof candidate.fields === "object"
          ? (candidate.fields as Record<string, unknown>)
          : candidate;

      const summary =
        typeof fields.summary === "string"
          ? fields.summary
          : typeof candidate.title === "string"
          ? candidate.title
          : "Untitled issue";

      const statusValue = fields.status ?? candidate.status;
      const status =
        typeof statusValue === "string"
          ? statusValue
          : statusValue && typeof statusValue === "object" && "name" in statusValue
          ? ((statusValue as { name?: string }).name ?? "Unknown")
          : "Unknown";

      return {
        id,
        key,
        summary,
        status,
        url: `${resolved.baseUrl.replace(/\/$/, "")}/browse/${key}`,
      };
    };

    const collectIssues = (payload: unknown): JiraIssue[] => {
      if (!payload || typeof payload !== "object") {
        return [];
      }

      const container = payload as Record<string, unknown>;
      const buckets: unknown[] = [];

      if (Array.isArray(container.issues)) {
        buckets.push(...container.issues);
      }

      if (
        container.data &&
        typeof container.data === "object" &&
        Array.isArray((container.data as Record<string, unknown>).results)
      ) {
        buckets.push(...((container.data as Record<string, unknown>).results as unknown[]));
      }

      if (Array.isArray(container.results)) {
        buckets.push(...container.results);
      }

      if (Array.isArray(container.values)) {
        buckets.push(...container.values);
      }

      return buckets
        .map((item) => normalizeIssue(item))
        .filter((issue): issue is JiraIssue => Boolean(issue));
    };

    const issues = collectIssues(data);

    if (issues.length === 0) {
      console.warn("JIRA search returned no recognizable issues", data);
    }

    jiraIssueCache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      issues,
    });

    return { issues, cacheHit: false };
  } catch (error) {
    console.error("Failed to reach JIRA", error);
    const result = {
      issues: [],
      error: "Failed to reach JIRA.",
      cacheHit: false,
    } as JiraIssueResult;
    jiraIssueCache.set(cacheKey, {
      expiresAt: now + ERROR_CACHE_TTL_MS,
      issues: [],
      error: result.error,
    });
    return result;
  }
};

export const fetchJiraProjects = async (
  auth?: JiraAuthConfig
): Promise<JiraProjectResult> => {
  const resolved = resolveJiraConfig(auth);

  if (!resolved) {
    return {
      projects: [],
      error: "JIRA integration is not configured.",
      cacheHit: false,
    };
  }

  const cacheKey = buildProjectCacheKey(resolved);
  const now = Date.now();
  const cached = jiraProjectCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return {
      projects: cached.projects,
      error: cached.error,
      cacheHit: true,
    };
  }

  try {
    const url = new URL("/rest/api/3/project/search", resolved.baseUrl);
    url.searchParams.set("maxResults", "100");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: buildAuthHeader(resolved),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      console.error("Unable to fetch JIRA projects", message);
      const result: JiraProjectResult = {
        projects: [],
        error: "Unable to fetch JIRA projects.",
        cacheHit: false,
      };
      jiraProjectCache.set(cacheKey, {
        expiresAt: now + ERROR_CACHE_TTL_MS,
        projects: [],
        error: result.error,
      });
      return result;
    }

    const data = await response.json();

    const projectsRaw = Array.isArray(data.values)
      ? data.values
      : Array.isArray(data.projects)
      ? data.projects
      : Array.isArray(data)
      ? data
      : [];

    const projects: JiraProject[] = (projectsRaw as unknown[])
      .map((project): JiraProject | null => {
        if (!project || typeof project !== "object") {
          return null;
        }

        const record = project as Record<string, unknown>;
        const key =
          typeof record.key === "string"
            ? record.key
            : typeof record.projectKey === "string"
            ? record.projectKey
            : null;
        const name =
          typeof record.name === "string"
            ? record.name
            : typeof record.displayName === "string"
            ? record.displayName
            : null;
        const id =
          typeof record.id === "string"
            ? record.id
            : typeof record.projectId === "string"
            ? record.projectId
            : key ?? name ?? undefined;

        if (!key || !name) {
          return null;
        }

        return {
          id: id ?? key,
          key,
          name,
        } satisfies JiraProject;
      })
      .filter((item): item is JiraProject => Boolean(item));

    jiraProjectCache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      projects,
    });

    return { projects, cacheHit: false };
  } catch (error) {
    console.error("Failed to reach JIRA", error);
    const result: JiraProjectResult = {
      projects: [],
      error: "Failed to reach JIRA.",
      cacheHit: false,
    };
    jiraProjectCache.set(cacheKey, {
      expiresAt: now + ERROR_CACHE_TTL_MS,
      projects: [],
      error: result.error,
    });
    return result;
  }
};

export const jiraIntegrationEnabled = isConfigured;
