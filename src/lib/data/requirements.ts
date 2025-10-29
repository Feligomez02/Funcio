import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { logAuditEvent } from "@/lib/audit";
import { recordRequirementHistory } from "@/lib/data/requirement-history";
import type { Database } from "@/types/database";

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
