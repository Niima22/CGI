import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, Mail, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Aide - CGI-FLOW" },
      {
        name: "description",
        content: "Support et assistance pour CGI-FLOW.",
      },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <AppShell lockScroll>
      <div className="mx-auto flex h-full w-full max-w-[980px] flex-col justify-center space-y-5 overflow-y-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Aide</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Points de contact et controles rapides pour votre session CGI-FLOW.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/my-profile">
              <ShieldCheck />
              Verifier mon profil
            </Link>
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Support fonctionnel
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pour un probleme de compte, de role ou d'acces a un module, contactez votre pilote CGI
              ou l'administrateur local Keycloak.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Verification rapide
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Si une page est refusee, verifiez que votre session utilise le bon role: Pilote,
              Superviseur ou Agent.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
