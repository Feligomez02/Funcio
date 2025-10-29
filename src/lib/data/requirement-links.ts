import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { logAuditEvent } from "@/lib/audit";
import type { Database } from "@/types/database";

export type RequirementLink = Database["public"]["Tables"]["requirement_links"]["Row"];

type CreateLinkInput = {
  requirementId: string;
  projectId: string;
  provider: string;
  externalType: string;
  externalId: string;
  externalKey?: string | null;
  summary?: string | null;
  status?: string | null;
  url?: string | null;
  metadata?: Database["public"]["Tables"]["requirement_links"]["Insert"]["metadata"];
  createdBy: string;
};

type CreateLinkResult =
  | { success: true; link: RequirementLink }
  | { success: false; reason: "duplicate" | "unknown" };

type DeleteLinkResult =
  | { success: true }
  | { success: false; reason: "not_found" | "unknown" };

type UpdateLinkInput = {
  requirementId: string;
  projectId: string;
  provider: string;
  externalType: string;
  externalId: string;
  externalKey?: string | null;
  summary?: string | null;
  status?: string | null;
  url?: string | null;
  metadata?: Database["public"]["Tables"]["requirement_links"]["Update"]["metadata"];
  updatedBy: string;
};

type UpdateLinkResult =
  | { success: true; link: RequirementLink }
  | { success: false; reason: "not_found" | "unknown" };

export const listRequirementLinks = async (
  requirementId: string
): Promise<RequirementLink[]> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("requirement_links")
    .select("*")
    .eq("requirement_id", requirementId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Unable to load requirement links", error);
    return [];
  }

  return (data ?? []) as RequirementLink[];
};

export const createRequirementLink = async (
  input: CreateLinkInput
): Promise<CreateLinkResult> => {
  const supabase = createSupabaseServiceRoleClient();

  const payload: Database["public"]["Tables"]["requirement_links"]["Insert"] = {
    requirement_id: input.requirementId,
    project_id: input.projectId,
    provider: input.provider,
    external_type: input.externalType,
    external_id: input.externalId,
    external_key: input.externalKey ?? null,
    summary: input.summary ?? null,
    status: input.status ?? null,
    url: input.url ?? null,
    metadata: input.metadata ?? null,
    created_by: input.createdBy,
  };

  const { data, error } = await supabase
    .from("requirement_links")
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    const code = (error as { code?: string } | null)?.code ?? null;

    if (code === "23505") {
      return { success: false, reason: "duplicate" };
    }

    console.error("Unable to create requirement link", error);
    return { success: false, reason: "unknown" };
  }

  const link = data as RequirementLink;

  await logAuditEvent({
    userId: input.createdBy,
    action: "requirement.link.created",
    entity: "requirement",
    entityId: input.requirementId,
    payload: {
      provider: input.provider,
      externalType: input.externalType,
      externalId: input.externalId,
      externalKey: input.externalKey ?? null,
      summary: input.summary ?? null,
    },
  });

  return { success: true, link };
};

export const updateRequirementLink = async (
  input: UpdateLinkInput
): Promise<UpdateLinkResult> => {
  const supabase = createSupabaseServiceRoleClient();
  const { requirementId, projectId, provider, externalType } = input;

  const payload: Database["public"]["Tables"]["requirement_links"]["Update"] = {
    external_id: input.externalId,
    external_key: input.externalKey ?? null,
    summary: input.summary ?? null,
    status: input.status ?? null,
    url: input.url ?? null,
    metadata: input.metadata ?? null,
    created_by: input.updatedBy,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("requirement_links")
    .update(payload)
    .eq("requirement_id", requirementId)
    .eq("project_id", projectId)
    .eq("provider", provider)
    .eq("external_type", externalType)
    .select()
    .single();

  if (error) {
    if ((error as { code?: string } | null)?.code === "PGRST116") {
      return { success: false, reason: "not_found" };
    }
    console.error("Unable to update requirement link", error);
    return { success: false, reason: "unknown" };
  }

  const link = data as RequirementLink;

  await logAuditEvent({
    userId: input.updatedBy,
    action: "requirement.link.updated",
    entity: "requirement",
    entityId: requirementId,
    payload: {
      provider,
      externalType,
      externalId: input.externalId,
      externalKey: input.externalKey ?? null,
    },
  });

  return { success: true, link };
};

export const deleteRequirementLink = async (input: {
  linkId: string;
  requirementId: string;
  projectId: string;
  removedBy: string;
}): Promise<DeleteLinkResult> => {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("requirement_links")
    .delete()
    .eq("id", input.linkId)
    .eq("requirement_id", input.requirementId)
    .eq("project_id", input.projectId)
    .select("id, provider, external_type, external_id")
    .maybeSingle();

  if (error) {
    console.error("Unable to delete requirement link", error);
    return { success: false, reason: "unknown" };
  }

  if (!data) {
    return { success: false, reason: "not_found" };
  }

  await logAuditEvent({
    userId: input.removedBy,
    action: "requirement.link.deleted",
    entity: "requirement",
    entityId: input.requirementId,
    payload: {
      provider: data.provider,
      externalType: data.external_type,
      externalId: data.external_id,
    },
  });

  return { success: true };
};
