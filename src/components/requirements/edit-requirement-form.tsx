"use client";

import { useRef, useState } from "react";
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
import { useI18n } from "@/components/i18n/i18n-provider";
import { fetchWithCsrf } from "@/lib/security/csrf";

const isRequirementTypeValue = (
  value: string | null | undefined
): value is RequirementTypeValue =>
  REQUIREMENT_TYPE_VALUES.includes(value as RequirementTypeValue);

const isRequirementStatusValue = (
  value: string | null | undefined
): value is RequirementStatusValue =>
  REQUIREMENT_STATUS_VALUES.includes(value as RequirementStatusValue);

type EditRequirementFormProps = {
  projectId: string;
  requirementId: string;
  initialValues: {
    title: string;
    description: string;
    type: string | null;
    priority: number | null;
    status: string | null;
    aiUserStory?: string | null;
    aiAcceptanceCriteria?: string[] | null;
    aiIssues?: string[] | null;
    aiTypeSuggestion?: string | null;
    aiTypeConfidence?: number | null;
    aiTypeReason?: string | null;
  };
  disabled?: boolean;
  onSuccess?: () => void;
  onDelete?: () => void;
};

export const EditRequirementForm = ({
  projectId,
  requirementId,
  initialValues,
  disabled,
  onSuccess,
  onDelete,
}: EditRequirementFormProps) => {
  const router = useRouter();
  const {
    dictionary: { requirementForm: copy },
  } = useI18n();
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const resolvedInitialType: RequirementTypeValue = isRequirementTypeValue(
    initialValues.type
  )
    ? (initialValues.type as RequirementTypeValue)
    : "functional";
  const [type, setType] = useState<RequirementTypeValue>(resolvedInitialType);
  const [priority, setPriority] = useState(initialValues.priority ?? 3);
  const [status, setStatus] = useState<RequirementStatusValue>(
    isRequirementStatusValue(initialValues.status)
      ? initialValues.status
      : "analysis"
  );
  const [aiUserStory, setAiUserStory] = useState(initialValues.aiUserStory ?? "");
  const [aiAcceptanceCriteria, setAiAcceptanceCriteria] = useState(
    (initialValues.aiAcceptanceCriteria ?? []).join("\n")
  );
  const [aiIssues, setAiIssues] = useState(
    (initialValues.aiIssues ?? []).join("\n")
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [changeNote, setChangeNote] = useState<string>("");
  const originalTypeRef = useRef<RequirementTypeValue>(resolvedInitialType);
  const aiTypeSuggestion = isRequirementTypeValue(initialValues.aiTypeSuggestion)
    ? (initialValues.aiTypeSuggestion as RequirementTypeValue)
    : null;
  const aiTypeConfidence = initialValues.aiTypeConfidence ?? null;
  const aiTypeReason = initialValues.aiTypeReason ?? null;
  const suggestionCopy = copy.typeSuggestionCard;
  const typeSuggestionCopy =
    suggestionCopy ?? {
      title: "AI type review",
      reasonLabel: "Reason",
      confidenceLabel: "Confidence",
      changeNoteLabel: "Suggested change note",
      applyButton: "Use suggested type",
      appliedLabel: "Suggested type already selected",
      reminder:
        "Add a change note when you change the requirement type so the history stays clear.",
    };
  const [typeSuggestionApplied, setTypeSuggestionApplied] = useState(false);
  const deleteHintCopy =
    copy.edit?.deleteHint ?? "Deleting will permanently remove this requirement.";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    const trimmedUserStory = aiUserStory.trim();
    const acceptanceCriteriaList = aiAcceptanceCriteria
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    const issuesList = aiIssues
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    const trimmedChangeNote = changeNote.trim();
    const typeChanged = type !== originalTypeRef.current;

    if (typeChanged && trimmedChangeNote.length === 0) {
      setError(copy.edit.typeChangeReasonRequired ?? copy.edit.error);
      setIsSaving(false);
      return;
    }

    const payload: Record<string, unknown> = {
      projectId,
      title,
      description,
      type,
      priority,
      status,
      aiUserStory: trimmedUserStory.length > 0 ? trimmedUserStory : null,
      aiAcceptanceCriteria:
        acceptanceCriteriaList.length > 0 ? acceptanceCriteriaList : null,
      aiIssues: issuesList.length > 0 ? issuesList : null,
    };

    if (trimmedChangeNote.length > 0) {
      payload.changeNote = trimmedChangeNote;
    }

    if (typeChanged && aiTypeSuggestion) {
      payload.aiTypeSuggestion = null;
      payload.aiTypeConfidence = null;
      payload.aiTypeReason = null;
    }

    const response = await fetchWithCsrf(`/api/requirements/${requirementId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: null }));
      const message =
        data && typeof data.error === "string" && data.error.length > 0
          ? data.error
          : copy.edit.error;
      setError(message);
      setIsSaving(false);
      return;
    }

    setSuccess(copy.edit.success);
    setIsSaving(false);
    setChangeNote("");
    setAiUserStory(trimmedUserStory);
    setAiAcceptanceCriteria(acceptanceCriteriaList.join("\n"));
    setAiIssues(issuesList.join("\n"));
    router.refresh();
    onSuccess?.();
  };

  const handleDelete = async () => {
    if (disabled) {
      return;
    }

    const confirmationMessage =
      copy.edit?.deleteConfirm ?? "Are you sure you want to delete this requirement?";
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsDeleting(true);

    try {
      const reason = changeNote.trim().length > 0 ? changeNote.trim() : null;
      const response = await fetchWithCsrf(`/api/requirements/${requirementId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          reason,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          (payload && typeof payload.error === "string"
            ? payload.error
            : copy.edit.deleteError) ?? copy.edit.deleteError,
        );
      }

      if (onDelete) {
        onDelete();
      } else {
        router.push(`/projects/${projectId}`);
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error && err.message.length > 0
          ? err.message
          : copy.edit.deleteError,
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="edit-title" className="text-sm font-medium text-slate-700">
            {copy.fields.titleLabel}
          </label>
          <Input
            id="edit-title"
            name="title"
            required
            disabled={disabled}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={copy.fields.titlePlaceholder}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor="edit-description"
            className="text-sm font-medium text-slate-700"
          >
            {copy.fields.descriptionLabel}
          </label>
          <Textarea
            id="edit-description"
            name="description"
            rows={4}
            required
            disabled={disabled}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={copy.fields.descriptionPlaceholder}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_min-content_minmax(0,1fr)] md:items-end">
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
            {REQUIREMENT_TYPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {copy.requirementTypes?.[value] ?? value}
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
            className="md:w-24"
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
            {REQUIREMENT_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {copy.requirementStatuses?.[value] ?? value}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="edit-user-story" className="text-sm font-medium text-slate-700">
            {copy.fields.userStoryLabel}
          </label>
          <Textarea
            id="edit-user-story"
            name="aiUserStory"
            rows={3}
            disabled={disabled}
            value={aiUserStory}
            onChange={(event) => setAiUserStory(event.target.value)}
            placeholder={copy.fields.userStoryPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="edit-acceptance" className="text-sm font-medium text-slate-700">
            {copy.fields.acceptanceCriteriaLabel}
          </label>
          <Textarea
            id="edit-acceptance"
            name="aiAcceptanceCriteria"
            rows={3}
            disabled={disabled}
            value={aiAcceptanceCriteria}
            onChange={(event) => setAiAcceptanceCriteria(event.target.value)}
            placeholder={copy.fields.acceptanceCriteriaPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="edit-issues" className="text-sm font-medium text-slate-700">
            {copy.fields.issuesLabel}
          </label>
          <Textarea
            id="edit-issues"
            name="aiIssues"
            rows={3}
            disabled={disabled}
            value={aiIssues}
            onChange={(event) => setAiIssues(event.target.value)}
            placeholder={copy.fields.issuesPlaceholder}
          />
        </div>
      </div>
      {aiTypeSuggestion ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800">{typeSuggestionCopy.title}</h4>
          <p className="mt-1">
            {typeSuggestionCopy.confidenceLabel}:{" "}
            {typeof aiTypeConfidence === "number"
              ? `${Math.round(aiTypeConfidence * 100)}%`
              : "--"}
          </p>
          {aiTypeReason ? (
            <p className="mt-1">
              {typeSuggestionCopy.reasonLabel}: {aiTypeReason}
            </p>
          ) : null}
          <p className="mt-1">
            {typeSuggestionCopy.changeNoteLabel}:{" "}
            <em>{aiTypeReason ?? typeSuggestionCopy.reminder}</em>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || type === aiTypeSuggestion}
              onClick={() => {
                setType(aiTypeSuggestion);
                if (changeNote.trim().length === 0) {
                  setChangeNote(aiTypeReason ?? typeSuggestionCopy.reminder);
                }
                setTypeSuggestionApplied(true);
              }}
            >
              {type === aiTypeSuggestion || typeSuggestionApplied
                ? typeSuggestionCopy.appliedLabel
              : typeSuggestionCopy.applyButton}
            </Button>
            <p className="text-[11px] text-slate-500">
              {typeSuggestionCopy.reminder}
            </p>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="space-y-2">
          <label htmlFor="change-note" className="text-sm font-medium text-slate-700">
            {copy.fields.changeNoteLabel}
          </label>
          <Textarea
            id="change-note"
            name="changeNote"
            rows={3}
            disabled={disabled}
            value={changeNote}
            onChange={(event) => setChangeNote(event.target.value)}
            placeholder={copy.fields.changeNotePlaceholder}
          />
        </div>
        <div className="md:justify-self-end">
          <Button type="submit" disabled={disabled || isSaving}>
            {isSaving ? copy.edit.submitting : copy.edit.submit}
          </Button>
        </div>
      </div>
      {!disabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
          <p className="text-xs text-slate-500">{deleteHintCopy}</p>
          <Button
            type="button"
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? copy.edit.deleting : copy.edit.delete}
          </Button>
        </div>
      ) : null}
      {disabled ? (
        <p className="text-xs text-slate-500">{copy.edit.disabledHint}</p>
      ) : null}
    </form>
  );
};








