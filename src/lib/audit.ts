import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/types/database";

const sanitizePayload = (payload: Record<string, unknown>) =>
  JSON.parse(
    JSON.stringify(payload, (_key, value) => {
      if (typeof value === "string" && value.length > 120) {
        return "[redacted]";
      }
      return value;
    })
  );

export const logAuditEvent = async (
  entry: {
    userId: string | null;
    action: string;
    entity?: string;
    entityId?: string;
    payload?: Record<string, unknown>;
  }
): Promise<void> => {
  const supabase = createSupabaseServiceRoleClient();
  const payload: Database["public"]["Tables"]["audit_logs"]["Insert"] = {
    user_id: entry.userId,
    action: entry.action,
    entity: entry.entity ?? null,
    entity_id: entry.entityId ?? null,
    payload: entry.payload ? sanitizePayload(entry.payload) : null,
  };
  await supabase.from("audit_logs" as never).insert(payload as never);
};
