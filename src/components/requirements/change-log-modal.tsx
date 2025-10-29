"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import type { RequirementHistoryRow } from "@/lib/data/requirement-history";

export type ChangeLogModalProps = {
  history: RequirementHistoryRow[];
  buttonLabel?: string;
};

export const ChangeLogModal = ({
  history,
  buttonLabel = "View change log",
}: ChangeLogModalProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Requirement change log"
        description="Review who updated the requirement, which fields changed, and any notes they provided."
      >
        {history.length === 0 ? (
          <p className="text-sm text-slate-600">No changes recorded yet.</p>
        ) : (
          <ul className="space-y-4 text-sm text-slate-700">
            {history.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {entry.action}
                  </span>
                  <span className="text-xs text-slate-500">
                    {entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}
                  </span>
                </div>
                {Array.isArray(entry.changed_fields) && entry.changed_fields.length > 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Changed fields: {entry.changed_fields.join(", ")}
                  </p>
                ) : null}
                {entry.change_note ? (
                  <p className="mt-2 leading-relaxed">{entry.change_note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
};
