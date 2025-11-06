import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { logAuditEvent } from "@/lib/audit";
import { recordRequirementHistory } from "@/lib/data/requirement-history";
import type { Database, Json } from "@/types/database";

export type RequirementDocument =
  Database["public"]["Tables"]["documents"]["Row"];
export type RequirementCandidate =
  Database["public"]["Tables"]["requirement_candidates"]["Row"];
export type RequirementSource =
  Database["public"]["Tables"]["requirement_sources"]["Row"];
export type RequirementPage =
  Database["public"]["Tables"]["document_pages"]["Row"];

export const getDocumentById = async (
  documentId: string
): Promise<RequirementDocument | null> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load document", error);
    throw new Error("Failed to load document");
  }

  return (data as RequirementDocument) ?? null;
};

export const createRequirementDocument = async (
  payload: Database["public"]["Tables"]["documents"]["Insert"]
): Promise<RequirementDocument> => {
  const supabase = createSupabaseServiceRoleClient();

  const insertPayload: Database["public"]["Tables"]["documents"]["Insert"] = {
    status: "queued",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...payload,
    storage_bucket: payload.storage_bucket ?? "documents",
    hidden_at: payload.hidden_at ?? null,
  };

  const { data, error } = await supabase
    .from("documents")
    .insert(insertPayload)
    .select()
    .single();

  if (error || !data) {
    console.error("Failed to create requirement document", error);
    throw new Error("Failed to create document");
  }

  return data as RequirementDocument;
};

export const createDocumentPages = async (
  pages: Database["public"]["Tables"]["document_pages"]["Insert"][]
): Promise<void> => {
  if (!pages.length) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();

  const payload = pages.map((page) => ({
    status: "queued",
    created_at: new Date().toISOString(),
    ...page,
  }));

  const { error } = await supabase.from("document_pages").insert(payload);

  if (error) {
    console.error("Failed to create document pages", error);
    throw new Error("Failed to create document pages");
  }
};

export const listDocumentCandidates = async (
  documentId: string
): Promise<RequirementCandidate[]> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("requirement_candidates")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to list requirement candidates", error);
    throw new Error("Failed to list requirement candidates");
  }

  return (data ?? []) as RequirementCandidate[];
};

export const listDocumentPages = async (
  documentId: string
): Promise<RequirementPage[]> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("document_pages")
    .select("*")
    .eq("document_id", documentId)
    .order("page_number", { ascending: true });

  if (error) {
    console.error("Failed to list document pages", error);
    throw new Error("Failed to list document pages");
  }

  return (data ?? []) as RequirementPage[];
};

export const getCandidateById = async (
  candidateId: string
): Promise<RequirementCandidate | null> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("requirement_candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load requirement candidate", error);
    throw new Error("Failed to load requirement candidate");
  }

  return (data as RequirementCandidate) ?? null;
};

export const insertRequirementCandidates = async (
  candidates: Database["public"]["Tables"]["requirement_candidates"]["Insert"][]
): Promise<void> => {
  if (!candidates.length) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  const payload = candidates.map((candidate) => ({
    status: candidate.status ?? "draft",
    created_at: candidate.created_at ?? now,
    ...candidate,
  }));

  const { error } = await supabase.from("requirement_candidates").insert(payload);

  if (error) {
    console.error("Failed to insert requirement candidates", error);
    throw new Error("Failed to insert requirement candidates");
  }
};

export const markDocumentPageProcessed = async (
  pageId: string,
  updates: Database["public"]["Tables"]["document_pages"]["Update"]
): Promise<void> => {
  const supabase = createSupabaseServiceRoleClient();
  const payload: Database["public"]["Tables"]["document_pages"]["Update"] = {
    processed_at: new Date().toISOString(),
    ...updates,
  } as Database["public"]["Tables"]["document_pages"]["Update"];

  const { error } = await supabase
    .from("document_pages")
    .update(payload)
    .eq("id", pageId);

  if (error) {
    console.error("Failed to mark document page processed", error);
    throw new Error("Failed to mark document page processed");
  }
};

export const updateCandidateStatus = async (
  candidateId: string,
  status: string,
  updates: Partial<Database["public"]["Tables"]["requirement_candidates"]["Update"]> = {}
): Promise<void> => {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("requirement_candidates")
    .update({
      status,
      ...updates,
    })
    .eq("id", candidateId);

  if (error) {
    console.error("Failed to update candidate status", error);
    throw new Error("Failed to update candidate status");
  }
};

export const updateCandidate = async (
  candidateId: string,
  updates: Database["public"]["Tables"]["requirement_candidates"]["Update"]
): Promise<RequirementCandidate | null> => {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("requirement_candidates")
    .update({
      ...updates,
    })
    .eq("id", candidateId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Failed to update candidate", error);
    throw new Error("Failed to update candidate");
  }

  return (data as RequirementCandidate) ?? null;
};

export const markDocumentPageFailed = async (
  pageId: string,
  errorMessage: string
): Promise<void> => {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("document_pages")
    .update({
      status: "failed",
      error: errorMessage,
    })
    .eq("id", pageId);

  if (error) {
    console.error("Failed to mark document page failed", error);
    throw new Error("Failed to mark document page failed");
  }
};

export const updateDocumentStatus = async (
  documentId: string,
  status: string,
  updates: Partial<Database["public"]["Tables"]["documents"]["Update"]> = {}
): Promise<void> => {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("documents")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...updates,
    })
    .eq("id", documentId);

  if (error) {
    console.error("Failed to update document status", error);
    throw new Error("Failed to update document status");
  }
};

export const setDocumentHiddenState = async (
  documentId: string,
  hidden: boolean
): Promise<void> => {
  const supabase = createSupabaseServiceRoleClient();
  const now = hidden ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("documents")
    .update({
      hidden_at: now,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) {
    console.error("Failed to update document hidden state", error);
    throw new Error("Failed to update document hidden state");
  }
};

export const insertRequirementSource = async (
  payload: Database["public"]["Tables"]["requirement_sources"]["Insert"]
): Promise<void> => {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("requirement_sources")
    .insert({
      created_at: new Date().toISOString(),
      ...payload,
    });

  if (error) {
    console.error("Failed to insert requirement source", error);
    throw new Error("Failed to insert requirement source");
  }
};

export const promoteCandidateToRequirement = async (input: {
  candidate: RequirementCandidate;
  projectId: string;
  userId: string;
  title: string;
  description: string;
  type?: string | null;
  priority?: number | null;
  status?: string | null;
}): Promise<Database["public"]["Tables"]["requirements"]["Row"]> => {
  const requirement = await createRequirement({
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    type: input.type ?? input.candidate.type,
    priority: input.priority ?? null,
    status: input.status ?? "analysis",
    createdBy: input.userId,
  });

  if (!requirement) {
    throw new Error("Failed to create requirement from candidate");
  }

  await insertRequirementSource({
    requirement_id: requirement.id,
    document_id: input.candidate.document_id,
    page_id: input.candidate.page_id,
    offset_start: null,
    offset_end: null,
  });

  await updateCandidateStatus(input.candidate.id, "approved", {
    requirement_id: requirement.id,
    created_by: input.userId,
  });

  return requirement;
};

export const getQueuedDocumentPages = async (
  limit: number
): Promise<Database["public"]["Tables"]["document_pages"]["Row"][]> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("document_pages")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to load queued document pages", error);
    throw new Error("Failed to load queued document pages");
  }

  return (data ?? []) as Database["public"]["Tables"]["document_pages"]["Row"][];
};

export const markPagesAsProcessing = async (pageIds: string[]): Promise<void> => {
  if (!pageIds.length) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("document_pages")
    .update({
      status: "processing",
    })
    .in("id", pageIds)
    .eq("status", "queued");

  if (error) {
    console.error("Failed to mark pages as processing", error);
    throw new Error("Failed to mark pages as processing");
  }
};

export const hasPendingPagesForDocument = async (
  documentId: string
): Promise<boolean> => {
  const supabase = createSupabaseServiceRoleClient();
  const { count, error } = await supabase
    .from("document_pages")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)
    .in("status", ["queued", "processing"]);

  if (error) {
    console.error("Failed to count pending pages", error);
    throw new Error("Failed to count pending pages");
  }

  return (count ?? 0) > 0;
};

export const recordDocumentProcessingEvent = async (
  input: {
    documentId: string;
    pagesProcessed: number;
    candidatesInserted: number;
    status: string;
    error?: string | null;
    metadata?: Json | null;
    startedAt?: string;
    completedAt?: string | null;
  }
): Promise<void> => {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase.from("document_processing_events").insert({
    document_id: input.documentId,
    pages_processed: input.pagesProcessed,
    candidates_inserted: input.candidatesInserted,
    status: input.status,
    error: input.error ?? null,
    metadata: input.metadata ?? null,
    batch_started_at: input.startedAt ?? new Date().toISOString(),
    batch_completed_at: input.completedAt ?? new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to record document processing event", error);
  }
};

export const listRequirements = async (
  projectId: string
): Promise<Database["public"]["Tables"]["requirements"]["Row"][]> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("requirements")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Unable to load requirements", error);
    return [];
  }

  return (data ?? []) as Database["public"]["Tables"]["requirements"]["Row"][];
};

export const getRequirementById = async (
  requirementId: string
): Promise<Database["public"]["Tables"]["requirements"]["Row"] | null> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("requirements")
    .select("*")
    .eq("id", requirementId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load requirement", error);
    return null;
  }

  return data as Database["public"]["Tables"]["requirements"]["Row"] | null;
};

export const getRecentRequirementsForProject = async (
  projectId: string,
  limit = 5
): Promise<Array<{ id: string; title: string; description: string }>> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("requirements")
    .select("id, title, description")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Unable to load recent requirements", error);
    return [];
  }

  return (data ?? []) as Array<{
    id: string;
    title: string;
    description: string;
  }>;
};

export const createRequirement = async (
  input: {
    projectId: string;
    title: string;
    description: string;
    type?: string | null;
    priority?: number | null;
    status?: string | null;
    createdBy: string;
    aiUserStory?: string | null;
    aiAcceptanceCriteria?: string[] | null;
    aiIssues?: string[] | null;
    aiConfidence?: number | null;
    aiProvider?: string | null;
    aiLanguage?: string | null;
    aiTokensUsed?: number | null;
  }
): Promise<Database["public"]["Tables"]["requirements"]["Row"] | null> => {
  const supabase = createSupabaseServiceRoleClient();

  const payload: Database["public"]["Tables"]["requirements"]["Insert"] = {
    project_id: input.projectId,
    title: input.title,
    description: input.description,
    type: input.type ?? null,
    priority: input.priority ?? 3,
    status: input.status ?? "analysis",
    created_by: input.createdBy,
    ai_user_story: input.aiUserStory ?? null,
    ai_acceptance_criteria: input.aiAcceptanceCriteria ?? null,
    ai_issues: input.aiIssues ?? null,
    ai_confidence: input.aiConfidence ?? null,
    ai_provider: input.aiProvider ?? null,
    ai_language: input.aiLanguage ?? null,
    ai_tokens_used: input.aiTokensUsed ?? null,
    ai_type_suggestion: null,
    ai_type_confidence: null,
    ai_type_reason: null,
  };

  const { data, error } = await supabase
    .from("requirements")
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    console.error("Unable to create requirement", error);
    return null;
  }

  const requirement = data as Database["public"]["Tables"]["requirements"]["Row"];

  await logAuditEvent({
    userId: input.createdBy,
    action: "requirement.created",
    entity: "requirement",
    entityId: requirement.id,
    payload: {
      projectId: input.projectId,
      title: input.title,
    },
  });

  await recordRequirementHistory({
    requirementId: requirement.id,
    projectId: input.projectId,
    userId: input.createdBy,
    action: "created",
    changedFields: ["title", "description", "type", "priority", "status"],
  });

  return requirement;
};

export const updateRequirement = async (input: {
  requirementId: string;
  projectId: string;
  updates: Partial<{
    title: string;
    description: string;
    type: string | null;
    priority: number | null;
    status: string | null;
    ai_user_story: string | null;
    ai_acceptance_criteria: string[] | null;
    ai_issues: string[] | null;
    ai_confidence: number | null;
    ai_provider: string | null;
    ai_language: string | null;
    ai_tokens_used: number | null;
    ai_type_suggestion: string | null;
    ai_type_confidence: number | null;
    ai_type_reason: string | null;
  }>;
  updatedBy: string;
  changeNote?: string | null;
}): Promise<Database["public"]["Tables"]["requirements"]["Row"] | null> => {
  const supabase = createSupabaseServiceRoleClient();

  const normalizedUpdates: Record<string, unknown> = {};
  const updatePayload: Database["public"]["Tables"]["requirements"]["Update"] = {};

  if (typeof input.updates.title === "string") {
    normalizedUpdates.title = input.updates.title.trim();
    updatePayload.title = input.updates.title.trim();
  }

  if (typeof input.updates.description === "string") {
    normalizedUpdates.description = input.updates.description.trim();
    updatePayload.description = input.updates.description.trim();
  }

  if ("type" in input.updates) {
    normalizedUpdates.type = input.updates.type ?? null;
    updatePayload.type = input.updates.type ?? null;
  }

  if ("priority" in input.updates) {
    normalizedUpdates.priority = input.updates.priority ?? null;
    updatePayload.priority = input.updates.priority ?? null;
  }

  if ("status" in input.updates) {
    normalizedUpdates.status = input.updates.status ?? null;
    updatePayload.status = input.updates.status ?? null;
  }

  if ("ai_user_story" in input.updates) {
    normalizedUpdates.ai_user_story = input.updates.ai_user_story ?? null;
    updatePayload.ai_user_story = input.updates.ai_user_story ?? null;
  }

  if ("ai_acceptance_criteria" in input.updates) {
    normalizedUpdates.ai_acceptance_criteria =
      input.updates.ai_acceptance_criteria ?? null;
    updatePayload.ai_acceptance_criteria =
      input.updates.ai_acceptance_criteria ?? null;
  }

  if ("ai_issues" in input.updates) {
    normalizedUpdates.ai_issues = input.updates.ai_issues ?? null;
    updatePayload.ai_issues = input.updates.ai_issues ?? null;
  }

  if ("ai_confidence" in input.updates) {
    normalizedUpdates.ai_confidence = input.updates.ai_confidence ?? null;
    updatePayload.ai_confidence = input.updates.ai_confidence ?? null;
  }

  if ("ai_provider" in input.updates) {
    normalizedUpdates.ai_provider = input.updates.ai_provider ?? null;
    updatePayload.ai_provider = input.updates.ai_provider ?? null;
  }

  if ("ai_language" in input.updates) {
    normalizedUpdates.ai_language = input.updates.ai_language ?? null;
    updatePayload.ai_language = input.updates.ai_language ?? null;
  }

  if ("ai_tokens_used" in input.updates) {
    normalizedUpdates.ai_tokens_used = input.updates.ai_tokens_used ?? null;
    updatePayload.ai_tokens_used = input.updates.ai_tokens_used ?? null;
  }

  if ("ai_type_suggestion" in input.updates) {
    normalizedUpdates.ai_type_suggestion = input.updates.ai_type_suggestion ?? null;
    updatePayload.ai_type_suggestion = input.updates.ai_type_suggestion ?? null;
  }

  if ("ai_type_confidence" in input.updates) {
    normalizedUpdates.ai_type_confidence = input.updates.ai_type_confidence ?? null;
    updatePayload.ai_type_confidence = input.updates.ai_type_confidence ?? null;
  }

  if ("ai_type_reason" in input.updates) {
    normalizedUpdates.ai_type_reason = input.updates.ai_type_reason ?? null;
    updatePayload.ai_type_reason = input.updates.ai_type_reason ?? null;
  }

  const updatedAt = new Date().toISOString();
  normalizedUpdates.updated_at = updatedAt;
  updatePayload.updated_at = updatedAt;

  const { data, error } = await supabase
    .from("requirements")
    .update(updatePayload)
    .eq("id", input.requirementId)
    .eq("project_id", input.projectId)
    .select()
    .single();

  if (error || !data) {
    console.error("Unable to update requirement", error);
    return null;
  }

  const changedFields = Object.keys(normalizedUpdates).filter(
    (field) => field !== "updated_at"
  );

  const updatedRequirement = data as Database["public"]["Tables"]["requirements"]["Row"];

  await logAuditEvent({
    userId: input.updatedBy,
    action: "requirement.updated",
    entity: "requirement",
    entityId: input.requirementId,
    payload: {
      projectId: input.projectId,
      fields: changedFields,
    },
  });

  await recordRequirementHistory({
    requirementId: input.requirementId,
    projectId: input.projectId,
    userId: input.updatedBy,
    action: "updated",
    changedFields,
    changeNote: input.changeNote ?? null,
  });

  return updatedRequirement;
};

export const deleteRequirement = async (input: {
  requirementId: string;
  projectId: string;
  deletedBy: string;
  reason?: string | null;
}): Promise<boolean> => {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("requirements")
    .delete()
    .eq("id", input.requirementId)
    .eq("project_id", input.projectId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Unable to delete requirement", error);
    return false;
  }

  if (data) {
    await logAuditEvent({
      userId: input.deletedBy,
      action: "requirement.deleted",
      entity: "requirement",
      entityId: input.requirementId,
      payload: {
        projectId: input.projectId,
      },
    });

    await recordRequirementHistory({
      requirementId: input.requirementId,
      projectId: input.projectId,
      userId: input.deletedBy,
      action: "deleted",
      changedFields: [],
      changeNote: input.reason ?? null,
    });
  }

  return true;
};
