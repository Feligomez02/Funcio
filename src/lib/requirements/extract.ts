import type { OcrBatchResult, OcrCandidate } from "@/lib/ocr";

export interface NormalizedRequirementCandidate extends OcrCandidate {
  documentId: string;
  status: "draft" | "low_confidence";
}

export interface CandidateNormalizationOptions {
  confidenceThreshold: number;
}

export function normalizeCandidates(
  result: OcrBatchResult,
  options: CandidateNormalizationOptions,
): NormalizedRequirementCandidate[] {
  const threshold = options.confidenceThreshold ?? 0.5;

  const seen = new Set<string>();
  const normalized: NormalizedRequirementCandidate[] = [];

  for (const candidate of result.candidates) {
    const trimmed = candidate.text.trim();
    if (!trimmed) {
      continue;
    }

    if (isLikelyRequirement(trimmed)) {
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        // Duplicate requirement, skip.
        continue;
      }
      seen.add(key);

      normalized.push({
        ...candidate,
        text: trimmed,
        documentId: result.documentId,
        status: candidate.confidence >= threshold ? "draft" : "low_confidence",
      });
      continue;
    }

    // Not a standalone requirement: append as detail to previous requirement.
    const last = normalized[normalized.length - 1];
    if (last) {
      last.text = `${last.text}\n${trimmed}`;
      // Raise confidence slightly if we appended useful context.
      if (candidate.confidence !== undefined && candidate.confidence !== null) {
        last.confidence = Math.max(last.confidence, candidate.confidence);
      }
    }
  }

  return normalized;
}

function isLikelyRequirement(rawText: string): boolean {
  if (!rawText) return false;

  const text = rawText.trim();
  if (!text) return false;

  const lower = text.toLowerCase();

  const ignoredPrefixes = [
    /^caso\s+de\s+uso/i,
    /^cu[-\s]*\d+/i,
    /^pendientes?/i,
    /^notas?/i,
    /^registro\s+de\s+cambios/i,
    /^historia\s+de\s+usuario/i,
    /^hu[-\s]*\d+/i,
    /^introducci[oó]n/i,
    /^objetivos?/i,
    /^alcance/i,
    /^definiciones?/i,
    /^t[eé]rminos?/i,
    /^referencias?/i,
    /^an[eé]x?os?/i,
    /^ap[eé]ndice/i,
  ];
  if (ignoredPrefixes.some((regex) => regex.test(lower))) {
    return false;
  }

  const requirementSignals = [
    /\bcomo\s+[a-záéíóúüñ]+\b/,
    /\breq\b/,
    /\bdebe(n)?\b/,
    /\bdebería(n)?\b/,
    /\bpermit(ir|a)\b/,
    /\bnotificar\b/,
    /\bintegrar\b/,
    /\bautenticar\b/,
    /\bregistrar\b/,
    /\bmetri(c|k)as\b/,
    /\bprioridad\b/,
    /\breserv(en|ar)\b/,
    /\bsegurid(a|ad)\b/,
    /\bdisponibilid(a|ad)\b/,
    /\bconfidencialid(a|ad)\b/,
    /\btrazabilid(a|ad)\b/,
    /\brendimient(o|o)\b/,
    /\busabilidad\b/,
    /\bfuncionalidad\b/,
    /\bcumplir\b/,
    /\bgenerar\b/,
    /\banalizar\b/,
    /\bvisualizar\b/,
    /\bimplementar\b/,
    /\boptimizar\b/,
    /\bvalidar\b/,
    /\bverificar\b/,
    /\breportar\b/,
    /\bbuscar\b/,
    /\bfiltros?\b/,
    /\balertas?\b/,
    /\bnotas?\b/,
    /\btareas?\b/,
    
  ];

  return requirementSignals.some((regex) => regex.test(lower));
}
