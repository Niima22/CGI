import { AlertTriangle, Inbox, Timer, Flame, ArrowUpRight } from "lucide-react";

export interface KpiItem {
  label: string;
  value: string;
  hint: string;
  icon: "inbox" | "alert" | "timer" | "flame";
  accent?: "gradient" | "soft";
}

const iconMap = {
  inbox: Inbox,
  alert: AlertTriangle,
  timer: Timer,
  flame: Flame,
};

export function TicketKpiCard({ item }: { item: KpiItem }) {
  const Icon = iconMap[item.icon];
  const isGradient = item.accent === "gradient";
  return (
    <button
      type="button"
      className={
        "group relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg " +
        (isGradient
          ? "border-transparent text-white"
          : "border-border bg-white hover:border-[color-mix(in_oklab,var(--cgi-purple)_30%,transparent)]")
      }
      style={
        isGradient
          ? { background: "var(--gradient-cgi)", boxShadow: "var(--shadow-cgi)" }
          : undefined
      }
    >
      <div className="flex items-start justify-between">
        <div
          className={
            "grid h-10 w-10 place-items-center rounded-xl " +
            (isGradient ? "bg-white/15 text-white" : "text-[color:var(--cgi-purple)]")
          }
          style={
            !isGradient
              ? { background: "color-mix(in oklab, var(--cgi-purple) 10%, white)" }
              : undefined
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight
          className={
            "h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100 " +
            (isGradient ? "text-white" : "text-muted-foreground")
          }
        />
      </div>
      <div className="mt-6">
        <div className={"text-xs font-medium " + (isGradient ? "text-white/80" : "text-muted-foreground")}>
          {item.label}
        </div>
        <div className="mt-1 text-3xl font-semibold tracking-tight">{item.value}</div>
        <div className={"mt-1 text-xs " + (isGradient ? "text-white/70" : "text-muted-foreground")}>
          {item.hint}
        </div>
      </div>
    </button>
  );
}