"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectPageDictionary } from "@/lib/i18n/types";
import { fetchWithCsrf } from "@/lib/security/csrf";

type ProjectOverflowMenuProps = {
  projectId: string;
  name: string | null;
  description: string | null;
  canEdit: boolean;
  copy: ProjectPageDictionary["menu"];
  onUpdated: () => void;
  onDeleted: () => void;
};

export const ProjectOverflowMenu = ({
  projectId,
  name,
  description,
  canEdit,
  copy,
  onUpdated,
  onDeleted,
}: ProjectOverflowMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formName, setFormName] = useState(name ?? "");
  const [formDescription, setFormDescription] = useState(description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickAway = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [isMenuOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const response = await fetchWithCsrf(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formName,
        description: formDescription,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: null }));
      const message =
        data && typeof data.error === "string" && data.error.length > 0
          ? data.error
          : "Unable to update project.";
      setError(message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setIsEditOpen(false);
    setIsMenuOpen(false);
    onUpdated();
  };

  const handleDelete = async () => {
    if (!window.confirm(copy.deleteConfirm)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    const response = await fetchWithCsrf(`/api/projects/${projectId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: null }));
      const message =
        data && typeof data.error === "string" && data.error.length > 0
          ? data.error
          : "Unable to delete project.";
      setError(message);
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    setIsMenuOpen(false);
    onDeleted();
  };

  if (!canEdit) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className="rounded-full px-2 py-1 text-slate-100 hover:bg-white/10 hover:text-white"
      >
        &#x2022;&#x2022;&#x2022;
      </Button>

      {isMenuOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg shadow-slate-400/25">
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-slate-700 transition hover:bg-slate-100"
            onClick={() => {
              setFormName(name ?? "");
              setFormDescription(description ?? "");
              setIsEditOpen(true);
              setIsMenuOpen(false);
            }}
          >
            {copy.edit}
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-rose-600 transition hover:bg-rose-50"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? copy.deleteBusy : copy.delete}
          </button>
          {error ? (
            <p className="px-4 py-2 text-xs text-rose-600">{error}</p>
          ) : null}
        </div>
      ) : null}

      <Drawer
        open={isEditOpen}
        onClose={() => {
          if (isSaving) {
            return;
          }
          setIsEditOpen(false);
          setError(null);
          setFormName(name ?? "");
          setFormDescription(description ?? "");
        }}
        title={copy.editTitle}
        description={copy.editDescription}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              {copy.nameLabel}
            </label>
            <Input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              {copy.descriptionLabel}
            </label>
            <Textarea
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              rows={3}
            />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (isSaving) {
                  return;
                }
                setIsEditOpen(false);
                setError(null);
                setFormName(name ?? "");
                setFormDescription(description ?? "");
              }}
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || formName.trim().length === 0}
            >
              {isSaving ? copy.saving : copy.save}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
