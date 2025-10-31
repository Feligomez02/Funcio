import { NextResponse } from "next/server";
import { env } from "@/env";
import { getOcrClient } from "@/lib/ocr";
import { normalizeCandidates } from "@/lib/requirements/extract";
import {
  getDocumentById,
  getQueuedDocumentPages,
  hasPendingPagesForDocument,
  insertRequirementCandidates,
  markDocumentPageFailed,
  markDocumentPageProcessed,
  markPagesAsProcessing,
  recordDocumentProcessingEvent,
  updateDocumentStatus,
} from "@/lib/data/requirements";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json } from "@/types/database";

const DEFAULT_BATCH_SIZE = 6;
const DEFAULT_MAX_BATCHES = 2;
const SIGNED_URL_TTL_SECONDS = 180;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

function isCronAuthorized(request: Request): boolean {
  if (!env.CRON_SECRET) {
    return true;
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return token === env.CRON_SECRET;
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchSize = env.OCR_BATCH_SIZE ?? DEFAULT_BATCH_SIZE;
  const maxBatchesPerTick = env.OCR_MAX_BATCHES_PER_TICK ?? DEFAULT_MAX_BATCHES;
  const confidenceThreshold =
    env.OCR_CONFIDENCE_THRESHOLD ?? DEFAULT_CONFIDENCE_THRESHOLD;

  const ocrClient = getOcrClient();
  const supabase = createSupabaseServiceRoleClient();

  let processedBatches = 0;
  let candidatesInserted = 0;
  const errors: string[] = [];

  for (let iteration = 0; iteration < maxBatchesPerTick; iteration += 1) {
    const pendingPages = await getQueuedDocumentPages(batchSize * 3);

    if (!pendingPages.length) {
      break;
    }

    const [firstPage] = pendingPages;
    const batchPages = pendingPages
      .filter((page) => page.document_id === firstPage.document_id)
      .sort((a, b) => a.page_number - b.page_number)
      .slice(0, batchSize);

    if (!batchPages.length) {
      break;
    }

    const pageIds = batchPages.map((page) => page.id);
    await markPagesAsProcessing(pageIds);

    const document = await getDocumentById(firstPage.document_id);
    if (!document) {
      await Promise.all(
        batchPages.map((page) =>
          markDocumentPageFailed(page.id, "Document not found"),
        ),
      );
      errors.push(`Document ${firstPage.document_id} not found`);
      continue;
    }

    const bucket = document.storage_bucket ?? "documents";
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signedData?.signedUrl) {
      await Promise.all(
        batchPages.map((page) =>
          markDocumentPageFailed(
            page.id,
            "Unable to generate signed URL for OCR",
          ),
        ),
      );
      errors.push(
        `Signed URL generation failed for document ${document.id}: ${signedError?.message}`,
      );
      continue;
    }

    const batchStartedAt = new Date().toISOString();

    try {
      const fileResponse = await fetch(signedData.signedUrl);
      if (!fileResponse.ok) {
        throw new Error(
          `Failed to download PDF: ${fileResponse.status} ${await fileResponse.text()}`,
        );
      }
      const arrayBuffer = await fileResponse.arrayBuffer();

      const result = await ocrClient.identifyRequirements({
        documentId: document.id,
        pageNumbers: batchPages.map((page) => page.page_number),
        fileUrl: undefined,
        embeddedText: undefined,
        images: undefined,
        buffer: arrayBuffer,
        languageHint: document.language ?? env.OCR_LANGUAGE_HINT ?? "es,en",
      });

      const normalized = normalizeCandidates(result, {
        confidenceThreshold,
      });
      let insertedCount = 0;

      if (normalized.length) {
        const pageMap = new Map(
          batchPages.map((page) => [page.page_number, page]),
        );

        const candidatePayload =
          normalized.map<Parameters<typeof insertRequirementCandidates>[0][number]>(
            (candidate) => ({
              document_id: document.id,
              project_id: document.project_id,
              page_id: pageMap.get(candidate.page)?.id ?? null,
              text: candidate.text,
              type: candidate.type === "unknown" ? null : candidate.type,
              confidence: candidate.confidence,
              rationale: candidate.rationale ?? null,
              status: candidate.status,
              created_by: null,
            }),
          );

        await insertRequirementCandidates(candidatePayload);
        insertedCount = candidatePayload.length;
        candidatesInserted += insertedCount;
      }

      await Promise.all(
        batchPages.map(async (page) => {
          const pageCandidates = normalized.filter(
            (candidate) => candidate.page === page.page_number,
          );

          const confidenceAvg =
            pageCandidates.length > 0
              ? pageCandidates.reduce(
                  (sum, candidate) => sum + candidate.confidence,
                  0,
                ) / pageCandidates.length
              : null;

          const aggregatedText = pageCandidates
            .map((candidate) => candidate.text)
            .join("\n\n");

          await markDocumentPageProcessed(page.id, {
            status: "processed",
            ocr_confidence: confidenceAvg,
            text: aggregatedText || null,
          });
        }),
      );

      const pending = await hasPendingPagesForDocument(document.id);
      const nowIso = new Date().toISOString();
      const nextStatus = pending ? "processing" : "completed";
      const nextBatches = (document.batches_processed ?? 0) + 1;
      const nextCandidates =
        (document.candidates_imported ?? 0) + insertedCount;

      await updateDocumentStatus(document.id, nextStatus, {
        last_processed_at: nowIso,
        last_ocr_error: null,
        batches_processed: nextBatches,
        candidates_imported: nextCandidates,
      });

      const metadata: Json | null =
        result.usage != null
          ? (JSON.parse(JSON.stringify({ usage: result.usage })) as Json)
          : null;

      await recordDocumentProcessingEvent({
        documentId: document.id,
        pagesProcessed: batchPages.length,
        candidatesInserted: insertedCount,
        status: "success",
        metadata,
        startedAt: batchStartedAt,
        completedAt: nowIso,
      });

      processedBatches += 1;
    } catch (error) {
      console.error("OCR batch processing failed", error);
      await Promise.all(
        batchPages.map((page) =>
          markDocumentPageFailed(
            page.id,
            error instanceof Error ? error.message : "OCR batch failed",
          ),
        ),
      );
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await updateDocumentStatus(document.id, "failed", {
        last_ocr_error: errorMessage,
      });
      await recordDocumentProcessingEvent({
        documentId: document.id,
        pagesProcessed: batchPages.length,
        candidatesInserted: 0,
        status: "failed",
        error: errorMessage,
        startedAt: batchStartedAt,
        completedAt: new Date().toISOString(),
      });
      errors.push(`OCR batch failed for document ${document.id}: ${errorMessage}`);
    }
  }

  const status = processedBatches > 0 ? "processed" : "idle";

  return NextResponse.json({
    status,
    processedBatches,
    candidatesInserted,
    errors,
  });
}
