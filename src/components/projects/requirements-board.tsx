"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RequirementStatus = {
  id: string;
  label: string;
};

type RequirementCardData = {
  id: string;
  title: string;
  description: string;
  status: string | null;
  priority: number | null;
  updatedAt: string | null;
};

type RequirementsBoardProps = {
  statuses: RequirementStatus[];
  requirements: RequirementCardData[];
  unassignedTitle: string;
  emptyColumnLabel: string;
  addRequirementLabel: string;
  openRequirementLabel: string;
  onCreateRequirement: (status: string | null) => void;
  onOpenRequirement: (requirementId: string) => void;
  onViewRequirement: (requirementId: string) => void;
  onMoveRequirement: (
    requirementId: string,
    fromStatus: string | null,
    toStatus: string | null
  ) => void;
  canReorder: boolean;
};

export const STATUS_COLOR_CLASSES: Record<
  string,
  { border: string; background: string; badge: string }
> = {
  analysis: {
    border: "border-sky-200",
    background: "bg-sky-50",
    badge: "bg-sky-600/10 text-sky-700 ring-1 ring-sky-200",
  },
  discovery: {
    border: "border-violet-200",
    background: "bg-violet-50",
    badge: "bg-violet-600/10 text-violet-700 ring-1 ring-violet-200",
  },
  ready: {
    border: "border-emerald-200",
    background: "bg-emerald-50",
    badge: "bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-200",
  },
  "in-progress": {
    border: "border-amber-200",
    background: "bg-amber-50",
    badge: "bg-amber-600/10 text-amber-700 ring-1 ring-amber-200",
  },
  blocked: {
    border: "border-rose-200",
    background: "bg-rose-50",
    badge: "bg-rose-600/10 text-rose-700 ring-1 ring-rose-200",
  },
  done: {
    border: "border-cyan-200",
    background: "bg-cyan-50",
    badge: "bg-cyan-600/10 text-cyan-700 ring-1 ring-cyan-200",
  },
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed.toLocaleString();
};

export const RequirementsBoard = ({
  statuses,
  requirements,
  unassignedTitle,
  emptyColumnLabel,
  addRequirementLabel,
  openRequirementLabel,
  onCreateRequirement,
  onOpenRequirement,
  onViewRequirement,
  onMoveRequirement,
  canReorder,
}: RequirementsBoardProps) => {
  const handleDragStart = (
    event: React.DragEvent<HTMLElement>,
    requirementId: string,
    fromStatus: string | null
  ) => {
    if (!canReorder) {
      return;
    }

    try {
      event.dataTransfer.setData(
        "application/json",
        JSON.stringify({ requirementId, fromStatus })
      );
      event.dataTransfer.effectAllowed = "move";
    } catch (error) {
      console.error("Unable to start drag operation", error);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!canReorder) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    event: React.DragEvent<HTMLElement>,
    toStatus: string | null
  ) => {
    if (!canReorder) {
      return;
    }
    event.preventDefault();
    const payload = event.dataTransfer.getData("application/json");
    if (!payload) {
      return;
    }
    try {
      const parsed = JSON.parse(payload) as {
        requirementId?: string;
        fromStatus?: string | null;
      };
      if (!parsed.requirementId) {
        return;
      }

      onMoveRequirement(
        parsed.requirementId,
        typeof parsed.fromStatus === "string" ? parsed.fromStatus : null,
        toStatus
      );
    } catch (error) {
      console.error("Unable to complete drop operation", error);
    }
  };

  const columns = useMemo(() => {
    const grouped = new Map<string, RequirementCardData[]>();
    const orderedStatuses = [...statuses];

    orderedStatuses.forEach((status) => {
      grouped.set(status.id, []);
    });

    const unassigned: RequirementCardData[] = [];

    requirements.forEach((requirement) => {
      if (requirement.status && grouped.has(requirement.status)) {
        grouped.get(requirement.status)?.push(requirement);
      } else {
        unassigned.push(requirement);
      }
    });

    return {
      orderedStatuses,
      unassigned,
      grouped,
    };
  }, [requirements, statuses]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.orderedStatuses.map((status) => {
        const items = columns.grouped.get(status.id) ?? [];
        const palette = STATUS_COLOR_CLASSES[status.id] ?? {
          border: "border-slate-200",
          background: "bg-white",
          badge: "bg-slate-100 text-slate-700",
        };
        return (
          <Card
            key={status.id}
            className={`flex w-80 shrink-0 flex-col gap-4 border-2 ${palette.border} ${palette.background} bg-opacity-80 p-4 backdrop-blur-sm`}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, status.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{status.label}</h3>
                <p className="text-xs text-slate-500">{items.length} item(s)</p>
              </div>
              <Button
                type="button"
                variant="tertiary"
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                onClick={() => onCreateRequirement(status.id)}
              >
                + {addRequirementLabel}
              </Button>
            </div>
            <div className="space-y-3">
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300/80 px-3 py-6 text-center text-xs text-slate-500">
                  {emptyColumnLabel}
                </p>
              ) : (
                items.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="w-full rounded-xl border border-slate-200/70 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    draggable={canReorder}
                    onDragStart={(event) =>
                      handleDragStart(event, requirement.id, requirement.status ?? null)
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onOpenRequirement(requirement.id)}
                      className="w-full text-left"
                    >
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {requirement.title}
                      </span>
                      <p className="mt-2 line-clamp-3 text-xs text-slate-600">
                        {requirement.description}
                      </p>
                    </button>
                    <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${palette.badge}`}>
                        Priority {requirement.priority ?? "?"}
                      </span>
                      <span>{formatDateTime(requirement.updatedAt) ?? "--"}</span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3 w-full text-xs"
                      onClick={() => onViewRequirement(requirement.id)}
                    >
                      {openRequirementLabel}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        );
      })}

      {columns.unassigned.length > 0 ? (
        <Card
          className="flex w-80 shrink-0 flex-col gap-4 border-2 border-amber-200 bg-amber-50/80 p-4 backdrop-blur-sm"
          onDragOver={handleDragOver}
          onDrop={(event) => handleDrop(event, null)}
        >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">{unassignedTitle}</h3>
                <p className="text-xs text-slate-400">
                  {columns.unassigned.length} item(s)
              </p>
            </div>
            <Button
              type="button"
              variant="tertiary"
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              onClick={() => onCreateRequirement(null)}
            >
                + {addRequirementLabel}
              </Button>
            </div>
            <div className="space-y-3">
              {columns.unassigned.map((requirement) => (
              <div
                key={requirement.id}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
                draggable={canReorder}
                onDragStart={(event) =>
                  handleDragStart(event, requirement.id, requirement.status ?? null)
                }
              >
                <button
                  type="button"
                  onClick={() => onOpenRequirement(requirement.id)}
                  className="w-full text-left"
                >
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {requirement.title}
                  </span>
                  <p className="mt-2 line-clamp-3 text-xs text-slate-600">
                    {requirement.description}
                  </p>
                </button>
                <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
                  <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    Priority {requirement.priority ?? "?"}
                  </span>
                  <span>{formatDateTime(requirement.updatedAt) ?? "--"}</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 w-full text-xs"
                  onClick={() => onViewRequirement(requirement.id)}
                >
                  {openRequirementLabel}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
};
