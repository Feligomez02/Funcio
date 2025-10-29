import { BackButton } from "@/components/layout/back-button";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
};

export const PageHeader = ({
  title,
  description,
  actions,
  leading,
  showBack = true,
  backHref = "/",
  backLabel = "Back",
}: PageHeaderProps) => {
  const hasLeading = showBack || Boolean(leading);

  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-6">
      {hasLeading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {showBack ? <BackButton fallbackHref={backHref} label={backLabel} /> : null}
          {leading}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
};
