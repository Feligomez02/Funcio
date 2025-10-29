import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { logAuditEvent } from "@/lib/audit";
import type { Database, ProjectRole } from "@/types/database";
import type { User } from "@supabase/supabase-js";

type ProjectMemberRow = Database["public"]["Tables"]["project_members"]["Row"];
type ProjectMemberInsert = Database["public"]["Tables"]["project_members"]["Insert"];

export type ProjectMemberSummary = {
  id: string;
  userId: string;
  email: string | null;
  role: ProjectRole;
  status: "active" | "invited";
  createdAt: string | null;
};

export type InviteProjectMemberResult =
  | { ok: true; member: ProjectMemberSummary; newUser: boolean }
  | {
      ok: false;
      error: "user-not-found" | "duplicate-member" | "unexpected";
    };

const mapRole = (role: string): ProjectRole => {
  if (role === "analyst" || role === "admin") {
    return role;
  }
  return "collaborator";
};

export const listProjectMembers = async (
  projectId: string
): Promise<ProjectMemberSummary[]> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("id, user_id, role, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Unable to load project members", error);
    return [];
  }

  const rows = (data ?? []) as ProjectMemberRow[];

  const members = await Promise.all(
    rows.map(async (member) => {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(
          member.user_id
        );
        const user = userData?.user ?? null;
        const status = user?.email_confirmed_at ? "active" : "invited";

        return {
          id: member.id,
          userId: member.user_id,
          email: user?.email ?? null,
          role: mapRole(member.role ?? "collaborator"),
          status,
          createdAt: member.created_at,
        } satisfies ProjectMemberSummary;
      } catch (adminError) {
        console.error("Unable to load user for project member", adminError);
        return {
          id: member.id,
          userId: member.user_id,
          email: null,
          role: mapRole(member.role ?? "collaborator"),
          status: "invited",
          createdAt: member.created_at,
        } satisfies ProjectMemberSummary;
      }
    })
  );

  return members;
};

const resolveUserStatus = (user: User | null | undefined) =>
  user?.email_confirmed_at ? "active" : "invited";

export const inviteProjectMember = async (input: {
  projectId: string;
  email: string;
  role: ProjectRole;
  invitedBy: string;
}): Promise<InviteProjectMemberResult> => {
  const supabase = createSupabaseServiceRoleClient();
  const normalizedEmail = input.email.trim().toLowerCase();

  try {
    let userId: string | null = null;
    let status: "active" | "invited" = "active";
    let targetEmail = normalizedEmail;

    const { data: userList, error: listUsersError } =
      await supabase.auth.admin.listUsers({
        perPage: 200,
      });

    if (listUsersError) {
      console.error("Unable to check existing user", listUsersError);
      return { ok: false, error: "unexpected" };
    }

    const existingUser = userList?.users?.find(
      (user) => user.email?.toLowerCase() === normalizedEmail
    ) ?? null;

    if (existingUser) {
      userId = existingUser.id;
      status = resolveUserStatus(existingUser);
      targetEmail = existingUser.email ?? normalizedEmail;
    } else {
      return { ok: false, error: "user-not-found" };
    }

    if (!userId) {
      console.error("Invitation did not yield a user id");
      return { ok: false, error: "unexpected" };
    }

    const { data: existingMembership } = await supabase
      .from("project_members")
      .select("id, role, created_at")
      .eq("project_id", input.projectId)
      .eq("user_id", userId)
      .maybeSingle();

    const membership = existingMembership as
      | Pick<ProjectMemberRow, "id" | "role" | "created_at">
      | null;

    if (membership) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(
          userId
        );
        status = resolveUserStatus(userData?.user);
        targetEmail = userData?.user?.email ?? targetEmail;
      } catch (adminError) {
        console.error("Unable to refresh user info", adminError);
      }

      return {
        ok: true,
        member: {
          id: membership.id,
          userId,
          email: targetEmail,
          role: mapRole(membership.role ?? "collaborator"),
          status,
          createdAt: membership.created_at ?? null,
        },
        newUser: false,
      };
    }

    const membershipPayload: ProjectMemberInsert = {
      project_id: input.projectId,
      user_id: userId,
      role: input.role,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("project_members")
      .insert(membershipPayload)
      .select("*")
      .single();

    if (insertError || !inserted) {
      if (insertError?.code === "23505") {
        return { ok: false, error: "duplicate-member" };
      }
      console.error("Unable to add project member", insertError);
      return { ok: false, error: "unexpected" };
    }

    const insertedMember = inserted as ProjectMemberRow;

    await logAuditEvent({
      userId: input.invitedBy,
      action: "project.member.invited",
      entity: "project",
      entityId: input.projectId,
      payload: {
        email: normalizedEmail,
        role: input.role,
        invitedUserId: userId,
      },
    });

    return {
      ok: true,
      member: {
        id: insertedMember.id,
        userId,
        email: targetEmail,
        role: input.role,
        status,
        createdAt: insertedMember.created_at,
      },
      newUser: false,
    };
  } catch (error) {
    console.error("Failed to invite project member", error);
    return { ok: false, error: "unexpected" };
  }
};
