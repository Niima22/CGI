import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { TicketsPage } from "@/components/tickets/TicketsPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestion des incidents — CGI-Intranet" },
      { name: "description", content: "Supervision, affectation et traitement des tickets ITSM de CGI-Intranet." },
      { property: "og:title", content: "Gestion des incidents — CGI-Intranet" },
      { property: "og:description", content: "Supervision, affectation et traitement des tickets ITSM de CGI-Intranet." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <TicketsPage />
    </AppShell>
  );
}
