import type { Session } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { ProjectRole } from "@/types/database";

export type SessionWithUser = Session & {
  user: Required<Session["user"]>;
};

export const getSession = async (): Promise<SessionWithUser | null> => {
  const supabase = await createSupabaseServerClient();
  // Safe: we call both getSession() and getUser() to validate authenticity
  // getUser() contacts the Supabase Auth server to authenticate the data
  const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] =
    await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]);

  if (sessionError) {
    console.error("Failed to load Supabase session", sessionError);
    return null;
  }

  if (userError) {
    console.error("Failed to validate Supabase user", userError);
    return null;
  }

  if (!sessionData.session || !userData.user) {
    return null;
  }

  return {
    ...sessionData.session,
    user: userData.user,
  } as SessionWithUser;
};

export const requireAuthenticatedUser = async () => {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session.user;
};

export const getProjectRole = async (
  projectId: string,
  userId: string
): Promise<ProjectRole | null> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle<{ role: ProjectRole }>();

  if (error) {
    console.error("Failed to retrieve project role", error);
    return null;
  }

  return data?.role ?? null;
};

export const assertProjectAccess = async (
  projectId: string,
  userId: string,
  allowedRoles: ProjectRole[]
) => {
  const role = await getProjectRole(projectId, userId);

  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Forbidden");
  }

  return role;
};

export const requireAdmin = async () => {
  const user = await requireAuthenticatedUser();

  // TODO: replace with actual admin detection (e.g. project_members or metadata).
  const isAdmin = user.app_metadata?.role === "admin";

  if (!isAdmin) {
    throw new Error("Forbidden");
  }

  return user;
};
