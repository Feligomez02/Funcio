/**
 * OCR provider factory.
 * This file only wires configuration; the Gemini implementation lives in ./gemini.
 * Other providers can be plugged in later.
 */

import { env } from "@/env";
import { createGeminiOcrClient, type GeminiOcrClient } from "./gemini";

export interface OcrBatchInput {
  documentId: string;
  pageNumbers: number[];
  /**
   * Absolute URL to the PDF in storage. Optional if `images` is provided.
   */
  fileUrl?: string;
  /**
   * Pre-rendered page images (PNG/JPEG) when Vision input is required.
   */
  images?: Array<{ page: number; url: string }>;
  /**
   * Embedded text extracted per page when OCR is not required.
   */
  embeddedText?: Array<{ page: number; text: string }>;
  /**
   * Raw PDF bytes to send inline to the provider.
   */
  buffer?: ArrayBuffer;
  languageHint?: string;
}

export interface OcrCandidate {
  page: number;
  text: string;
  type: "functional" | "non_functional" | "security" | "performance" | "ux" | "unknown";
  confidence: number;
  rationale?: string;
}

export interface OcrUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  requests?: number;
}

export interface OcrBatchResult {
  documentId: string;
  candidates: OcrCandidate[];
  usage?: OcrUsage;
  rawResponse?: unknown;
}

export interface OcrClient {
  identifyRequirements(input: OcrBatchInput): Promise<OcrBatchResult>;
}

const SUPPORTED = ["gemini"] as const;
export type SupportedOcrProvider = (typeof SUPPORTED)[number];

function resolveProvider(): SupportedOcrProvider {
  const value = env.OCR_PROVIDER ?? "gemini";
  if (SUPPORTED.includes(value as SupportedOcrProvider)) {
    return value as SupportedOcrProvider;
  }

  throw new Error(
    `Unsupported OCR provider "${value}". Update OCR_PROVIDER env var or add a new implementation.`,
  );
}

/**
 * Returns the OCR client configured via environment variables.
 * TODO: allow dependency injection for testing.
 */
export function getOcrClient(): OcrClient {
  const provider = resolveProvider();

  switch (provider) {
    case "gemini":
      return createGeminiOcrClient();
    default: {
      const exhaustiveCheck: never = provider;
      throw new Error(`Unhandled OCR provider: ${exhaustiveCheck}`);
    }
  }
}

export type { GeminiOcrClient };
