import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface FiltersState {
  q: string;
  status: string;
  priority: string;
  criticality: string;
  assignment: string;
  sla: string;
}

export const defaultFilters: FiltersState = {
  q: "",
  status: "all",
  priority: "all",
  criticality: "all",
  assignment: "all",
  sla: "all",
};

const statusOptions = [
  "Nouveau",
  "Assigné",
  "En cours",
  "En attente demandeur",
  "En attente prestataire",
  "En attente validation",
  "Résolu",
  "Fermé",
  "Réouvert",
];
const priorityOptions = ["Faible", "Moyenne", "Haute", "Urgente"];
const criticalityOptions = ["Faible", "Moyenne", "Haute", "Critique"];
const assignmentOptions = ["Affectés", "Non affectés", "Mes équipes"];
const slaOptions = ["Respecté", "En risque", "Dépassé", "Non applicable"];

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 min-w-[170px] bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TicketFilters({
  value,
  onChange,
  onReset,
}: {
  value: FiltersState;
  onChange: (v: FiltersState) => void;
  onReset: () => void;
}) {
  const set = <K extends keyof FiltersState>(k: K, v: FiltersState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Rechercher par référence, titre, catégorie ou employé…"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={value.status} onChange={(v) => set("status", v)} placeholder="Tous les statuts" options={statusOptions} />
          <FilterSelect value={value.priority} onChange={(v) => set("priority", v)} placeholder="Toutes les priorités" options={priorityOptions} />
          <FilterSelect value={value.criticality} onChange={(v) => set("criticality", v)} placeholder="Toutes les criticités" options={criticalityOptions} />
          <FilterSelect value={value.assignment} onChange={(v) => set("assignment", v)} placeholder="Toutes les affectations" options={assignmentOptions} />
          <FilterSelect value={value.sla} onChange={(v) => set("sla", v)} placeholder="Tous les statuts SLA" options={slaOptions} />
          <Button variant="ghost" size="sm" onClick={onReset} className="h-10 text-muted-foreground">
            <X className="mr-1 h-4 w-4" />
            Réinitialiser les filtres
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ActiveFilterChips({
  value,
  onChange,
  onClearAll,
}: {
  value: FiltersState;
  onChange: (v: FiltersState) => void;
  onClearAll: () => void;
}) {
  const chips: { key: keyof FiltersState; label: string }[] = [];
  if (value.status !== "all") chips.push({ key: "status", label: `Statut : ${value.status}` });
  if (value.priority !== "all") chips.push({ key: "priority", label: `Priorité : ${value.priority}` });
  if (value.criticality !== "all") chips.push({ key: "criticality", label: `Criticité : ${value.criticality}` });
  if (value.assignment !== "all") chips.push({ key: "assignment", label: `Affectation : ${value.assignment}` });
  if (value.sla !== "all") chips.push({ key: "sla", label: `SLA : ${value.sla}` });
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs text-foreground shadow-sm"
        >
          {c.label}
          <button
            type="button"
            onClick={() => onChange({ ...value, [c.key]: "all" })}
            className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-[color:var(--cgi-purple)] hover:underline"
      >
        Effacer tous les filtres
      </button>
    </div>
  );
}