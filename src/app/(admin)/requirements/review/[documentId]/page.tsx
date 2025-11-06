"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/dialog";
import { AI_LANGUAGE_OPTIONS } from "@/lib/ai/languages";
import type { ImprovementResult } from "@/components/requirements/improve-requirement";
import { PageHeader } from "@/components/layout/page-header";
import { fetchWithCsrf } from "@/lib/security/csrf";

type RequirementCandidate = {
  id: string;
  text: string;
  type: string | null;
  confidence: number | null;
  rationale: string | null;
  status: string;
  page_id: string | null;
  page_number?: number;
  project_id: string;
  requirement_id: string | null;
};

type RequirementDocument = {
  id: string;
  name: string;
  status: string;
  project_id: string;
  pages: number | null;
  created_at: string | null;
  batches_processed: number | null;
  candidates_imported: number | null;
  last_processed_at: string | null;
};

type RequirementPage = {
  id: string;
  page_number: number;
  status: string;
  ocr_confidence: number | null;
  text: string | null;
};

type DuplicateGroup = {
  representativeId: string;
  duplicates: string[];
};

type JiraAvailableProject = {
  key?: string;
  name?: string;
};

type JiraConfig = {
  projectKey: string | null;
  issueType: string | null;
  availableProjects: JiraAvailableProject[];
} | null;

type DocumentResponse = {
  document: RequirementDocument;
  pages: RequirementPage[];
  candidates: RequirementCandidate[];
  duplicates: DuplicateGroup[];
  jira: JiraConfig;
};

const REQUIREMENT_TYPES = [
  { value: "functional", label: "Funcional" },
  { value: "non_functional", label: "No funcional" },
  { value: "security", label: "Seguridad" },
  { value: "performance", label: "Performance" },
  { value: "ux", label: "UX" },
];

const STATUS_BADGES: Record<
  string,
  { border: string; text: string; bg: string }
> = {
  draft: {
    border: "border-slate-300",
    text: "text-slate-700",
    bg: "bg-slate-100",
  },
  low_confidence: {
    border: "border-amber-300",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  approved: {
    border: "border-emerald-300",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  rejected: {
    border: "border-rose-300",
    text: "text-rose-700",
    bg: "bg-rose-50",
  },
};

export default function ReviewPage() {
  const params = useParams();
  const rawDocumentId = params?.documentId;
  const documentId =
    typeof rawDocumentId === "string"
      ? rawDocumentId
      : Array.isArray(rawDocumentId)
        ? rawDocumentId[0]
        : undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<RequirementDocument | null>(null);
  const [candidates, setCandidates] = useState<RequirementCandidate[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [jiraConfig, setJiraConfig] = useState<JiraConfig>(null);
  const [jiraFormCandidate, setJiraFormCandidate] = useState<string | null>(null);
  const [jiraStatus, setJiraStatus] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});
  const [blockedModal, setBlockedModal] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateDrafts, setCandidateDrafts] = useState<Record<string, string>>({});
  const showBlockedModal = (
    message: string,
    title = "Acción no permitida",
  ) => {
    setBlockedModal({ title, message });
  };

  useEffect(() => {
    if (!documentId) {
      setDocument(null);
      setCandidates([]);

      setDuplicates([]);
      setJiraConfig(null);
      setError("Documento no encontrado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchWithCsrf(`/api/documents/${documentId}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "No se pudo cargar el documento");
        }
        return response.json() as Promise<DocumentResponse>;
      })
      .then((payload) => {
        setDocument(payload.document);
        const pageMap = new Map<string, number>();
        payload.pages.forEach((page) => pageMap.set(page.id, page.page_number));
        setCandidates(
          payload.candidates.map((candidate) => ({
            ...candidate,
            page_number: candidate.page_id
              ? pageMap.get(candidate.page_id) ?? undefined
              : undefined,
          })),
        );
        setDuplicates(payload.duplicates ?? []);
        setJiraConfig(payload.jira ?? null);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      })
      .finally(() => setLoading(false));
  }, [documentId]);

  const groupedByStatus = useMemo(() => {
    return candidates.reduce<Record<string, RequirementCandidate[]>>(
      (groups, candidate) => {
        const status = candidate.status ?? "draft";
        if (!groups[status]) {
          groups[status] = [];
        }
        groups[status].push(candidate);
        return groups;
      },
      {},
    );
  }, [candidates]);

  const duplicateLookup = useMemo(() => {
    const map = new Map<string, RequirementCandidate[]>();
    const candidateById = new Map(
      candidates.map((candidate) => [candidate.id, candidate]),
    );

    duplicates.forEach((group) => {
      const rootCandidate = candidateById.get(group.representativeId);
      if (!rootCandidate) {
        return;
      }

      const duplicateCandidates = group.duplicates
        .map((id) => candidateById.get(id))
        .filter(
          (candidate): candidate is RequirementCandidate => Boolean(candidate),
        );

      if (duplicateCandidates.length > 0) {
        map.set(rootCandidate.id, duplicateCandidates);
      }

      duplicateCandidates.forEach((candidate) => {
        const others = [
          rootCandidate,
          ...duplicateCandidates.filter((dup) => dup.id !== candidate.id),
        ];
        if (others.length > 0) {
          map.set(candidate.id, others);
        }
      });
    });

    return map;
  }, [candidates, duplicates]);

  const updateCandidateLocal = (id: string, updates: Partial<RequirementCandidate>) => {
    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === id ? { ...candidate, ...updates } : candidate,
      ),
    );
    if (typeof updates.text === "string") {
      setCandidateDrafts((prev) => {
        if (prev[id] === updates.text) {
          return prev;
        }
        const nextText = updates.text as string;
        return { ...prev, [id]: nextText };
      });
    }
  };

  const handleDraftChange = (id: string, value: string) => {
    setCandidateDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleCandidateUpdate = async (
    id: string,
    updates: { text?: string; type?: string | null; rationale?: string | null },
  ) => {
    setProcessingId(id);
    try {
      const response = await fetchWithCsrf(
        `/api/documents/${documentId}/candidates/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", ...updates }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 403 || response.status === 429) {
          showBlockedModal(
            payload?.error ??
              (response.status === 403
                ? "No tenes permisos para actualizar candidatos en este proyecto."
                : "Alcanzaste el límite diario de acciones. Intenta nuevamente mañana."),
          );
          return;
        }
        throw new Error(payload?.error ?? "No se pudo actualizar el candidato");
      }

      const payload = (await response.json()) as {
        candidate?: RequirementCandidate;
      };
      if (payload.candidate) {
        updateCandidateLocal(id, payload.candidate);
      } else {
        updateCandidateLocal(id, updates);
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al actualizar candidato",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleCandidateReject = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetchWithCsrf(
        `/api/documents/${documentId}/candidates/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject" }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 403 || response.status === 429) {
          showBlockedModal(
            payload?.error ??
              (response.status === 403
                ? "No tenes permisos para rechazar candidatos en este proyecto."
                : "Alcanzaste el límite diario de acciones. Intenta nuevamente mañana."),
          );
          return;
        }
        throw new Error(payload?.error ?? "No se pudo rechazar el candidato");
      }

      updateCandidateLocal(id, { status: "rejected" });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al rechazar candidato",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleCandidateApprove = async (
    candidate: RequirementCandidate,
    overrides: { title: string; description: string; type?: string | null },
  ) => {
    setProcessingId(candidate.id);
    try {
      const response = await fetchWithCsrf(
        `/api/documents/${documentId}/candidates/${candidate.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            title: overrides.title,
            description: overrides.description,
            type: overrides.type ?? candidate.type,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 403 || response.status === 429) {
          showBlockedModal(
            payload?.error ??
              (response.status === 403
                ? "No tenes permisos para aprobar candidatos en este proyecto."
                : "Alcanzaste el límite diario de acciones. Intenta nuevamente mañana."),
          );
          return;
        }
        throw new Error(payload?.error ?? "No se pudo aprobar el candidato");
      }

      const payload = (await response.json()) as {
        requirement?: { id: string };
      };

      updateCandidateLocal(candidate.id, {
        status: "approved",
        requirement_id: payload.requirement?.id ?? candidate.requirement_id,
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al aprobar candidato",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleAiApply = async (
    candidate: RequirementCandidate,
    payload: { improvedText: string; typeSuggestion?: string | null },
  ) => {
    const updates: { text?: string; type?: string | null } = {};
    const trimmed = payload.improvedText.trim();
    if (trimmed.length > 0 && trimmed !== candidate.text) {
      handleDraftChange(candidate.id, payload.improvedText);
      updates.text = payload.improvedText;
    }
    if (
      payload.typeSuggestion &&
      payload.typeSuggestion.length > 0 &&
      payload.typeSuggestion !== candidate.type
    ) {
      updates.type = payload.typeSuggestion;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await handleCandidateUpdate(candidate.id, updates);
  };

  const pushToJira = async (
    candidate: RequirementCandidate,
    formData: { projectKey: string; issueType: string; labels: string[] },
  ) => {
    if (!candidate.requirement_id) {
      setJiraStatus((prev) => ({
        ...prev,
        [candidate.id]: {
          type: "error",
          message: "El candidato aun no esta vinculado a un requerimiento.",
        },
      }));
      return;
    }

    try {
      const response = await fetchWithCsrf(
        `/api/requirements/${candidate.requirement_id}/jira/push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectKey: formData.projectKey,
            issueType: formData.issueType,
            labels: formData.labels.length > 0 ? formData.labels : undefined,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 403 || response.status === 429) {
          showBlockedModal(
            payload?.error ??
              (response.status === 403
                ? "No tenes permisos para sincronizar con Jira desde este proyecto."
                : "Alcanzaste el límite diario de acciones. Intenta nuevamente mañana."),
          );
          setJiraFormCandidate(null);
          return;
        }
        throw new Error(payload?.error ?? "No se pudo empujar a Jira");
      }

      const payload = await response.json();
      setJiraStatus((prev) => ({
        ...prev,
        [candidate.id]: {
          type: "success",
          message: payload?.message ?? "Issue creado o actualizado en Jira.",
        },
      }));
      setJiraFormCandidate(null);
    } catch (err) {
      console.error(err);
      setJiraStatus((prev) => ({
        ...prev,
        [candidate.id]: {
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Error desconocido al empujar a Jira",
        },
      }));
    }
  };

  const candidateBuckets = useMemo(() => {
    return [
      { key: "draft", label: "Pendientes", items: groupedByStatus["draft"] ?? [] },
      {
        key: "low_confidence",
        label: "Baja confianza",
        items: groupedByStatus["low_confidence"] ?? [],
      },
      {
        key: "approved",
        label: "Aprobados",
        items: groupedByStatus["approved"] ?? [],
      },
      {
        key: "rejected",
        label: "Rechazados",
        items: groupedByStatus["rejected"] ?? [],
      },
    ];
  }, [groupedByStatus]);

  useEffect(() => {
    setCandidateDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      candidates.forEach((candidate) => {
        if (!(candidate.id in next)) {
          next[candidate.id] = candidate.text;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [candidates]);

  useEffect(() => {
    const firstBucket = candidateBuckets.find((bucket) => bucket.items.length > 0);

    if (!firstBucket) {
      if (selectedStatus !== null) {
        setSelectedStatus(null);
      }
      if (selectedCandidateId !== null) {
        setSelectedCandidateId(null);
      }
      return;
    }

    const currentBucket = candidateBuckets.find(
      (bucket) => bucket.key === selectedStatus && bucket.items.length > 0,
    );

    if (!currentBucket) {
      setSelectedStatus(firstBucket.key);
      setSelectedCandidateId(firstBucket.items[0]?.id ?? null);
      return;
    }

    if (
      !selectedCandidateId ||
      !currentBucket.items.some((candidate) => candidate.id === selectedCandidateId)
    ) {
      setSelectedCandidateId(currentBucket.items[0]?.id ?? null);
    }
  }, [candidateBuckets, selectedStatus, selectedCandidateId]);

  const activeCandidate =
    selectedCandidateId != null
      ? candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null
      : null;
  const visibleCandidates =
    selectedStatus != null
      ? candidateBuckets.find((bucket) => bucket.key === selectedStatus)?.items ?? []
      : candidateBuckets.find((bucket) => bucket.items.length > 0)?.items ?? [];
  const activeDraftText = activeCandidate
    ? candidateDrafts[activeCandidate.id] ?? activeCandidate.text
    : "";
  const activeDuplicates = activeCandidate
    ? duplicateLookup.get(activeCandidate.id) ?? []
    : [];
  const hasAnyCandidates = candidateBuckets.some(
    (bucket) => bucket.items.length > 0,
  );
  const currentIndex = activeCandidate
    ? visibleCandidates.findIndex((item) => item.id === activeCandidate.id)
    : -1;
  const totalInStatus = visibleCandidates.length;
  const activeBucketLabel =
    (selectedStatus
      ? candidateBuckets.find((bucket) => bucket.key === selectedStatus)?.label
      : candidateBuckets.find((bucket) => bucket.items.length > 0)?.label) ??
    "";

  const handleSelectCandidate = (id: string) => {
    setSelectedCandidateId(id);
  };

  const handleNavigate = (direction: number) => {
    if (totalInStatus === 0) {
      return;
    }
    if (currentIndex === -1) {
      setSelectedCandidateId(visibleCandidates[0].id);
      return;
    }
    const nextIndex =
      (currentIndex + direction + totalInStatus) % totalInStatus;
    setSelectedCandidateId(visibleCandidates[nextIndex].id);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Cargando documento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Error</h1>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="space-y-4">
        <p>No se encontro el documento solicitado.</p>
      </div>
    );
  }

  const statusSummary = candidateBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: bucket.items.length,
  }));

  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-10">
      <PageHeader
        title="Revisar candidatos"
        description="Evalua, mejora y aprueba los requerimientos extraidos desde PDF."
        backHref={`/projects/${document.project_id}`}
        backLabel="Volver al proyecto"
        actions={
          <span className="rounded-full border border-slate-300 px-2 py-0.5 font-mono text-[10px] text-slate-500">
            {document.id}
          </span>
        }
      />

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">
            Revisar candidatos de requerimientos
          </h2>
          <p className="text-sm text-slate-600">
            Documento <strong>{document.name}</strong>. Estado:{" "}
            <span className="font-medium">{document.status}</span>.{" "}
            {document.pages ? `${document.pages} paginas.` : null}
          </p>
          <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>
              Lotes procesados: {document.batches_processed ?? 0}
            </span>
            <span>
              Candidatos importados: {document.candidates_imported ?? 0}
            </span>
            <span>
              Ultimo procesado: {document.last_processed_at ?? "sin ejecuciones"}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statusSummary.map((item) => {
          const tone = STATUS_BADGES[item.key] ?? STATUS_BADGES.draft;
          return (
            <div
              key={item.key}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                {item.count}
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tone.border} ${tone.bg} ${tone.text}`}
                >
                  {item.key}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      {!hasAnyCandidates ? (
        <p className="text-sm text-muted-foreground">
          No hay candidatos registrados para este documento.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {candidateBuckets.map((bucket) => {
                const isActive = selectedStatus === bucket.key;
                return (
                  <button
                    key={bucket.key}
                    type="button"
                    onClick={() => setSelectedStatus(bucket.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      isActive
                        ? "border-black bg-black text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {bucket.label} ({bucket.items.length})
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                {activeBucketLabel} · {totalInStatus}{" "}
                {totalInStatus === 1 ? "candidato" : "candidatos"}
              </span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleNavigate(-1)}
                  disabled={totalInStatus <= 1}
                  className="rounded-full border border-slate-300 px-2 py-1 text-xs hover:border-slate-400"
                >
                  ←
                </Button>
                <span className="min-w-[3rem] text-center font-semibold text-slate-700">
                  {totalInStatus === 0 ? "0/0" : `${currentIndex + 1}/${totalInStatus}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleNavigate(1)}
                  disabled={totalInStatus <= 1}
                  className="rounded-full border border-slate-300 px-2 py-1 text-xs hover:border-slate-400"
                >
                  →
                </Button>
              </div>
            </div>
          </div>

          {visibleCandidates.length > 0 ? (
            <div className="flex items-center justify-center gap-2">
              {visibleCandidates.map((candidate) => {
                const isActive = candidate.id === selectedCandidateId;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => handleSelectCandidate(candidate.id)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      isActive
                        ? "bg-black"
                        : "bg-slate-300 hover:bg-slate-400"
                    }`}
                    aria-label="Seleccionar candidato"
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay candidatos en este estado.
            </p>
          )}

          {activeCandidate ? (
            <CandidateDetail
              candidate={activeCandidate}
              duplicateCandidates={activeDuplicates}
              draftText={activeDraftText}
              onDraftChange={handleDraftChange}
              onUpdate={handleCandidateUpdate}
              onApprove={handleCandidateApprove}
              onReject={handleCandidateReject}
              processingId={processingId}
              projectId={activeCandidate.project_id}
              jiraConfig={jiraConfig}
              jiraFormCandidate={jiraFormCandidate}
              setJiraFormCandidate={setJiraFormCandidate}
              jiraStatus={jiraStatus}
              pushToJira={pushToJira}
              onApplyAi={handleAiApply}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecciona un candidato para revisarlo.
            </p>
          )}
        </div>
      )}
      </section>

      <Modal
        open={blockedModal !== null}
        onClose={() => setBlockedModal(null)}
        title={blockedModal?.title ?? "Acción bloqueada"}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{blockedModal?.message}</p>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setBlockedModal(null)}>
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

type CandidateDetailProps = {
  candidate: RequirementCandidate;
  duplicateCandidates: RequirementCandidate[];
  draftText: string;
  onDraftChange: (id: string, value: string) => void;
  onUpdate: (
    id: string,
    updates: { text?: string; type?: string | null; rationale?: string | null },
  ) => Promise<void>;
  onApprove: (
    candidate: RequirementCandidate,
    overrides: { title: string; description: string; type?: string | null },
  ) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  processingId: string | null;
  projectId: string;
  jiraConfig: JiraConfig;
  jiraFormCandidate: string | null;
  setJiraFormCandidate: (value: string | null) => void;
  jiraStatus: Record<string, { type: "success" | "error"; message: string }>;
  pushToJira: (
    candidate: RequirementCandidate,
    formData: { projectKey: string; issueType: string; labels: string[] },
  ) => Promise<void>;
  onApplyAi: (
    candidate: RequirementCandidate,
    payload: { improvedText: string; typeSuggestion?: string | null },
  ) => Promise<void>;
};

const CandidateDetail = ({
  candidate,
  duplicateCandidates,
  draftText,
  onDraftChange,
  onUpdate,
  onApprove,
  onReject,
  processingId,
  projectId,
  jiraConfig,
  jiraFormCandidate,
  setJiraFormCandidate,
  jiraStatus,
  pushToJira,
  onApplyAi,
}: CandidateDetailProps) => {
  const isProcessing = processingId === candidate.id;
  const jiraMessage = jiraStatus[candidate.id];
  const [titleDraft, descriptionDraft] = useMemo(
    () => deriveDefaultTexts(draftText),
    [draftText],
  );
  const statusTone =
    STATUS_BADGES[candidate.status] ?? STATUS_BADGES.draft;

  const handleBlur = () => {
    if (draftText.trim() !== candidate.text.trim()) {
      onUpdate(candidate.id, { text: draftText });
    }
  };

  const handleTypeChange = (value: string) => {
    const nextType = value.length > 0 ? value : null;
    if (nextType !== candidate.type) {
      onUpdate(candidate.id, { type: nextType });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_340px]">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>Pag {candidate.page_number ?? "?"}</span>
            <span>
              Confianza{" "}
              {candidate.confidence ? candidate.confidence.toFixed(2) : "N/A"}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${statusTone.border} ${statusTone.bg} ${statusTone.text}`}
          >
            {candidate.status}
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Texto del requerimiento
          </label>
          <Textarea
            value={draftText}
            onChange={(event) => onDraftChange(candidate.id, event.target.value)}
            onBlur={handleBlur}
            rows={8}
            disabled={isProcessing}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Tipo</span>
            <Select
              value={candidate.type ?? ""}
              onChange={(event) => handleTypeChange(event.target.value)}
              disabled={isProcessing}
            >
              <option value="">Sin clasificar</option>
              {REQUIREMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </label>
          {candidate.rationale ? (
            <span className="text-xs text-slate-500">{candidate.rationale}</span>
          ) : null}
        </div>

        {duplicateCandidates.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Posibles duplicados
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {duplicateCandidates.map((dup) => (
                <li key={dup.id}>
                  {dup.text.length > 160 ? `${dup.text.slice(0, 157)}...` : dup.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() =>
              onApprove(candidate, {
                title: titleDraft,
                description: descriptionDraft,
                type: candidate.type,
              })
            }
            disabled={isProcessing || candidate.status === "approved"}
          >
            Aprobar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onReject(candidate.id)}
            disabled={isProcessing || candidate.status === "rejected"}
          >
            Rechazar
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <CandidateAiAssistant
          candidate={candidate}
          draftText={draftText}
          projectId={projectId}
          onApply={onApplyAi}
          disabled={isProcessing}
        />

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Push a Jira
              </p>
              <p className="text-xs text-slate-500">
                {candidate.requirement_id
                  ? "Sincroniza este requerimiento con Jira."
                  : "Aprueba el candidato para habilitar la sincronizacion con Jira."}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setJiraFormCandidate(
                  jiraFormCandidate === candidate.id ? null : candidate.id,
                )
              }
              disabled={!candidate.requirement_id || isProcessing}
            >
              {jiraFormCandidate === candidate.id
                ? "Cerrar formulario"
                : "Abrir formulario"}
            </Button>
          </div>

          {jiraFormCandidate === candidate.id && jiraConfig ? (
            <JiraPushForm
              defaultProjectKey={jiraConfig.projectKey ?? ""}
              defaultIssueType={jiraConfig.issueType ?? "Task"}
              availableProjects={jiraConfig.availableProjects ?? []}
              onSubmit={(formData) => pushToJira(candidate, formData)}
              onCancel={() => setJiraFormCandidate(null)}
            />
          ) : null}

          {jiraMessage ? (
            <p
              className={`rounded border px-3 py-2 text-xs ${
                jiraMessage.type === "success"
                  ? "border-green-300 text-green-700"
                  : "border-red-300 text-red-700"
              }`}
            >
              {jiraMessage.message}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
};

type CandidateAiAssistantProps = {
  candidate: RequirementCandidate;
  draftText: string;
  projectId: string;
  onApply: (
    candidate: RequirementCandidate,
    payload: { improvedText: string; typeSuggestion?: string | null },
  ) => Promise<void>;
  disabled: boolean;
};

const CandidateAiAssistant = ({
  candidate,
  draftText,
  projectId,
  onApply,
  disabled,
}: CandidateAiAssistantProps) => {
  const [language, setLanguage] = useState<string>(AI_LANGUAGE_OPTIONS[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImprovementResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [candidate.id]);

  const handleImprove = async () => {
    if (draftText.trim().length < 10) {
      setError("El texto es demasiado corto para mejorarlo automaticamente.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          requirementId: candidate.requirement_id ?? null,
          text: draftText,
          language,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.error ??
            "La IA no pudo generar una propuesta en este momento.",
        );
      }

      const payload = (await response.json()) as ImprovementResult;
      setResult(payload);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "La IA no pudo generar una propuesta en este momento.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result) {
      return;
    }

    setIsApplying(true);
    setError(null);
    try {
      await onApply(candidate, {
        improvedText: result.improvedText,
        typeSuggestion: result.typeSuggestion ?? null,
      });
      setResult(null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo aplicar la mejora sugerida.",
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Mejorar con IA
        </p>
        <div className="flex gap-1">
          {AI_LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLanguage(option.value)}
              className={`rounded-full px-2 py-1 text-[11px] font-semibold transition ${
                language === option.value
                  ? "border border-black bg-black text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
              disabled={isLoading || disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Genera una propuesta automatica sobre el texto actual antes de aprobarlo. Aplicar la mejora solo actualiza el texto del candidato; aun debes aprobar o rechazar para cerrarlo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleImprove}
          disabled={isLoading || disabled}
        >
          {isLoading ? "Enviando..." : "Generar propuesta"}
        </Button>
        {result ? (
          <Button
            type="button"
            onClick={handleApply}
            disabled={isApplying || disabled}
          >
            {isApplying ? "Aplicando..." : "Aplicar mejora"}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {result ? (
        <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <div>
            <p className="font-semibold text-slate-800">Descripcion sugerida</p>
            <p className="mt-1 text-slate-700">{result.improvedText}</p>
          </div>
          {result.userStory ? (
            <div>
              <p className="font-semibold text-slate-800">Historia de usuario</p>
              <p className="mt-1 text-slate-700">{result.userStory}</p>
            </div>
          ) : null}
          {result.acceptanceCriteria.length > 0 ? (
            <div>
              <p className="font-semibold text-slate-800">
                Criterios de aceptacion
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {result.acceptanceCriteria.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.issues.length > 0 ? (
            <div>
              <p className="font-semibold text-slate-800">Issues</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {result.issues.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.typeSuggestion ? (
            <p>
              Sugerencia de tipo:{" "}
              <span className="font-semibold">{result.typeSuggestion}</span>
              {typeof result.typeConfidence === "number"
                ? ` (${Math.round(result.typeConfidence * 100)}% confianza)`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

function deriveDefaultTexts(text: string): [string, string] {
  const normalized = text.trim();
  const title = normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
  return [title, normalized];
}

type JiraPushFormProps = {
  defaultProjectKey: string;
  defaultIssueType: string;
  availableProjects: JiraAvailableProject[];
  onSubmit: (input: { projectKey: string; issueType: string; labels: string[] }) => void;
  onCancel: () => void;
};

function JiraPushForm({
  defaultProjectKey,
  defaultIssueType,
  availableProjects,
  onSubmit,
  onCancel,
}: JiraPushFormProps) {
  const [projectKey, setProjectKey] = useState(defaultProjectKey);
  const [issueType, setIssueType] = useState(defaultIssueType);
  const [labels, setLabels] = useState<string>("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      projectKey: projectKey.trim(),
      issueType: issueType.trim() || "Task",
      labels: labels
        .split(",")
        .map((label) => label.trim())
        .filter((label) => label.length > 0),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700"
    >
      <div className="flex flex-col gap-1">
        <label className="font-medium">Proyecto en Jira</label>
        {availableProjects.length > 0 ? (
          <select
            value={projectKey}
            onChange={(event) => setProjectKey(event.target.value)}
            className="rounded border border-slate-300 px-2 py-1 focus:border-black focus:outline-none"
          >
            <option value="">Seleccionar</option>
            {availableProjects.map((project) => (
              <option key={project.key ?? project.name} value={project.key ?? ""}>
                {project.key} - {project.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={projectKey}
            onChange={(event) => setProjectKey(event.target.value)}
            className="rounded border border-slate-300 px-2 py-1 focus:border-black focus:outline-none"
            placeholder="JIRA project key"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-medium">Issue type</label>
        <input
          value={issueType}
          onChange={(event) => setIssueType(event.target.value)}
          className="rounded border border-slate-300 px-2 py-1 focus:border-black focus:outline-none"
          placeholder="Story / Task / Bug..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-medium">Labels (opcional)</label>
        <input
          value={labels}
          onChange={(event) => setLabels(event.target.value)}
          className="rounded border border-slate-300 px-2 py-1 focus:border-black focus:outline-none"
          placeholder="imported,ocr"
        />
        <span className="text-xs text-slate-500">
          Separar por coma. Maximo 10 etiquetas.
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-900"
        >
          Enviar a Jira
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-500"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
