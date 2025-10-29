import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/types/database";

export type RequirementHistoryRow = Database["public"]["Tables"]["requirement_history"]["Row"];

export const recordRequirementHistory = async (entry: {
  requirementId: string;
  projectId: string;
  userId: string | null;
  action: string;
  changedFields?: string[];
  changeNote?: string | null;
}): Promise<void> => {
  const supabase = createSupabaseServiceRoleClient();
  const payload: Database["public"]["Tables"]["requirement_history"]["Insert"] = {
    requirement_id: entry.requirementId,
    project_id: entry.projectId,
    user_id: entry.userId,
    action: entry.action,
    changed_fields: entry.changedFields ? entry.changedFields : null,
    change_note: entry.changeNote ?? null,
  };

  await supabase.from("requirement_history").insert(payload);
};

export const listRequirementHistory = async (
  requirementId: string
): Promise<RequirementHistoryRow[]> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("requirement_history")
    .select("*")
    .eq("requirement_id", requirementId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load requirement history", error);
    return [];
  }

  return (data ?? []) as RequirementHistoryRow[];
};
