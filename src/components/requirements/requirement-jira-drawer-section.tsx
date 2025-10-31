"use client";

import { useEffect, useState } from "react";
import { RequirementJiraIssues, type RequirementLinkInfo } from "@/components/requirements/jira-issues-section";
import { Card } from "@/components/ui/card";
import { fetchWithCsrf } from "@/lib/security/csrf";

type RequirementJiraDrawerSectionProps = {
  requirementId: string;
  projectKey: string | null;
  canManageLinks: boolean;
};

export const RequirementJiraDrawerSection = ({
  requirementId,
  projectKey,
  canManageLinks,
}: RequirementJiraDrawerSectionProps) => {
  const [links, setLinks] = useState<RequirementLinkInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectKey) {
      setLinks([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchWithCsrf(`/api/requirements/${requirementId}/links`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const payload = (await response.json().catch(() => ({}))) as {
          links?: RequirementLinkInfo[];
          error?: string;
        };

        if (!response.ok) {
          const message =
            typeof payload.error === "string" && payload.error.length > 0
              ? payload.error
              : "Unable to load linked issues";
          throw new Error(message);
        }

        if (cancelled) {
          return;
        }

        setLinks(Array.isArray(payload.links) ? payload.links : []);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load linked issues"
        );
        setLinks([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [projectKey, requirementId]);

  return (
    <Card className="space-y-4 border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">JIRA links</h3>
        <p className="text-xs text-slate-500">
          {projectKey
            ? "Connect this requirement with JIRA issues to track delivery."
            : "Configure JIRA in project integrations to enable linking."}
        </p>
      </div>

      {!projectKey ? (
        <p className="text-xs text-slate-500">
          Select the Manage integrations action to connect a JIRA project.
        </p>
      ) : isLoading && links === null ? (
        <p className="text-xs text-slate-500">Loading linked issues...</p>
      ) : (
        <RequirementJiraIssues
          requirementId={requirementId}
          projectKey={projectKey}
          initialIssues={[]}
          initialCacheHit={false}
          initialLinks={links ?? []}
          canManageLinks={canManageLinks}
          initialError={error}
        />
      )}
    </Card>
  );
};
