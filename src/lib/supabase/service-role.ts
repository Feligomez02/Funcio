import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { Database } from "@/types/database";

export const createSupabaseServiceRoleClient = (): SupabaseClient<Database> =>
  createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  ) as unknown as SupabaseClient<Database>;
