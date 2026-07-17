import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { employees } from "@/lib/mock-tickets";
import { Initials } from "./badges";
import { useState } from "react";

export function AssignmentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Affecter le ticket</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un employé…" className="pl-9" />
        </div>
        <div className="mt-2 space-y-2">
          {employees.map((e) => {
            const active = selected === e.name;
            return (
              <button
                key={e.name}
                type="button"
                onClick={() => setSelected(e.name)}
                className={
                  "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors " +
                  (active
                    ? "border-[color:var(--cgi-purple)] bg-[color-mix(in_oklab,var(--cgi-purple)_6%,white)]"
                    : "border-border hover:bg-muted/50")
                }
              >
                <div className="flex items-center gap-3">
                  <Initials name={e.name} />
                  <div>
                    <div className="text-sm font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.team}</div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className={e.availability === "Disponible" ? "text-emerald-600" : "text-orange-600"}>{e.availability}</div>
                  <div className="text-muted-foreground">{e.active} tickets · {e.load}</div>
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="text-white" style={{ background: "var(--gradient-cgi)" }} onClick={() => onOpenChange(false)}>
            Confirmer l'affectation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}