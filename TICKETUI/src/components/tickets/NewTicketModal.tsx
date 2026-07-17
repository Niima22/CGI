import { useState } from "react";
import { CheckCircle2, UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { departments } from "@/lib/mock-tickets";

export function NewTicketModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [showError, setShowError] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = () => {
    if (!title.trim()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    setSuccess(true);
  };

  const reset = () => {
    setTitle("");
    setShowError(false);
    setSuccess(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Ticket créé avec succès</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Référence générée :{" "}
              <span className="font-mono text-foreground">INC-2026-1043</span>
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
              <Button
                className="text-white"
                style={{ background: "var(--gradient-cgi)" }}
                onClick={() => onOpenChange(false)}
              >
                Voir le ticket
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Créer un nouveau ticket</DialogTitle>
              <DialogDescription>
                Renseignez les informations nécessaires à la prise en charge de l'incident.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="title">
                  Titre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Résumez brièvement l'incident"
                  className={showError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {showError ? (
                  <p className="text-xs text-red-600">Le titre est obligatoire.</p>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" rows={4} placeholder="Décrivez le problème rencontré, son contexte et son impact…" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldSelect label="Type" placeholder="Sélectionner un type" options={["Incident", "Demande", "Problème"]} />
                <FieldSelect label="Catégorie" placeholder="Sélectionner une catégorie" options={["Accès", "Application", "Matériel", "Réseau", "Messagerie", "Sécurité", "Autre"]} />
                <FieldSelect label="Priorité" placeholder="Sélectionner une priorité" options={["Faible", "Moyenne", "Haute", "Urgente"]} />
                <FieldSelect label="Criticité" placeholder="Sélectionner une criticité" options={["Faible", "Moyenne", "Haute", "Critique"]} />
                <FieldSelect label="Département concerné" placeholder="Sélectionner un département" options={departments} />
                <FieldSelect label="Affectation" placeholder="Affectation automatique" options={["Affectation automatique", "Sara El Amrani", "Youssef Karim", "Imane Alaoui"]} />
              </div>

              <div className="grid gap-1.5">
                <Label>Pièces jointes</Label>
                <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                  <UploadCloud className="h-6 w-6 text-muted-foreground" />
                  <div className="text-sm font-medium">Déposer un fichier ou cliquer pour parcourir</div>
                  <div className="text-xs text-muted-foreground">PDF, PNG, JPG ou document bureautique</div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button className="text-white" style={{ background: "var(--gradient-cgi)" }} onClick={submit}>
                Créer le ticket
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FieldSelect({ label, placeholder, options }: { label: string; placeholder: string; options: string[] }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}