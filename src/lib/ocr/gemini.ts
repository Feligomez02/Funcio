import { Buffer } from "node:buffer";
import { env } from "@/env";
import type {
  OcrBatchInput,
  OcrBatchResult,
  OcrCandidate,
  OcrClient,
  OcrUsage,
} from "./index";

const MODEL_PATH =
  env.OCR_MODEL && !env.OCR_MODEL.startsWith("models/")
    ? `models/${env.OCR_MODEL}`
    : env.OCR_MODEL ?? "models/gemini-2.5-flash-lite";
const API_KEY =
  env.GOOGLE_AI_STUDIO_API_KEY ?? env.GOOGLE_API_KEY ?? env.AI_SERVER_API_KEY;
const GOOGLE_VISION_URL = `${(env.AI_URL ?? "https://generativelanguage.googleapis.com").replace(/\/$/, "")}/v1beta/${MODEL_PATH}:generateContent`;

const DEFAULT_LANGUAGE_HINT = env.OCR_LANGUAGE_HINT ?? "es,en";

export interface GeminiOcrClient extends OcrClient {
  identifyRequirements(input: OcrBatchInput): Promise<OcrBatchResult>;
}

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

type GeminiExtractionEnvelope = {
  items?: Array<{
    page: number;
    text: string;
    type?: OcrCandidate["type"];
    confidence?: number;
    rationale?: string;
  }>;
  usage?: OcrUsage;
};

function ensureApiKey() {
  if (!API_KEY) {
    throw new Error(
      "GOOGLE_AI_STUDIO_API_KEY (or GOOGLE_API_KEY) is required for Gemini OCR.",
    );
  }
}

function buildInstruction(input: OcrBatchInput) {
  const languageHint = input.languageHint ?? DEFAULT_LANGUAGE_HINT;
  const pageList = input.pageNumbers.join(", ");

  return [
    "Analiza las p\u00E1ginas indicadas del documento adjunto y detecta \u00FAnicamente requerimientos de software.",
    `Procesa exclusivamente las p\u00E1ginas: [${pageList}]`,
    "Devuelve JSON v\u00E1lido exactamente con esta forma:",
    '{ "items": [ { "page": number, "text": string, "type": "functional"|"non_functional"|"security"|"performance"|"ux", "confidence": number, "rationale": string } ] }',
    "Una entrada por requerimiento. No mezcles m\u00FAltiples requerimientos en una sola entrada.",
    "Si un requerimiento incluye notas o frases adicionales en la misma vi\u00F1eta, conserva todo dentro del mismo item.",
    "Si un requerimiento se extiende a trav\u00E9s de varias vi\u00F1etas o l\u00EDneas, comb\u00EDnalas en una sola entrada.",
    "No incluyas texto que no sea un requerimiento de software.",
    "Interpreta la sangria y la numeracion jerararquica para identificar requerimientos completos.",
    "No dividas requerimientos en varias entradas a menos que est\u00E9n claramente separados.",
    "Incluye referencias a Casos de Uso (CU-xxx), Historias de Usuario (HU-xxx) u otros identificadores asociados si describen el mismo objetivo. Identificar separadores comunes como vi\u00F1etas, n\u00FAmeros, indicadores o guiones.",
    "Ignora secciones como \"Pendientes\", \"Notas\", casillas de correo u otros encabezados informativos que no sean requerimientos.",
    "text debe contener la redacci\u00F3n literal del requerimiento completo, incluyendo contexto relevante.",
    "type usa la categor\u00EDa que mejor aplique; si no est\u00E1s seguro, usa \"functional\".",
    "confidence debe estar entre 0 y 1.",
    "rationale m\u00E1ximo 200 caracteres explicando por qu\u00E9 es un requerimiento.",
    `Idiomas esperados: ${languageHint}.`,
  ].join("\n");
}






function coerceUsage(
  envelope: GeminiExtractionEnvelope,
  response: GeminiApiResponse,
): OcrUsage | undefined {
  if (envelope.usage) {
    return envelope.usage;
  }

  if (response.usageMetadata) {
    return {
      promptTokens: response.usageMetadata.promptTokenCount,
      completionTokens: response.usageMetadata.candidatesTokenCount,
      totalTokens: response.usageMetadata.totalTokenCount,
    };
  }

  return undefined;
}

function mapCandidates(envelope: GeminiExtractionEnvelope): OcrCandidate[] {
  if (!Array.isArray(envelope.items)) {
    return [];
  }

  return envelope.items
    .filter(
      (
        item,
      ): item is {
        page: number;
        text: string;
        type?: OcrCandidate["type"];
        confidence?: number;
        rationale?: string;
      } => typeof item?.page === "number" && typeof item?.text === "string",
    )
    .map<OcrCandidate>((item) => ({
      page: item.page,
      text: item.text,
      type: item.type ?? "unknown",
      confidence:
        typeof item.confidence === "number" && !Number.isNaN(item.confidence)
          ? Math.max(0, Math.min(1, item.confidence))
          : 0,
      rationale: item.rationale,
    }));
}

export function createGeminiOcrClient(): GeminiOcrClient {
  ensureApiKey();

  return {
    async identifyRequirements(input: OcrBatchInput): Promise<OcrBatchResult> {
      if (!input.fileUrl && !input.images && !input.embeddedText && !input.buffer) {
        throw new Error(
          "Gemini OCR requires either fileUrl, images, or embeddedText for the batch.",
        );
      }

      const parts: Array<Record<string, unknown>> = [
        {
          text: buildInstruction(input),
        },
      ];

      if (input.embeddedText?.length) {
        input.embeddedText
          .sort((a, b) => a.page - b.page)
          .forEach((entry) => {
            parts.push({
              text: `page:${entry.page}\n${entry.text}`,
            });
          });
      } else if (input.buffer instanceof ArrayBuffer) {
        const base64 = Buffer.from(input.buffer).toString("base64");
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64,
          },
        });
      } else if (input.fileUrl) {
        parts.push({
          fileData: {
            mimeType: "application/pdf",
            fileUri: input.fileUrl,
          },
        });
      } else if (input.images?.length) {
        input.images
          .sort((a, b) => a.page - b.page)
          .forEach((image) => {
            parts.push({
              inlineData: {
                mimeType: "image/png",
                data: image.url,
              },
            });
          });
      }

      const body = {
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      };

      const response = await fetch(`${GOOGLE_VISION_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        throw new Error(
          `Gemini OCR request failed: ${response.status} ${errorPayload}`,
        );
      }

      const json = (await response.json()) as GeminiApiResponse;
      const contentText = json.candidates
        ?.flatMap((candidate) => candidate.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!contentText) {
        throw new Error("Gemini OCR response missing content");
      }

      let envelope: GeminiExtractionEnvelope;
      const cleanedContent = contentText.replace(/```json|```/gi, "").trim();

      try {
        envelope = JSON.parse(cleanedContent) as GeminiExtractionEnvelope;
      } catch (error) {
        throw new Error(
          `Failed to parse Gemini OCR response JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      const candidates = mapCandidates(envelope);
      const usage = coerceUsage(envelope, json);

      return {
        documentId: input.documentId,
        candidates,
        usage,
        rawResponse: json,
      };
    },
  };
}


