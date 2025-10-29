"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { EditRequirementForm } from "@/components/requirements/edit-requirement-form";

export type EditRequirementModalProps = {
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
  buttonLabel?: string;
  disabled?: boolean;
};

export const EditRequirementModal = ({
  projectId,
  requirementId,
  initialValues,
  buttonLabel = "Edit requirement",
  disabled,
}: EditRequirementModalProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {buttonLabel}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit requirement"
        description="Update the requirement details and leave a change note to keep the history clear."
        size="xl"
      >
        <EditRequirementForm
          projectId={projectId}
          requirementId={requirementId}
          initialValues={initialValues}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
};
