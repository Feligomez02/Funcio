import { env, type AiProvider } from "@/env";

const MODEL_FALLBACK = env.AI_MODEL ?? "mistral-7b-instruct";
const EMBEDDING_MODEL_FALLBACK =
  env.AI_EMBEDDING_MODEL ?? env.AI_MODEL ?? "nomic-embed-text";
const GOOGLE_API_BASE = (env.AI_URL ?? "https://generativelanguage.googleapis.com").replace(
  /\/$/,
  ""
);
const GOOGLE_DEFAULT_MODEL =
  env.GOOGLE_AI_STUDIO_MODEL ?? env.AI_MODEL ?? "models/gemma-3-27b-it";
const GOOGLE_DEFAULT_EMBEDDING_MODEL =
  env.GOOGLE_AI_STUDIO_EMBEDDING_MODEL ??
  env.AI_EMBEDDING_MODEL ??
  "models/text-embedding-004";
const ALLOWED_REQUIREMENT_TYPES = new Set([
  "functional",
  "non-functional",
  "performance",
  "security",
  "usability",
  "compliance",
  "integration",
  "data",
  "other",
]);

export type ImproveRequestPayload = {
  projectSummary: string | null;
  recentRequirements: Array<{ id: string; title: string; description: string }>;
  text: string;
  language: string;
  currentType?: string | null;
};

export type ImproveResponse = {
  improvedText: string;
  userStory: string;
  acceptanceCriteria: string[];
  issues: string[];
  confidence: number;
  tokensUsed?: number;
  provider: AiProvider;
  language: string;
  embedding?: {
    vector: number[];
    provider: AiProvider;
    model: string;
  } | null;
  typeSuggestion: string | null;
  typeConfidence: number | null;
  typeReason: string | null;
  typeChangeNote: string | null;
};

const REQUEST_TIMEOUT_MS = env.AI_REQUEST_TIMEOUT_MS ?? 120_000;

const fetchWithTimeout = async (input: RequestInfo, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };

    if (env.AI_PROVIDER !== "google" && env.AI_SERVER_API_KEY) {
      headers.Authorization = `Bearer ${env.AI_SERVER_API_KEY}`;
    }

    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `AI request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. Ensure the model is pulled and the host (${env.AI_URL}) is reachable.`
      );
    }

    throw error;
  }
};

const buildContextBlock = (
  summary: string | null,
  requirements: Array<{ title: string; description: string }>,
  currentType: string | null | undefined
) => {
  const lines: string[] = [];

  if (summary) {
    lines.push(`PROJECT_SUMMARY: ${summary}`);
  }

  if (currentType) {
    lines.push(`CURRENT_TYPE: ${currentType}`);
  }

  if (requirements.length > 0) {
    lines.push("RECENT_REQUIREMENTS:");
    requirements.slice(0, 5).forEach((requirement, index) => {
      lines.push(
        `${index + 1}. ${requirement.title} -> ${requirement.description}`
      );
    });
  }

  return lines.join("\n");
};

const buildImprovementPrompt = (payload: ImproveRequestPayload) => {
  const context = buildContextBlock(
    payload.projectSummary,
    payload.recentRequirements,
    payload.currentType ?? null
  );

  return [
    {
      role: "system",
      content: `You are an experienced assistant specialized in refining software functional requirements.
You must always reply with valid JSON that matches exactly the following schema:
{
  improvedText: string;
  userStory: string;
  acceptanceCriteria: string[];
  issues: string[];
  confidence: number; // between 0 and 1
  tokensUsed?: number;
  provider: string;
  typeSuggestion: string; // one of functional, non-functional, security, performance, usability, compliance, integration, data, other
  typeConfidence: number; // between 0 and 1
  typeReason: string; // short explanation (max 240 chars)
  typeChangeNote: string; // concise note (max 240 chars) an analyst can paste into a change log explaining why the type should change
}
Do NOT include any additional keys or prose outside JSON. Respond exclusively in ${payload.language}.`,
    },
    {
      role: "user",
      content: [
        context,
        "INPUT_TEXT:",
        payload.text,
        "INSTRUCTIONS:",
        "1. Rephrase the requirement to be unambiguous and concise.",
        "2. Suggest at least one user story in the format 'As a <role> I want <action> so that <benefit>'.",
        "3. Provide 2-5 acceptance criteria in Gherkin style.",
        "4. List ambiguous terms, missing context, or risks as issues.",
        "5. Evaluate whether the CURRENT_TYPE matches the requirement. Use the allowed type list; if the current type is appropriate, repeat it. Otherwise, choose the best fitting type.",
        "6. Explain briefly why you selected the type in typeReason and draft a short change note in typeChangeNote (max 240 characters).",
        "7. confidence and typeConfidence must be decimals between 0 and 1.",
        `Output language: ${payload.language}.`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
};

const parseJsonContent = (raw: string) => {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const target = start >= 0 && end >= 0 ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(target);
};

const normalizeTypeSuggestionValue = (value: string | null) => {
  if (!value) {
    return null;
  }

  const candidate = value.trim().toLowerCase();
  return ALLOWED_REQUIREMENT_TYPES.has(candidate) ? candidate : null;
};

const callLocalAI = async (payload: ImproveRequestPayload): Promise<ImproveResponse> => {
  const messages = buildImprovementPrompt(payload);
  const response = await fetchWithTimeout(`${env.AI_URL}/v1/chat/completions`, {
    method: "POST",
    body: JSON.stringify({
      model: MODEL_FALLBACK,
      temperature: 0.1,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`LocalAI request failed: ${response.status} ${message}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LocalAI response did not contain content");
  }

  const parsed = parseJsonContent(content);
  const rawSuggestion = normalizeTypeSuggestionValue(
    typeof parsed.typeSuggestion === "string" ? parsed.typeSuggestion : null
  );
  const rawReason =
    typeof parsed.typeReason === "string" && parsed.typeReason.trim().length > 0
      ? parsed.typeReason.trim()
      : null;
  const rawChangeNote =
    typeof parsed.typeChangeNote === "string" && parsed.typeChangeNote.trim().length > 0
      ? parsed.typeChangeNote.trim()
      : null;
  const typeConfidence =
    typeof parsed.typeConfidence === "number"
      ? Math.max(0, Math.min(1, Number(parsed.typeConfidence)))
      : null;

  return {
    improvedText: parsed.improvedText,
    userStory: parsed.userStory,
    acceptanceCriteria: parsed.acceptanceCriteria ?? [],
    issues: parsed.issues ?? [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    tokensUsed: json?.usage?.total_tokens ?? undefined,
    provider: "localai",
    language: payload.language,
    typeSuggestion: rawSuggestion,
    typeConfidence,
    typeReason: rawReason,
    typeChangeNote: rawChangeNote ?? rawReason ?? null,
    embedding:
      Array.isArray(parsed.embedding) && parsed.embedding.length > 0
        ? {
            vector: parsed.embedding as number[],
            provider: "localai",
            model: EMBEDDING_MODEL_FALLBACK,
          }
        : null,
  };
};

const callGoogleAI = async (
  payload: ImproveRequestPayload
): Promise<ImproveResponse> => {
  const apiKey = env.GOOGLE_AI_STUDIO_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_STUDIO_API_KEY is not configured. Set it when AI_PROVIDER=google."
    );
  }

  const modelPath = GOOGLE_DEFAULT_MODEL.startsWith("models/")
    ? GOOGLE_DEFAULT_MODEL
    : `models/${GOOGLE_DEFAULT_MODEL}`;
  const messages = buildImprovementPrompt(payload);
  const prompt = messages
    .map((message) => `### ${message.role.toUpperCase()}\n${message.content}`)
    .join("\n\n");

  const url = `${GOOGLE_API_BASE}/v1beta/${modelPath}:generateContent?key=${apiKey}`;

  const sendRequest = async (jsonMode: boolean) => {
    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
      },
    };

    if (jsonMode) {
      (body.generationConfig as Record<string, unknown>).responseMimeType =
        "application/json";
    }

    const response = await fetchWithTimeout(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      parsed = null;
    }

    return { response, raw, parsed };
  };

  let attempt = await sendRequest(true);

  const extractErrorMessage = (payload: {
    parsed: Record<string, unknown> | null;
    raw: string;
  }): string => {
    const parsed = payload.parsed;
    if (
      parsed &&
      typeof parsed.error === "object" &&
      parsed.error &&
      typeof (parsed.error as { message?: unknown }).message === "string"
    ) {
      return (parsed.error as { message: string }).message;
    }
    return payload.raw;
  };

  if (
    !attempt.response.ok &&
    extractErrorMessage(attempt).toLowerCase().includes("json mode is not enabled")
  ) {
    attempt = await sendRequest(false);
  }

  if (!attempt.response.ok) {
    const message = extractErrorMessage(attempt);
    throw new Error(
      `Google AI Studio request failed: ${attempt.response.status} ${message}`
    );
  }

  const json =
    attempt.parsed ??
    (() => {
      throw new Error("Google AI Studio response was not valid JSON");
    })();

  const candidateText =
    json?.candidates &&
    Array.isArray(json.candidates) &&
    json.candidates[0] &&
    typeof json.candidates[0] === "object"
      ? (
          (json.candidates[0] as { content?: { parts?: Array<{ text?: string }> } })
            ?.content?.parts ?? []
        ).find((part) => typeof part?.text === "string")?.text ?? null
      : null;

  if (!candidateText) {
    throw new Error("Google AI Studio response did not contain text content");
  }

  const parsed = parseJsonContent(candidateText);
  const rawSuggestion = normalizeTypeSuggestionValue(
    typeof parsed.typeSuggestion === "string" ? parsed.typeSuggestion : null
  );
  const rawReason =
    typeof parsed.typeReason === "string" && parsed.typeReason.trim().length > 0
      ? parsed.typeReason.trim()
      : null;
  const rawChangeNote =
    typeof parsed.typeChangeNote === "string" && parsed.typeChangeNote.trim().length > 0
      ? parsed.typeChangeNote.trim()
      : null;
  const typeConfidence =
    typeof parsed.typeConfidence === "number"
      ? Math.max(0, Math.min(1, Number(parsed.typeConfidence)))
      : null;

  return {
    improvedText: parsed.improvedText,
    userStory: parsed.userStory,
    acceptanceCriteria: parsed.acceptanceCriteria ?? [],
    issues: parsed.issues ?? [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    tokensUsed:
      typeof (json as Record<string, unknown>)?.usageMetadata === "object" &&
      (json as Record<string, unknown>)?.usageMetadata &&
      typeof ((json as Record<string, unknown>).usageMetadata as Record<string, unknown>)
        ?.totalTokenCount === "number"
        ? (((json as Record<string, unknown>).usageMetadata as Record<string, unknown>)
            .totalTokenCount as number)
        : undefined,
    provider: "google",
    language: payload.language,
    embedding: null,
    typeSuggestion: rawSuggestion,
    typeConfidence,
    typeReason: rawReason,
    typeChangeNote: rawChangeNote ?? rawReason ?? null,
  };
};

const callOllamaAI = async (
  payload: ImproveRequestPayload
): Promise<ImproveResponse> => {
  const messages = buildImprovementPrompt(payload);
  const response = await fetchWithTimeout(`${env.AI_URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify({
      model: MODEL_FALLBACK,
      stream: false,
      options: { temperature: 0.1 },
      messages,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${message}`);
  }

  const json = await response.json();
  const content = json?.message?.content;

  if (!content) {
    throw new Error("Ollama response did not contain content");
  }

  const parsed = parseJsonContent(content);
  const rawSuggestion = normalizeTypeSuggestionValue(
    typeof parsed.typeSuggestion === "string" ? parsed.typeSuggestion : null
  );
  const rawReason =
    typeof parsed.typeReason === "string" && parsed.typeReason.trim().length > 0
      ? parsed.typeReason.trim()
      : null;
  const rawChangeNote =
    typeof parsed.typeChangeNote === "string" && parsed.typeChangeNote.trim().length > 0
      ? parsed.typeChangeNote.trim()
      : null;
  const typeConfidence =
    typeof parsed.typeConfidence === "number"
      ? Math.max(0, Math.min(1, Number(parsed.typeConfidence)))
      : null;

  return {
    improvedText: parsed.improvedText,
    userStory: parsed.userStory,
    acceptanceCriteria: parsed.acceptanceCriteria ?? [],
    issues: parsed.issues ?? [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    tokensUsed: json?.eval_count ?? undefined,
    provider: "ollama",
    language: payload.language,
    typeSuggestion: rawSuggestion,
    typeConfidence,
    typeReason: rawReason,
    typeChangeNote: rawChangeNote ?? rawReason ?? null,
  };
};

const callHuggingFaceAI = async () => {
  throw new Error(
    "Hugging Face Inference provider is not yet implemented. Set AI_PROVIDER=localai or extend src/lib/ai/providers.ts"
  );
};

export const improveRequirement = async (
  payload: ImproveRequestPayload
): Promise<ImproveResponse> => {
  switch (env.AI_PROVIDER) {
    case "localai":
      return callLocalAI(payload);
    case "ollama":
      return callOllamaAI(payload);
    case "google":
      return callGoogleAI(payload);
    case "huggingface_inference":
      return callHuggingFaceAI();
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${env.AI_PROVIDER}`);
  }
};

export const createEmbeddings = async (input: {
  text: string;
}): Promise<{ vector: number[]; provider: AiProvider; model: string }> => {
  switch (env.AI_PROVIDER) {
    case "localai": {
      const response = await fetchWithTimeout(`${env.AI_URL}/v1/embeddings`, {
        method: "POST",
        body: JSON.stringify({
          input: input.text,
          model: EMBEDDING_MODEL_FALLBACK,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        if (response.status === 404) {
          throw new Error(
            `LocalAI embeddings failed: model "${EMBEDDING_MODEL_FALLBACK}" is not available. Pull it (e.g. 'ollama pull ${EMBEDDING_MODEL_FALLBACK}') or set AI_EMBEDDING_MODEL to an installed model.`
          );
        }
        throw new Error(
          `LocalAI embeddings failed: ${response.status} ${details}`
        );
      }

      const json = await response.json();
      const vector = json?.data?.[0]?.embedding as number[] | undefined;

      if (!vector) {
        throw new Error("LocalAI embeddings response missing data");
      }

      return { vector, provider: "localai", model: EMBEDDING_MODEL_FALLBACK };
    }
    case "ollama": {
      const response = await fetchWithTimeout(`${env.AI_URL}/api/embeddings`, {
        method: "POST",
        body: JSON.stringify({
          model: EMBEDDING_MODEL_FALLBACK,
          prompt: input.text,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        if (response.status === 404) {
          throw new Error(
            `Ollama embeddings failed: model "${EMBEDDING_MODEL_FALLBACK}" not found. Pull it first (ollama pull ${EMBEDDING_MODEL_FALLBACK}) or set AI_EMBEDDING_MODEL to an installed model.`
          );
        }
        throw new Error(
          `Ollama embeddings failed: ${response.status} ${details}`
        );
      }

      const json = await response.json();
      const vector = json?.embedding as number[] | undefined;

      if (!vector) {
        throw new Error("Ollama embeddings response missing data");
      }

      return { vector, provider: "ollama", model: EMBEDDING_MODEL_FALLBACK };
    }
    case "google": {
      const apiKey = env.GOOGLE_AI_STUDIO_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GOOGLE_AI_STUDIO_API_KEY is not configured. Set it when AI_PROVIDER=google."
        );
      }

      const embeddingModelPath = GOOGLE_DEFAULT_EMBEDDING_MODEL.startsWith("models/")
        ? GOOGLE_DEFAULT_EMBEDDING_MODEL
        : `models/${GOOGLE_DEFAULT_EMBEDDING_MODEL}`;
      const url = `${GOOGLE_API_BASE}/v1beta/${embeddingModelPath}:embedContent?key=${apiKey}`;

      const response = await fetchWithTimeout(url, {
        method: "POST",
        body: JSON.stringify({
          content: {
            parts: [{ text: input.text }],
          },
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (json?.error && typeof json.error.message === "string"
            ? json.error.message
            : null) ?? (await response.text());
        throw new Error(`Google embedding request failed: ${response.status} ${message}`);
      }

      const vector =
        (json?.embedding?.values as number[] | undefined) ??
        (json?.embedding?.value as number[] | undefined);

      if (!vector || !Array.isArray(vector)) {
        throw new Error("Google embedding response missing values");
      }

      return { vector, provider: "google", model: embeddingModelPath };
    }
    case "huggingface_inference":
      throw new Error(
        "Embeddings for Hugging Face Inference not implemented. Provide an adapter in src/lib/ai/providers.ts."
      );
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${env.AI_PROVIDER}`);
  }
};
