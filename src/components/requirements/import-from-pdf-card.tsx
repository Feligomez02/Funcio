"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type UploadState =
  | { status: "idle" }
  | { status: "signing" }
  | { status: "uploading"; progress: number }
  | { status: "ingesting" }
  | {
      status: "tracking";
      documentId: string;
      pages: number;
      documentStatus: string;
      totalCandidates?: number | null;
    }
  | {
      status: "ready";
      documentId: string;
      pages: number;
      totalCandidates: number;
    }
  | { status: "error"; message: string };

type ToastVariant = "info" | "success";

type ToastState =
  | null
  | {
      id: number;
      message: string;
      variant: ToastVariant;
    };

const TOAST_COLOR_CLASSES: Record<ToastVariant, string> = {
  info: "bg-slate-900 text-white shadow-slate-900/30",
  success: "bg-emerald-600 text-white shadow-emerald-600/40",
};

type StatusTone = "neutral" | "info" | "success" | "danger";

const STATUS_BADGE_TONES: Record<StatusTone, string> = {
  neutral: "border border-slate-200 bg-slate-100 text-slate-700",
  info: "border border-sky-200 bg-sky-50 text-sky-700",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border border-rose-200 bg-rose-50 text-rose-700",
};

const resolveUploadStatusDetails = (
  status: UploadState,
): { label: string; description: string; tone: StatusTone } => {
  switch (status.status) {
    case "idle":
      return {
        label: "Listo para importar",
        description: "Selecciona un PDF de requerimientos para iniciar el proceso.",
        tone: "neutral",
      };
    case "signing":
      return {
        label: "Preparando subida",
        description: "Generando un enlace seguro para almacenar el documento.",
        tone: "info",
      };
    case "uploading":
      return {
        label: "Subiendo documento",
        description: "Se está cargando el PDF al almacenamiento seguro.",
        tone: "info",
      };
    case "ingesting":
      return {
        label: "Registrando documento",
        description: "Guardando metadatos e inicializando el pipeline de OCR.",
        tone: "info",
      };
    case "tracking":
      return {
        label: `Procesando (${status.documentStatus})`,
        description:
          "El OCR está analizando las páginas y generando candidatos de requerimientos.",
        tone: "info",
      };
    case "ready":
      return {
        label: "Documento procesado",
        description:
          "Revisa los candidatos generados para aprobarlos o mejorar su contenido.",
        tone: "success",
      };
    case "error":
      return {
        label: "Error al procesar",
        description: status.message,
        tone: "danger",
      };
    default:
      return {
        label: "Estado desconocido",
        description: "No se pudo determinar el estado actual.",
        tone: "neutral",
      };
  }
};

type IngestResponse = {
  documentId: string;
  pages: number;
  document?: {
    id: string;
    status: string;
    candidates_imported: number | null;
    last_ocr_error: string | null;
  } | null;
  processing?: {
    status: string;
    processedBatches: number;
    candidatesInserted: number;
    errors: string[];
  } | null;
};

type RequirementsImportCardProps = {
  projectId: string;
  projectName?: string | null;
  maxPages?: number;
};

const MAX_PAGES_FALLBACK =
  Number(process.env.NEXT_PUBLIC_OCR_MAX_PAGES ?? "100") || 100;

export function RequirementsImportCard({
  projectId,
  projectName,
  maxPages = MAX_PAGES_FALLBACK,
}: RequirementsImportCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [toast, setToast] = useState<ToastState>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const hasRefreshed = useRef(false);
  const router = useRouter();

  const reset = useCallback(() => {
    setFile(null);
    setState({ status: "idle" });
    setToast(null);
    setIsToastVisible(false);
    hasRefreshed.current = false;
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0] ?? null;
      if (!nextFile) {
        setFile(null);
        return;
      }

      if (nextFile.type !== "application/pdf") {
        setState({
          status: "error",
          message: "Solo se aceptan archivos PDF.",
        });
        return;
      }

      setFile(nextFile);
      setState({ status: "idle" });
    },
    [],
  );

  const pushToast = useCallback((message: string, variant: ToastVariant) => {
    setToast({
      id: Date.now(),
      message,
      variant,
    });
  }, []);

  const upload = useCallback(async () => {
    if (!file) {
      setState({
        status: "error",
        message: "Selecciona un PDF para continuar.",
      });
      return;
    }

    try {
      setState({ status: "signing" });
      const signResponse = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileName: file.name,
          contentType: file.type || "application/pdf",
        }),
      });

      if (!signResponse.ok) {
        const errorBody = await signResponse.json().catch(() => ({}));
        throw new Error(
          errorBody?.error ?? "No se pudo obtener un enlace de subida.",
        );
      }

      const { signedUrl, path, bucket } = (await signResponse.json()) as {
        signedUrl: string;
        path: string;
        bucket: string;
      };

      setState({ status: "uploading", progress: 0 });

      await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/pdf",
          "Content-Length": `${file.size}`,
        },
        body: file,
      });

      setState({ status: "ingesting" });

      const ingestResponse = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          documentName: file.name,
          storagePath: path,
          storageBucket: bucket,
        }),
      });

      if (!ingestResponse.ok) {
        const errorBody = await ingestResponse.json().catch(() => ({}));
        throw new Error(
          errorBody?.error ?? "No se pudo iniciar el procesamiento.",
        );
      }

      const ingestPayload = (await ingestResponse.json()) as IngestResponse;
      const nextStatus = ingestPayload.document?.status ?? "queued";
      const totalCandidates =
        ingestPayload.document?.candidates_imported ?? 0;

      setFile(null);
      hasRefreshed.current = false;

      if (nextStatus === "failed") {
        setState({
          status: "error",
          message:
            ingestPayload.document?.last_ocr_error ??
            "El OCR fallo. Intenta nuevamente mas tarde.",
        });
        return;
      }

      if (nextStatus === "completed") {
        pushToast(
          `Listo: ${totalCandidates} ${
            totalCandidates === 1 ? "candidato" : "candidatos"
          } detectados.`,
          "success",
        );
        setState({
          status: "ready",
          documentId: ingestPayload.documentId,
          pages: ingestPayload.pages,
          totalCandidates,
        });
        router.refresh();
        hasRefreshed.current = true;
        return;
      }

      pushToast("Documento cargado. Analizando requerimientos...", "info");

      setState({
        status: "tracking",
        documentId: ingestPayload.documentId,
        pages: ingestPayload.pages,
        documentStatus: nextStatus,
        totalCandidates: ingestPayload.document?.candidates_imported ?? null,
      });
    } catch (error) {
      console.error("Upload failed", error);
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrio un error al procesar el documento.",
      });
    }
  }, [file, projectId, pushToast, router]);

  useEffect(() => {
    if (state.status !== "tracking") {
      return;
    }

    let cancelled = false;
    const { documentId, pages } = state;

    const poll = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (cancelled) return;

        const document = payload?.document as
          | {
              id: string;
              status: string;
              candidates_imported: number | null;
              last_ocr_error: string | null;
            }
          | undefined;

        if (!document) {
          return;
        }

        const candidates = Array.isArray(payload?.candidates)
          ? (payload.candidates as Array<unknown>)
          : [];

        if (document.status === "completed") {
          const total =
            typeof document.candidates_imported === "number"
              ? document.candidates_imported
              : candidates.length;

          setState({
            status: "ready",
            documentId,
            pages,
            totalCandidates: total,
          });
          pushToast(
            `Listo: ${total} ${
              total === 1 ? "candidato" : "candidatos"
            } detectados.`,
            "success",
          );
          if (!hasRefreshed.current) {
            router.refresh();
            hasRefreshed.current = true;
          }
          return;
        }

        if (document.status === "failed") {
          setState({
            status: "error",
            message:
              document.last_ocr_error ??
              "El OCR fallo. Intenta nuevamente mas tarde.",
          });
          return;
        }

        setState((prev) => {
          if (prev.status !== "tracking" || prev.documentId !== documentId) {
            return prev;
          }

          const nextTotal =
            typeof document.candidates_imported === "number"
              ? document.candidates_imported
              : prev.totalCandidates ?? candidates.length ?? null;

          if (
            prev.documentStatus === document.status &&
            prev.totalCandidates === nextTotal
          ) {
            return prev;
          }

          return {
            ...prev,
            documentStatus: document.status,
            totalCandidates: nextTotal,
          };
        });
      } catch (err) {
        console.error("Polling de documento OCR fallo", err);
      }
    };

    poll();
    const interval = window.setInterval(poll, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [state, pushToast, router]);

  const canSubmit = useMemo(
    () => !!file && ["idle", "error", "ready"].includes(state.status),
    [file, state.status],
  );

  useEffect(() => {
    if (!toast) {
      setIsToastVisible(false);
      return;
    }

    setIsToastVisible(true);
    const timeout = window.setTimeout(() => {
      setIsToastVisible(false);
      setToast(null);
    }, toast.variant === "success" ? 4000 : 3000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const statusDetails = resolveUploadStatusDetails(state);
  const statusBadgeClass = STATUS_BADGE_TONES[statusDetails.tone];
  const currentMetadata =
    state.status === "tracking" || state.status === "ready"
      ? {
          id: state.documentId,
          pages: state.pages,
          candidates:
            state.status === "ready"
              ? state.totalCandidates
              : state.totalCandidates ?? null,
        }
      : null;
  const selectedFileName = file?.name ?? null;

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Importar requerimientos desde PDF
            </h2>
            <p className="text-sm text-slate-600">
              Adjunta un PDF con notas o requerimientos del proyecto
              {projectName ? ` ${projectName}` : ""}. Procesamos hasta {maxPages}{" "}
              paginas por documento.
            </p>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="pdf-upload"
              className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-8 text-center transition hover:border-slate-400 hover:bg-slate-50"
            >
              <span className="text-sm font-semibold text-slate-900">
                Selecciona o arrastra un PDF
              </span>
              <span className="text-xs text-slate-500">
                Hasta {maxPages} paginas por documento. Solo archivos PDF.
              </span>
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={
                  state.status === "signing" || state.status === "ingesting"
                }
                className="sr-only"
              />
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
                {selectedFileName ?? "Ningun archivo seleccionado"}
              </span>
            </label>
            <p className="text-xs text-slate-500">
              Tip: agrupa notas por documento para reducir el costo de tokens y
              acelerar las revisiones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={upload} disabled={!canSubmit}>
              {state.status === "signing"
                ? "Generando enlace..."
                : state.status === "uploading"
                ? "Subiendo..."
                : state.status === "ingesting"
                ? "Registrando..."
                : "Subir y procesar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              disabled={
                state.status === "signing" ||
                state.status === "ingesting" ||
                state.status === "tracking"
              }
            >
              Reiniciar
            </Button>
            <span className="text-xs text-slate-500">
              Proyecto: <strong>{projectName ?? "sin nombre"}</strong>
            </span>
          </div>

          {state.status === "error" ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {state.message}
            </div>
          ) : null}
        </div>

        <aside className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-700 md:w-72">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estado actual
            </p>
            <span
              className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}
            >
              {statusDetails.label}
            </span>
            <p className="text-xs text-slate-500">{statusDetails.description}</p>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resumen
            </p>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>Proyecto: {projectName ?? "Sin nombre"}</li>
              <li>Limite por documento: {maxPages} paginas</li>
              {currentMetadata ? (
                <>
                  <li>ID generado: {currentMetadata.id}</li>
                  <li>
                    Paginas detectadas:{" "}
                    {currentMetadata.pages ?? "en cálculo"}
                  </li>
                  {currentMetadata.candidates != null ? (
                    <li>
                      Candidatos encontrados: {currentMetadata.candidates}
                    </li>
                  ) : null}
                </>
              ) : null}
            </ul>
          </div>

          {state.status === "ready" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                router.push(`/requirements/review/${state.documentId}`)
              }
            >
              Revisar candidatos
            </Button>
          ) : null}
        </aside>
      </div>

      {isToastVisible && toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        >
          <div
            className={`w-full max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${TOAST_COLOR_CLASSES[toast.variant]}`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
