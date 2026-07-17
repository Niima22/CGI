import type {
  TicketStatus,
  TicketPriority,
  TicketCriticality,
  TicketSla,
} from "@/lib/mock-tickets";

const base =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap";

export function TicketStatusBadge({ value }: { value: TicketStatus }) {
  const map: Record<TicketStatus, string> = {
    Nouveau: "bg-blue-50 text-blue-700 ring-blue-200",
    Assigné: "bg-violet-50 text-violet-700 ring-violet-200",
    "En cours": "bg-[color-mix(in_oklab,#523698_10%,white)] text-[#523698] ring-[color-mix(in_oklab,#523698_25%,white)]",
    "En attente demandeur": "bg-orange-50 text-orange-700 ring-orange-200",
    "En attente prestataire": "bg-orange-50 text-orange-700 ring-orange-200",
    "En attente validation": "bg-amber-50 text-amber-700 ring-amber-200",
    Résolu: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Fermé: "bg-gray-100 text-gray-600 ring-gray-200",
    Réouvert: "bg-pink-50 text-pink-700 ring-pink-200",
  };
  return <span className={`${base} ${map[value]}`}>{value}</span>;
}

export function TicketPriorityBadge({ value }: { value: TicketPriority }) {
  const map: Record<TicketPriority, string> = {
    Faible: "bg-gray-100 text-gray-700 ring-gray-200",
    Moyenne: "bg-blue-50 text-blue-700 ring-blue-200",
    Haute: "bg-orange-50 text-orange-700 ring-orange-200",
    Urgente: "bg-red-50 text-red-700 ring-red-200",
  };
  return <span className={`${base} ${map[value]}`}>{value}</span>;
}

export function TicketCriticalityBadge({ value }: { value: TicketCriticality }) {
  const map: Record<TicketCriticality, string> = {
    Faible: "bg-gray-100 text-gray-700 ring-gray-200",
    Moyenne: "bg-blue-50 text-blue-700 ring-blue-200",
    Haute: "bg-orange-50 text-orange-700 ring-orange-200",
    Critique: "bg-red-50 text-red-700 ring-red-200",
  };
  return <span className={`${base} ${map[value]}`}>{value}</span>;
}

export function TicketSlaBadge({ value, remaining }: { value: TicketSla; remaining?: string }) {
  const map: Record<TicketSla, string> = {
    Respecté: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "En risque": "bg-orange-50 text-orange-700 ring-orange-200",
    Dépassé: "bg-red-50 text-red-700 ring-red-200",
    "Non applicable": "bg-gray-100 text-gray-600 ring-gray-200",
  };
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`${base} ${map[value]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        {value}
      </span>
      {remaining ? (
        <span className="text-[11px] text-muted-foreground">{remaining}</span>
      ) : null}
    </div>
  );
}

export function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold text-white"
      style={{ background: "var(--gradient-cgi)" }}
    >
      {initials}
    </span>
  );
}