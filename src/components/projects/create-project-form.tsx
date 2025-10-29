"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n/i18n-provider";

export const CreateProjectForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    dictionary: { projectForm },
  } = useI18n();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: null }));
      const message =
        data && typeof data.error === "string" && data.error.length > 0
          ? data.error
          : projectForm.error;
      setError(message);
      setIsSubmitting(false);
      return;
    }

    setName("");
    setDescription("");
    setIsSubmitting(false);
    router.refresh();
    onSuccess?.();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="project-name" className="text-sm font-medium text-slate-800">
          {projectForm.fields.nameLabel}
        </label>
        <Input
          id="project-name"
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={projectForm.fields.namePlaceholder}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="project-description"
          className="text-sm font-medium text-slate-800"
        >
          {projectForm.fields.descriptionLabel}
        </label>
        <Textarea
          id="project-description"
          name="description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={projectForm.fields.descriptionPlaceholder}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? projectForm.submitting : projectForm.submit}
      </Button>
    </form>
  );
};
