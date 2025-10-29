import type { JiraIssue } from "@/lib/integrations/jira";
import { computeTextMatchScore } from "@/lib/utils";

export const buildRequirementMatchText = (input: {
  title: string;
  description: string;
  userStory?: string | null;
  acceptanceCriteria: string[];
  issues: string[];
}): string => {
  const segments = [
    input.title,
    input.description,
    input.userStory ?? "",
    input.acceptanceCriteria.join(" "),
    input.issues.join(" "),
  ];

  return segments
    .filter((segment) => typeof segment === "string" && segment.trim().length > 0)
    .join(" ");
};

export type ScoredJiraIssue = JiraIssue & { matchScore: number };

export const scoreJiraIssues = (
  issues: JiraIssue[],
  matchText: string
): ScoredJiraIssue[] =>
  issues
    .map((issue) => ({
      ...issue,
      matchScore: computeTextMatchScore(matchText, `${issue.key} ${issue.summary}`),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
