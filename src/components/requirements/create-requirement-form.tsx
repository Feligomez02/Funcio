"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  REQUIREMENT_STATUS_VALUES,
  REQUIREMENT_TYPE_VALUES,
  type RequirementStatusValue,
  type RequirementTypeValue,
} from "@/components/requirements/options";
import { AI_LANGUAGE_OPTIONS } from "@/lib/ai/languages";
import type { ImprovementResult } from "@/components/requirements/improve-requirement";
import { useI18n } from "@/components/i18n/i18n-provider";
import { fetchWithCsrf } from "@/lib/security/csrf";

export const CreateRequirementForm = ({
  projectId,
  disabled,
  initialStatus = "analysis",
  onSuccess,
}: {
  projectId: string;
  disabled?: boolean;
  initialStatus?: RequirementStatusValue;
  onSuccess?: () => void;
}) => {
  const router = useRouter();
  const {
    dictionary: { requirementForm: copy },
  } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<RequirementTypeValue>("functional");
  const [priority, setPriority] = useState(3);
  const [status, setStatus] = useState<RequirementStatusValue>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiLanguage, setAiLanguage] = useState(AI_LANGUAGE_OPTIONS[0].value);
  const [aiResult, setAiResult] = useState<ImprovementResult | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const requirementTypeOptions = useMemo(
    () =>
      REQUIREMENT_TYPE_VALUES.map((value) => ({
        value,
        label: copy.requirementTypes[value] ?? value,
      })),
    [copy.requirementTypes]
  );

  const requirementStatusOptions = useMemo(
    () =>
      REQUIREMENT_STATUS_VALUES.map((value) => ({
        value,
        label: copy.requirementStatuses[value] ?? value,
      })),
    [copy.requirementStatuses]
  );

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetchWithCsrf("/api/requirements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        title,
        description,
        type,
        priority,
        status,
        aiUserStory: aiResult?.userStory ?? null,
        aiAcceptanceCriteria: aiResult?.acceptanceCriteria ?? null,
        aiIssues: aiResult?.issues ?? null,
        aiConfidence: aiResult?.confidence ?? null,
        aiProvider: aiResult?.provider ?? null,
        aiLanguage: aiResult?.language ?? null,
        aiTokensUsed: aiResult?.tokensUsed ?? null,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: null }));
      const message =
        data && typeof data.error === "string" && data.error.length > 0
          ? data.error
          : copy.create.error;
      setError(message);
      setIsSubmitting(false);
      return;
    }

    setTitle("");
    setDescription("");
    setType("functional");
    setPriority(3);
    setStatus(initialStatus);
    setAiResult(null);
    setAiError(null);
    setIsSubmitting(false);
    router.refresh();
    onSuccess?.();
  };

  const handleImprove = async () => {
    if (!description || description.trim().length < 10) {
      setAiError(copy.ai.errors.descriptionTooShort);
      return;
    }

    setIsImproving(true);
    setAiError(null);

    const response = await fetchWithCsrf("/api/ai/improve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        requirementId: null,
        text: description,
        language: aiLanguage,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: null }));
      const message =
        data && typeof data.error === "string" && data.error.length > 0
          ? data.error
          : copy.ai.errors.generic;
      setAiError(message);
      setIsImproving(false);
      return;
    }

    const data = (await response.json()) as ImprovementResult;
    setAiResult(data);
    setIsImproving(false);
  };

  const applySuggestion = () => {
    if (!aiResult) {
      return;
    }

    setDescription(aiResult.improvedText);
    setAiError(null);
  };

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <label htmlFor="requirement-title" className="text-sm font-medium text-slate-700">
          {copy.fields.titleLabel}
        </label>
        <Input
          id="requirement-title"
          name="title"
          required
          disabled={disabled}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={copy.fields.titlePlaceholder}
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="requirement-description"
          className="text-sm font-medium text-slate-700"
        >
          {copy.fields.descriptionLabel}
        </label>
        <Textarea
          id="requirement-description"
          name="description"
          required
          disabled={disabled}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={copy.fields.descriptionPlaceholder}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            {copy.fields.typeLabel}
          </label>
          <Select
            value={type}
            onChange={(event) =>
              setType(event.target.value as RequirementTypeValue)
            }
            disabled={disabled}
          >
            {requirementTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            {copy.fields.priorityLabel}
          </label>
          <Input
            type="number"
            min={1}
            max={5}
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value))}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            {copy.fields.statusLabel}
          </label>
          <Select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as RequirementStatusValue)
            }
            disabled={disabled}
          >
            {requirementStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">
            {copy.ai.sectionLabel}
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {copy.ai.languageLabel}:
            <div className="inline-flex gap-2">
              {AI_LANGUAGE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={aiLanguage === option.value ? "primary" : "secondary"}
                  onClick={() => setAiLanguage(option.value)}
                  className="max-w-[10rem] truncate"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleImprove}
            disabled={isImproving || isSubmitting}
            className="truncate"
          >
            {isImproving ? copy.ai.improvingButton : copy.ai.improveButton}
          </Button>
          {aiResult ? (
            <Button
              type="button"
              variant="secondary"
              onClick={applySuggestion}
              disabled={isSubmitting}
              className="truncate"
            >
              {copy.ai.applySuggestion}
            </Button>
          ) : null}
          {aiError ? <span className="text-sm text-red-600">{aiError}</span> : null}
        </div>
        {aiResult ? (
          <div className="space-y-3 rounded-xl bg-white p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            <div>
              <h3 className="font-semibold text-slate-900">
                {copy.ai.result.improvedTitle}
              </h3>
              <p className="mt-1 leading-relaxed">{aiResult.improvedText}</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">
                {copy.ai.result.userStoryTitle}
              </h4>
              <p className="mt-1">{aiResult.userStory}</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">
                {copy.ai.result.acceptanceTitle}
              </h4>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {aiResult.acceptanceCriteria.map((criteria, index) => (
                  <li key={`${criteria}-${index}`}>{criteria}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">
                {copy.ai.result.issuesTitle}
              </h4>
              {aiResult.issues.length === 0 ? (
                <p className="mt-1 text-slate-600">
                  {copy.ai.result.noIssues}
                </p>
              ) : (
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {aiResult.issues.map((issue, index) => (
                    <li key={`${issue}-${index}`}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {(() => {
                const details = [
                  copy.ai.result.confidence.replace(
                    "{value}",
                    `${Math.round(aiResult.confidence * 100)}%`
                  ),
                  copy.ai.result.provider.replace(
                    "{value}",
                    aiResult.provider
                  ),
                ];

                if (aiResult.tokensUsed) {
                  details.push(
                    copy.ai.result.tokens.replace(
                      "{value}",
                      String(aiResult.tokensUsed)
                    )
                  );
                }

                return details.join(" · ");
              })()}
            </p>
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={disabled || isSubmitting}>
        {isSubmitting ? copy.create.submitting : copy.create.submit}
      </Button>
      {disabled ? (
        <p className="text-xs text-slate-500">{copy.create.disabledHint}</p>
      ) : null}
    </form>
  );
};
