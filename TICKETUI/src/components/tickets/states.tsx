import { Inbox, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function TicketEmptyState({ onReset, onCreate }: { onReset: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
      <div
        className="grid h-14 w-14 place-items-center rounded-full text-[color:var(--cgi-purple)]"
        style={{ background: "color-mix(in oklab, var(--cgi-purple) 10%, white)" }}
      >
        <Inbox className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold">Aucun ticket trouvé</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Aucun ticket ne correspond aux critères sélectionnés.
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={onReset}>Réinitialiser les filtres</Button>
        <Button className="text-white" style={{ background: "var(--gradient-cgi)" }} onClick={onCreate}>
          Créer un ticket
        </Button>
      </div>
    </div>
  );
}

export function TicketErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-red-800">Impossible de charger les tickets</h3>
      <p className="text-sm text-red-700/80">Une erreur est survenue lors du chargement des données.</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-4 w-4" />
        Réessayer
      </Button>
    </div>
  );
}

export function TicketTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-2xl" />
      <div className="space-y-2 rounded-2xl border border-border bg-white p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}