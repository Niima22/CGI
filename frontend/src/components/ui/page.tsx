import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
  maxWidth = "7xl",
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: "6xl" | "7xl";
}) {
  const maxWidthClass = maxWidth === "6xl" ? "max-w-6xl" : "max-w-7xl";
  return <div className={cn("mx-auto w-full space-y-6", maxWidthClass, className)}>{children}</div>;
}

export function PageHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          {icon ? <span className="text-primary">{icon}</span> : null}
          <h1 className="text-[28px] font-semibold leading-tight text-foreground">{title}</h1>
        </div>
        {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold leading-none text-foreground">{value}</div>
      {detail ? <div className="mt-2 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

export function SectionSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("rounded-xl border border-border/80 bg-card shadow-card", className)}>{children}</section>;
}
