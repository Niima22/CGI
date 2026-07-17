import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const options = [
  "En attente demandeur",
  "En attente prestataire",
  "En attente validation",
  "Résolu",
];

export function StatusChangeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const requiresComment = status?.startsWith("En attente");
  const isResolved = status === "Résolu";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le statut</DialogTitle>
          <DialogDescription>Statut actuel : En cours</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setStatus(o)}
              className={
                "rounded-xl border p-3 text-left text-sm transition-colors " +
                (status === o
                  ? "border-[color:var(--cgi-purple)] bg-[color-mix(in_oklab,var(--cgi-purple)_6%,white)]"
                  : "border-border hover:bg-muted/50")
              }
            >
              {o}
            </button>
          ))}
        </div>
        {requiresComment ? (
          <div className="grid gap-1.5">
            <Label>Commentaire <span className="text-red-500">*</span></Label>
            <Textarea rows={3} placeholder="Précisez la raison de la mise en attente…" />
          </div>
        ) : null}
        {isResolved ? (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Une synthèse et un type de résolution doivent être renseignés avant de résoudre le ticket.</p>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="text-white" style={{ background: "var(--gradient-cgi)" }} onClick={() => onOpenChange(false)}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}