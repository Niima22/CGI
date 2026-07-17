import { useState } from "react";
import {
  MoreHorizontal,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import type { Ticket } from "@/lib/mock-tickets";
import {
  TicketStatusBadge,
  TicketPriorityBadge,
  TicketCriticalityBadge,
  TicketSlaBadge,
  Initials,
} from "./badges";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  tickets: Ticket[];
  onOpen: (t: Ticket) => void;
  onAssign: (t: Ticket) => void;
  onStatus: (t: Ticket) => void;
}

const sortableCols = ["Référence", "Priorité", "Criticité", "SLA", "Mise à jour"];

export function TicketTable({ tickets, onOpen, onAssign, onStatus }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const total = tickets.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = tickets.slice(start, start + pageSize);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              {[
                "Référence",
                "Ticket",
                "Statut",
                "Priorité",
                "Criticité",
                "Type",
                "Catégorie",
                "Assigné à",
                "SLA",
                "Mise à jour",
                "",
              ].map((h, i) => (
                <th key={i} className="whitespace-nowrap px-4 py-3 font-medium">
                  <span className="inline-flex items-center gap-1">
                    {h}
                    {sortableCols.includes(h) ? (
                      <ChevronsUpDown className="h-3 w-3 opacity-50" />
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.reference} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{t.reference}</td>
                <td className="max-w-[260px] px-4 py-3">
                  <div className="truncate font-medium text-foreground">{t.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.description}</div>
                </td>
                <td className="px-4 py-3"><TicketStatusBadge value={t.status} /></td>
                <td className="px-4 py-3"><TicketPriorityBadge value={t.priority} /></td>
                <td className="px-4 py-3"><TicketCriticalityBadge value={t.criticality} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{t.type}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{t.category}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {t.assignee ? (
                    <div className="flex items-center gap-2">
                      <Initials name={t.assignee} />
                      <span className="text-sm">{t.assignee}</span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                      Non affecté
                    </span>
                  )}
                </td>
                <td className="px-4 py-3"><TicketSlaBadge value={t.sla} remaining={t.slaRemaining} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{t.updated}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => onOpen(t)}>
                      <Eye className="h-3.5 w-3.5" />
                      Voir détail
                    </Button>
                    <RowMenu ticket={t} onAssign={onAssign} onStatus={onStatus} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border lg:hidden">
        {rows.map((t) => (
          <div key={t.reference} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{t.reference}</span>
              <TicketSlaBadge value={t.sla} remaining={t.slaRemaining} />
            </div>
            <div className="mt-1 font-medium">{t.title}</div>
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <TicketStatusBadge value={t.status} />
              <TicketPriorityBadge value={t.priority} />
              <TicketCriticalityBadge value={t.criticality} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {t.assignee ? (
                  <>
                    <Initials name={t.assignee} />
                    <span>{t.assignee}</span>
                  </>
                ) : (
                  <span className="font-medium text-red-600">Non affecté</span>
                )}
              </div>
              <span>{t.updated}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpen(t)}>Voir détail</Button>
              <RowMenu ticket={t} onAssign={onAssign} onStatus={onStatus} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row">
        <div className="text-muted-foreground">{total} résultats</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Par page</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-muted-foreground">Page {page} sur {pages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowMenu({
  ticket,
  onAssign,
  onStatus,
}: {
  ticket: Ticket;
  onAssign: (t: Ticket) => void;
  onStatus: (t: Ticket) => void;
}) {
  const resolved = ticket.status === "Résolu" || ticket.status === "Fermé";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onAssign(ticket)}>Affecter</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAssign(ticket)}>Réaffecter</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatus(ticket)}>Modifier la priorité</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatus(ticket)}>Modifier la criticité</DropdownMenuItem>
        <DropdownMenuItem>Consulter l'historique</DropdownMenuItem>
        {resolved ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Voir la résolution</DropdownMenuItem>
            <DropdownMenuItem>Fermer le ticket</DropdownMenuItem>
            <DropdownMenuItem>Réouvrir</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}