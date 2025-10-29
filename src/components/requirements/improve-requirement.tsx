"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_LANGUAGE_OPTIONS } from "@/lib/ai/languages";
import { useI18n } from "@/components/i18n/i18n-provider";

export type ImprovementResult = {
  improvedText: string;
  userStory: string;
  acceptanceCriteria: string[];
  issues: string[];
  confidence: number;
  tokensUsed?: number;
  provider: string;
  language: string;
  embedding?: {
    vector: number[];
    provider: string;
    model: string;
  } | null;
  typeSuggestion: string | null;
  typeConfidence: number | null;
  typeReason: string | null;
  typeChangeNote: string | null;
};

type ImproveRequirementProps = {
  projectId: string;
  requirementId: string;
  initialText: string;
  initialAi?: Partial<ImprovementResult> | null;
};

export const ImproveRequirement = ({
  projectId,
  requirementId,
  initialText,
  initialAi,
}: ImproveRequirementProps) => {
  const router = useRouter();
  const {
    dictionary: { requirementForm: copy },
  } = useI18n();
  const [text, setText] = useState(initialText);
  const defaultLanguage = AI_LANGUAGE_OPTIONS[0].value;
  const initialLanguage = initialAi?.language &&
    AI_LANGUAGE_OPTIONS.some((option) => option.value === initialAi.language)
      ? initialAi.language
      : defaultLanguage;
  const [language, setLanguage] = useState<string>(initialLanguage);
  const [result, setResult] = useState<ImprovementResult | null>(
    initialAi
      ? {
          improvedText: initialAi.improvedText ?? initialText,
          userStory: initialAi.userStory ?? "",
          acceptanceCriteria: initialAi.acceptanceCriteria ?? [],
          issues: initialAi.issues ?? [],
          confidence: initialAi.confidence ?? 0.5,
          tokensUsed: initialAi.tokensUsed,
          provider: initialAi.provider ?? "unknown",
          language: initialLanguage,
          embedding: initialAi.embedding ?? null,
          typeSuggestion: initialAi.typeSuggestion ?? null,
          typeConfidence: initialAi.typeConfidence ?? null,
          typeReason: initialAi.typeReason ?? null,
          typeChangeNote: initialAi.typeChangeNote ?? null,
        }
      : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const suggestionCopy = copy.typeSuggestionCard;
  const typeSuggestionCard =
    suggestionCopy ?? {
      title: "AI type review",
      reasonLabel: "Reason",
      confidenceLabel: "Confidence",
      changeNoteLabel: "Suggested change note",
      applyButton: "",
      appliedLabel: "",
      reminder:
        "Review this suggestion in the Edit requirement dialog before changing the requirement type.",
    };

  const handleImprove = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const response = await fetch("/api/ai/improve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        requirementId,
        text,
        language,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Unknown error" }));
      setError(data.error ?? "The AI assistant was unable to process the request.");
      setIsLoading(false);
      return;
    }

    const data = (await response.json()) as ImprovementResult;
    setResult(data);
    setIsLoading(false);
  };

  const handleApply = async () => {
    if (!result) {
      return;
    }

    setIsApplying(true);
    setError(null);
    setSuccessMessage(null);
    const improvedText = result.improvedText;

    const response = await fetch(`/api/requirements/${requirementId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        description: result.improvedText,
        aiUserStory: result.userStory,
        aiAcceptanceCriteria: result.acceptanceCriteria,
        aiIssues: result.issues,
        aiConfidence: result.confidence,
        aiProvider: result.provider,
        aiLanguage: result.language,
        aiTokensUsed: result.tokensUsed ?? null,
        changeNote: "Applied AI suggestion",
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Unknown error" }));
      setError(data.error ?? "Unable to update requirement");
      setIsApplying(false);
      return;
    }

    setSuccessMessage("Requirement updated with AI suggestion.");
    setResult(null);
    setText(improvedText);
    setIsApplying(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="improve-text" className="text-sm font-medium text-slate-700">
          Requirement text to improve
        </label>
        <Textarea
          id="improve-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span>Language:</span>
          <div className="inline-flex gap-2">
            {AI_LANGUAGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={language === option.value ? "primary" : "secondary"}
                onClick={() => setLanguage(option.value)}
                className="max-w-[10rem] truncate"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={handleImprove} disabled={isLoading}>
        {isLoading ? "Sending to AI..." : "Improve with AI"}
        </Button>
      </div>
      {result ? (
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Improved Requirement</h3>
            <p className="mt-2 text-sm text-slate-700">{result.improvedText}</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">User Story</h4>
            <p className="mt-1 text-sm text-slate-700">{result.userStory}</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Acceptance Criteria</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {result.acceptanceCriteria.map((criteria, index) => (
                <li key={`${criteria}-${index}`}>{criteria}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Issues to Address</h4>
            {result.issues.length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">No issues detected.</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {result.issues.map((issue, index) => (
                  <li key={`${issue}-${index}`}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <p>
              Confidence {Math.round(result.confidence * 100)}% · Provider: {result.provider}
              {result.tokensUsed ? ` · Tokens used: ${result.tokensUsed}` : ""}
            </p>
            <p>Output language: {result.language}</p>
          </div>
          {result.typeSuggestion ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
              <h4 className="font-semibold text-amber-800">{typeSuggestionCard.title}</h4>
              <p className="mt-1">
                <span className="font-semibold capitalize">{result.typeSuggestion}</span>
                {typeof result.typeConfidence === "number"
                  ? ` · ${typeSuggestionCard.confidenceLabel}: ${Math.round(
                      result.typeConfidence * 100
                    )}%`
                  : ""}
              </p>
              {result.typeReason ? (
                <p className="mt-1 text-amber-800">
                  {typeSuggestionCard.reasonLabel}: {result.typeReason}
                </p>
              ) : null}
              {result.typeChangeNote ? (
                <p className="mt-1 text-amber-800">
                  {typeSuggestionCard.changeNoteLabel}: <em>{result.typeChangeNote}</em>
                </p>
              ) : null}
              <p className="mt-2 text-xs text-amber-700">{typeSuggestionCard.reminder}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? "Applying..." : "Replace original requirement"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
