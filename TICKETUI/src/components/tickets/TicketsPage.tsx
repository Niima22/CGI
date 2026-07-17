import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockTickets, type Ticket } from "@/lib/mock-tickets";
import { TicketKpiCard, type KpiItem } from "./kpi";
import {
  TicketFilters,
  ActiveFilterChips,
  defaultFilters,
  type FiltersState,
} from "./TicketFilters";
import { TicketTable } from "./TicketTable";
import { NewTicketModal } from "./NewTicketModal";
import { TicketDetailDrawer } from "./TicketDetailDrawer";
import { AssignmentModal } from "./AssignmentModal";
import { StatusChangeModal } from "./StatusChangeModal";
import {
  TicketEmptyState,
  TicketErrorState,
  TicketTableSkeleton,
} from "./states";

const kpis: KpiItem[] = [
  { label: "Tickets actifs", value: "12", hint: "Tickets actuellement en traitement", icon: "inbox", accent: "gradient" },
  { label: "Non affectés", value: "2", hint: "Nécessitent une affectation", icon: "alert" },
  { label: "SLA en risque", value: "3", hint: "Échéance proche", icon: "timer" },
  { label: "Tickets critiques", value: "2", hint: "Impact opérationnel élevé", icon: "flame" },
];

export function TicketsPage() {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [openNew, setOpenNew] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [demo, setDemo] = useState<"data" | "loading" | "error" | "empty">("data");

  const filtered = useMemo(() => {
    return mockTickets.filter((t) => {
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const hay = [t.reference, t.title, t.category, t.assignee ?? ""].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.criticality !== "all" && t.criticality !== filters.criticality) return false;
      if (filters.sla !== "all" && t.sla !== filters.sla) return false;
      if (filters.assignment === "Non affectés" && t.assignee) return false;
      if (filters.assignment === "Affectés" && !t.assignee) return false;
      return true;
    });
  }, [filters]);

  const reset = () => setFilters(defaultFilters);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Gestion des incidents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivi, affectation et traitement des tickets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-border bg-white p-0.5 text-xs sm:flex">
            {(["data", "loading", "empty", "error"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setDemo(k)}
                className={
                  "rounded-full px-2.5 py-1 transition-colors " +
                  (demo === k
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground")
                }
                style={demo === k ? { background: "var(--gradient-cgi)" } : undefined}
              >
                {k === "data" ? "Données" : k === "loading" ? "Chargement" : k === "empty" ? "Vide" : "Erreur"}
              </button>
            ))}
          </div>
          <Button variant="outline">
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Actualiser
          </Button>
          <Button className="text-white shadow-sm" style={{ background: "var(--gradient-cgi)" }} onClick={() => setOpenNew(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nouveau ticket
          </Button>
        </div>
      </div>

      {demo === "loading" ? (
        <TicketTableSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <TicketKpiCard key={k.label} item={k} />
            ))}
          </div>

          <TicketFilters value={filters} onChange={setFilters} onReset={reset} />
          <ActiveFilterChips value={filters} onChange={setFilters} onClearAll={reset} />

          {demo === "error" ? (
            <TicketErrorState onRetry={() => setDemo("data")} />
          ) : demo === "empty" || filtered.length === 0 ? (
            <TicketEmptyState onReset={reset} onCreate={() => setOpenNew(true)} />
          ) : (
            <TicketTable
              tickets={filtered}
              onOpen={(t) => {
                setSelected(t);
                setOpenDetail(true);
              }}
              onAssign={(t) => {
                setSelected(t);
                setOpenAssign(true);
              }}
              onStatus={(t) => {
                setSelected(t);
                setOpenStatus(true);
              }}
            />
          )}
        </>
      )}

      <NewTicketModal open={openNew} onOpenChange={setOpenNew} />
      <TicketDetailDrawer
        ticket={selected}
        open={openDetail}
        onOpenChange={setOpenDetail}
        onAssign={() => setOpenAssign(true)}
        onStatus={() => setOpenStatus(true)}
      />
      <AssignmentModal open={openAssign} onOpenChange={setOpenAssign} />
      <StatusChangeModal open={openStatus} onOpenChange={setOpenStatus} />
    </div>
  );
}