import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getProjectRole } from "@/lib/auth";
import {
  listProjectMembers,
  inviteProjectMember,
} from "@/lib/data/project-members";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const inviteSchema = z.object({
  email: z.string().email("A valid email is required"),
  role: z.enum(["collaborator", "analyst", "admin"]).default("collaborator"),
});

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const role = await getProjectRole(projectId, session.user.id);

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await listProjectMembers(projectId);
  return NextResponse.json(members);
};

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const role = await getProjectRole(projectId, session.user.id);

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);

  const result = await inviteProjectMember({
    projectId,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedBy: session.user.id,
  });

  if (!result.ok) {
    if (result.error === "user-not-found") {
      return NextResponse.json(
        {
          code: "user-not-found",
          error: dictionary.inviteMemberForm.errors["user-not-found"],
        },
        { status: 400 }
      );
    }

    if (result.error === "duplicate-member") {
      return NextResponse.json(
        {
          code: "duplicate-member",
          error: dictionary.inviteMemberForm.errors["duplicate-member"],
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        code: "generic",
        error: dictionary.inviteMemberForm.errors.generic,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(result.member, { status: 201 });
};
