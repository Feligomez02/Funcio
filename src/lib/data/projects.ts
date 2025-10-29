import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { logAuditEvent } from "@/lib/audit";
import type { Database, ProjectRole } from "@/types/database";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectMemberInsert = Database["public"]["Tables"]["project_members"]["Insert"];

export type ProjectWithRole = Database["public"]["Tables"]["projects"]["Row"] & {
  role: ProjectRole;
};

export const listProjectsForUser = async (
  userId: string
): Promise<ProjectWithRole[]> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data: membershipsRaw, error: membershipError } = await supabase
    .from("project_members")
    .select("project_id, role")
    .eq("user_id", userId);

  if (membershipError) {
    console.error("Unable to load project memberships", membershipError);
    return [];
  }

  const memberships = (membershipsRaw ?? []) as Array<{
    project_id: string;
    role: ProjectRole;
  }>;

  if (memberships.length === 0) {
    return [];
  }

  const projectIds = memberships.map((record) => record.project_id);

  const { data: projectsRaw, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .in("id", projectIds)
    .order("created_at", { ascending: false });

  const projects = (projectsRaw ?? []) as ProjectRow[];

  if (projectError) {
    console.error("Unable to load projects", projectError);
    return [];
  }

  return projects.map((project) => {
    const membership = memberships.find(
      (record) => record.project_id === project.id
    );

    return {
      ...project,
      role: membership?.role ?? "collaborator",
    };
  });
};

export const createProject = async (
  input: {
    name: string;
    description?: string | null;
    ownerId: string;
  }
): Promise<ProjectWithRole | null> => {
  const supabase = createSupabaseServiceRoleClient();

  const projectPayload: ProjectInsert = {
    name: input.name,
    description: input.description ?? null,
    owner_id: input.ownerId,
  };

  const { data: project, error } = await supabase
    .from("projects")
    .insert(projectPayload)
    .select()
    .single();

  if (error || !project) {
    console.error("Unable to create project", error);
    return null;
  }

  const projectRow = project as ProjectRow;

  const memberPayload: ProjectMemberInsert = {
    project_id: projectRow.id,
    user_id: input.ownerId,
    role: "admin",
  };

  await supabase.from("project_members").insert(memberPayload);

  await logAuditEvent({
    userId: input.ownerId,
    action: "project.created",
    entity: "project",
    entityId: projectRow.id,
    payload: {
      name: projectRow.name,
    },
  });

  return { ...projectRow, role: "admin" };
};

export const getProjectById = async (
  projectId: string
): Promise<Database["public"]["Tables"]["projects"]["Row"] | null> => {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load project", error);
    return null;
  }

  return data as Database["public"]["Tables"]["projects"]["Row"] | null;
};

export const updateProjectIntegrations = async (input: {
  projectId: string;
  integrations: Record<string, unknown> | null;
  updatedBy: string;
}): Promise<Database["public"]["Tables"]["projects"]["Row"] | null> => {
  const supabase = createSupabaseServiceRoleClient();

  const payload: Database["public"]["Tables"]["projects"]["Update"] = {
    integrations: input.integrations as Database["public"]["Tables"]["projects"]["Update"]["integrations"],
  };

  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", input.projectId)
    .select()
    .single();

  if (error || !data) {
    console.error("Unable to update project integrations", error);
    return null;
  }

  const auditIntegrations = input.integrations
    ? JSON.parse(JSON.stringify(input.integrations))
    : null;

  if (
    auditIntegrations &&
    typeof auditIntegrations === "object" &&
    !Array.isArray(auditIntegrations)
  ) {
    const jira = (auditIntegrations as Record<string, unknown>).jira;
    if (jira && typeof jira === "object" && !Array.isArray(jira)) {
      if ("apiToken" in jira) {
        delete (jira as Record<string, unknown>).apiToken;
      }
      if ("apiTokenEncrypted" in jira) {
        (jira as Record<string, unknown>).apiTokenEncrypted = "[redacted]";
      }
    }
  }

  await logAuditEvent({
    userId: input.updatedBy,
    action: "project.integrations.updated",
    entity: "project",
    entityId: input.projectId,
    payload: {
      integrations: auditIntegrations,
    },
  });

  return data as Database["public"]["Tables"]["projects"]["Row"];
};

export const updateProjectDetails = async (input: {
  projectId: string;
  name: string;
  description?: string | null;
  updatedBy: string;
}): Promise<ProjectRow | null> => {
  const supabase = createSupabaseServiceRoleClient();

  const trimmedName = input.name.trim();
  const trimmedDescription =
    input.description && input.description.trim().length > 0
      ? input.description.trim()
      : null;

  const payload: Database["public"]["Tables"]["projects"]["Update"] = {
    name: trimmedName,
    description: trimmedDescription,
  };

  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", input.projectId)
    .select()
    .single();

  if (error || !data) {
    console.error("Unable to update project details", error);
    return null;
  }

  await logAuditEvent({
    userId: input.updatedBy,
    action: "project.updated",
    entity: "project",
    entityId: input.projectId,
    payload: {
      name: trimmedName,
    },
  });

  return data as ProjectRow;
};

export const deleteProject = async (input: {
  projectId: string;
  deletedBy: string;
}): Promise<boolean> => {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", input.projectId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Unable to delete project", error);
    return false;
  }

  if (data) {
    await logAuditEvent({
      userId: input.deletedBy,
      action: "project.deleted",
      entity: "project",
      entityId: input.projectId,
      payload: {
        name: (data as ProjectRow).name,
      },
    });
  }

  return true;
};
