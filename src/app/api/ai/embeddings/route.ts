import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getProjectRole } from "@/lib/auth";
import { createEmbeddings } from "@/lib/ai/providers";
import { consumeRateLimit } from "@/lib/rate-limit";

const requestSchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID"),
  text: z.string().min(5).max(4000),
});

export const POST = async (request: Request) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const rateLimit = consumeRateLimit(`ai-embeddings:${session.user.id}`, 10, 60_000);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: rateLimit.retryAfter,
      },
      { status: 429 }
    );
  }

  const role = await getProjectRole(parsed.data.projectId, session.user.id);

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await createEmbeddings({ text: parsed.data.text });

  return NextResponse.json(result);
};
