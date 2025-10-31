import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";

type DocumentSummary = {
  id: string;
  name: string;
  status: string;
  created_at: string | null;
  uploaded_by: string | null;
  batches_processed: number | null;
  candidates_imported: number | null;
  last_ocr_error: string | null;
  totalCandidates: number;
  candidateStatusCounts: Record<string, number>;
  hidden_at?: string | null;
  isRecent?: boolean;
};

type RequirementCandidatesPanelProps = {
  projectId: string;
};

export const RequirementCandidatesPanel = ({
  projectId,
}: RequirementCandidatesPanelProps) => {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingHideId, setPendingHideId] = useState<string | null>(null);
  const [blockedModal, setBlockedModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const fetchDocuments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const response = await fetch(`/api/projects/${projectId}/documents`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload?.error ?? "No se pudieron cargar los documentos OCR.",
          );
        }

        const payload = (await response.json()) as {
          documents: DocumentSummary[];
        };

        setDocuments(payload.documents ?? []);
        setError(null);
      } catch (err) {
        console.error(err);
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : "Error desconocido.");
        }
        if (!options?.silent) {
          setDocuments([]);
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [projectId],
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const activeDocuments = useMemo(
    () => documents.filter((doc) => isDocumentActive(doc)),
    [documents],
  );

  const recentDocuments = useMemo(
    () =>
      documents.filter(
        (doc) => !isDocumentActive(doc) && Boolean(doc.isRecent),
      ),
    [documents],
  );

  useEffect(() => {
    if (!activeDocuments.length) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      fetchDocuments({ silent: true });
    }, 8000);

    return () => window.clearInterval(interval);
  }, [activeDocuments.length, fetchDocuments]);

  const handleHide = useCallback(
    async (documentId: string) => {
      setPendingHideId(documentId);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/documents/${documentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hidden: true }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          if (response.status === 403 || response.status === 429) {
            setBlockedModal({
              title:
                response.status === 403
                  ? "Acción no permitida"
                  : "Límite diario alcanzado",
              message:
                payload?.error ??
                (response.status === 403
                  ? "No tenes permisos suficientes para modificar la visibilidad de los documentos en este proyecto."
                  : "Alcanzaste el límite diario de importaciones. Intenta mañana o consulta al administrador para ampliar tu cuota."),
            });
            return;
          }
          throw new Error(
            payload?.error ?? "No se pudo ocultar el documento.",
          );
        }

        await fetchDocuments({ silent: true });
        router.refresh();
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "No se pudo ocultar el documento.",
        );
      } finally {
        setPendingHideId(null);
      }
    },
    [fetchDocuments, projectId, router],
  );

  const hasActive = activeDocuments.length > 0;
  const hasRecent = recentDocuments.length > 0;
  const hasDocuments = hasActive || hasRecent;

  if (loading) {
    return (
      <Card className="space-y-2 p-6">
        <p className="text-sm text-muted-foreground">
          Buscando documentos importados...
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="space-y-2 p-6">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  if (!hasDocuments) {
    return (
      <Card className="space-y-2 p-6">
        <p className="text-sm text-muted-foreground">
          Aun no hay documentos importados para este proyecto.
        </p>
        <Modal
          open={Boolean(blockedModal)}
          onClose={() => setBlockedModal(null)}
          title={blockedModal?.title}
          description="Si necesitas ayuda adicional, contacta al administrador del proyecto."
          size="sm"
        >
          <p className="text-sm text-slate-600">{blockedModal?.message}</p>
        </Modal>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {hasActive ? (
        <section className="space-y-3">
          <header>
            <h3 className="text-sm font-semibold uppercase text-slate-500">
              En revision
            </h3>
          </header>
          <div className="space-y-3">
            {activeDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onHide={handleHide}
                hideDisabled={pendingHideId === document.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {hasRecent ? (
        <section className="space-y-3">
          <header className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold uppercase text-slate-500">
              Historial de hoy
            </h3>
            <span className="text-xs text-muted-foreground">
              Los documentos completados se ocultan automaticamente despues de 24h.
            </span>
          </header>
          <div className="space-y-3">
            {recentDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onHide={handleHide}
                hideDisabled={pendingHideId === document.id}
              />
            ))}
          </div>
        </section>
      ) : null}
      <Modal
        open={Boolean(blockedModal)}
        onClose={() => setBlockedModal(null)}
        title={blockedModal?.title}
        description="Si necesitas ayuda adicional, contacta al administrador del proyecto."
        size="sm"
      >
        <p className="text-sm text-slate-600">{blockedModal?.message}</p>
      </Modal>
    </div>
  );
};

const formatDate = (value: string | null) => {
  if (!value) return "Fecha desconocida";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "Fecha desconocida";
  return parsed.toLocaleString();
};

const statusLabel = (status: string) => {
  switch (status) {
    case "queued":
      return "En cola";
    case "processing":
      return "Procesando";
    case "completed":
      return "Listo";
    case "failed":
      return "Error";
    case "draft":
      return "Pendiente";
    case "low_confidence":
      return "Baja confianza";
    case "approved":
      return "Aprobado";
    case "rejected":
      return "Rechazado";
    default:
      return status;
  }
};

const isDocumentActive = (document: DocumentSummary) => {
  if (document.status !== "completed") {
    return true;
  }

  const counts = document.candidateStatusCounts ?? {};
  return Object.entries(counts).some(([status, count]) => {
    if (!count) return false;
    return status !== "approved" && status !== "rejected";
  });
};

const DOCUMENT_STATUS_TONES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border border-emerald-200",
  },
  processing: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border border-sky-200",
  },
  failed: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border border-rose-200",
  },
  default: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border border-slate-200",
  },
};

const CANDIDATE_STATUS_TONES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  draft: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border border-slate-200",
  },
  low_confidence: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border border-amber-200",
  },
  approved: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border border-emerald-200",
  },
  rejected: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border border-rose-200",
  },
  queued: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border border-slate-200",
  },
  processing: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border border-sky-200",
  },
};

type DocumentCardProps = {
  document: DocumentSummary;
  onHide: (documentId: string) => void;
  hideDisabled: boolean;
};

const DocumentCard = ({ document, onHide, hideDisabled }: DocumentCardProps) => {
  const router = useRouter();
  const candidateStatuses = Object.entries(
    document.candidateStatusCounts ?? {},
  );
  const docTone =
    DOCUMENT_STATUS_TONES[document.status] ?? DOCUMENT_STATUS_TONES.default;

  return (
    <Card className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold text-slate-900">
              {document.name}
            </h4>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${docTone.bg} ${docTone.text} ${docTone.border}`}
            >
              {statusLabel(document.status)}
            </span>
          </div>
          <ul className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <li>{formatDate(document.created_at)}</li>
            <li>{document.batches_processed ?? 0} lotes</li>
            <li>{document.candidates_imported ?? 0} candidatos</li>
            {document.uploaded_by ? <li>Subido por {document.uploaded_by}</li> : null}
          </ul>
          {document.last_ocr_error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Ultimo error OCR: {document.last_ocr_error}
            </p>
          ) : null}
        </div>
        <div className="text-right text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total candidatos
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {document.totalCandidates}
          </p>
        </div>
      </header>

      {candidateStatuses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {candidateStatuses.map(([status, count]) => {
            const tone =
              CANDIDATE_STATUS_TONES[status] ?? CANDIDATE_STATUS_TONES.draft;
            return (
              <span
                key={status}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone.bg} ${tone.text} ${tone.border}`}
              >
                {statusLabel(status)} · {count}
              </span>
            );
          })}
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => router.push(`/requirements/review/${document.id}`)}
          className="px-3 py-1.5 text-xs"
        >
          Revisar y aprobar
        </Button>
        {document.status !== "completed" ? (
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
            Procesando
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          onClick={() => onHide(document.id)}
          disabled={hideDisabled}
          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900"
        >
          Quitar
        </Button>
      </footer>
    </Card>
  );
};
