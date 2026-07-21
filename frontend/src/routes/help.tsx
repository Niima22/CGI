import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, Map, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageContainer, SectionSurface } from "@/components/ui/page";
import { getBusinessRoleLabel, useAuth, type Role } from "@/lib/auth-store";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Aide - CGI Intranet" },
      {
        name: "description",
        content: "Guide d'utilisation de la plateforme CGI-Intranet.",
      },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const { roles } = useAuth();
  const roleLabels = roles
    .filter((role): role is Role => ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role))
    .map(getBusinessRoleLabel);

  return (
    <AppShell>
      <PageContainer>
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LifeBuoy className="h-3.5 w-3.5" />
            Support
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">
            Aide CGI-Intranet
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Retrouvez les reperes essentiels pour naviguer dans la plateforme, consulter vos modules
            autorises et demander de l'assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HelpCard
            icon={Map}
            title="Navigation"
            text="Le menu lateral donne acces aux modules autorises par votre role. Sur mobile, ouvrez le menu depuis le bouton en haut a gauche."
          />
          <HelpCard
            icon={ShieldCheck}
            title="Acces par role"
            text={`Votre profil actuel: ${roleLabels.join(", ") || "Compte CGI"}. Les elements non autorises restent masques ou proteges.`}
          />
          <HelpCard
            icon={BookOpen}
            title="Assistance"
            text="Pour une demande de support, contactez votre referent interne CGI ou utilisez le canal d'assistance approuve par l'equipe projet."
          />
        </div>

        <SectionSurface>
          <h2 className="text-base font-semibold tracking-normal">Vue d'ensemble des modules</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              "Tickets: creation, suivi et traitement des incidents.",
              "SLA: suivi des echeances et politiques pour les profils autorises.",
              "Planning: consultation et coordination des affectations autorisees.",
              "Messagerie: conversations et echanges lies aux tickets.",
              "Profil: informations personnelles, photo et disponibilite.",
              "Notifications: alertes recentes et actions associees.",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-foreground">
                {item}
              </div>
            ))}
          </div>
        </SectionSurface>
      </PageContainer>
    </AppShell>
  );
}

function HelpCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Map;
  title: string;
  text: string;
}) {
  return (
    <SectionSurface>
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-base font-semibold tracking-normal">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </SectionSurface>
  );
}
