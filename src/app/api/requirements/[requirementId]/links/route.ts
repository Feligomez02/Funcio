import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getProjectRole } from "@/lib/auth";
import { getRequirementById } from "@/lib/data/requirements";
import {
  listRequirementLinks,
  createRequirementLink,
} from "@/lib/data/requirement-links";

const createLinkSchema = z.object({
  provider: z.string().trim().min(1, "Provider is required"),
  externalType: z.string().trim().min(1, "External type is required"),
  externalId: z.string().trim().min(1, "External id is required"),
  externalKey: z.string().trim().min(1).optional(),
  summary: z.string().trim().max(1000).optional(),
  status: z.string().trim().max(120).optional(),
  url: z
    .string()
    .trim()
    .url("URL must be valid")
    .optional(),
  metadata: z
    .object({
      matchScore: z.number().min(0).max(1).optional(),
    })
    .optional()
    .transform((value) => value ?? undefined),
});

const mapLinkResponse = (link: {
  id: string;
  requirement_id: string;
  provider: string;
  external_type: string;
  external_id: string;
  external_key: string | null;
  summary: string | null;
  status: string | null;
  url: string | null;
  created_at: string | null;
}) => ({
  id: link.id,
  requirementId: link.requirement_id,
  provider: link.provider,
  externalType: link.external_type,
  externalId: link.external_id,
  externalKey: link.external_key,
  summary: link.summary,
  status: link.status,
  url: link.url,
  createdAt: link.created_at,
});

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ requirementId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requirementId } = await params;

  if (!requirementId) {
    return NextResponse.json({ error: "Missing requirementId" }, { status: 400 });
  }

  const requirement = await getRequirementById(requirementId);

  if (!requirement) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  const role = await getProjectRole(requirement.project_id, session.user.id);

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const links = await listRequirementLinks(requirementId);

  return NextResponse.json({
    links: links.map(mapLinkResponse),
  });
};

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ requirementId: string }> }
) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requirementId } = await params;

  if (!requirementId) {
    return NextResponse.json({ error: "Missing requirementId" }, { status: 400 });
  }

  const requirement = await getRequirementById(requirementId);

  if (!requirement) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  const role = await getProjectRole(requirement.project_id, session.user.id);

  const canManage = role === "admin" || role === "analyst";

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = createLinkSchema.safeParse(raw ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  const result = await createRequirementLink({
    requirementId,
    projectId: requirement.project_id,
    provider: payload.provider,
    externalType: payload.externalType,
    externalId: payload.externalId,
    externalKey: payload.externalKey ?? null,
    summary: payload.summary ?? null,
    status: payload.status ?? null,
    url: payload.url ?? null,
    metadata: payload.metadata ?? null,
    createdBy: session.user.id,
  });

  if (!result.success) {
    if (result.reason === "duplicate") {
      return NextResponse.json(
        { error: "Link already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Unable to create link" }, { status: 500 });
  }

  return NextResponse.json({ link: mapLinkResponse(result.link) }, { status: 201 });
};
