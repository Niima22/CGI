import { createFileRoute } from "@tanstack/react-router";
import { AccessDeniedContent } from "@/components/app/AccessDeniedContent";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/access-denied")({
  head: () => ({
    meta: [
      { title: "Acces refuse - CGI-FLOW" },
      {
        name: "description",
        content: "Acces refuse a cette ressource CGI-FLOW.",
      },
    ],
  }),
  component: AccessDeniedPage,
});

function AccessDeniedPage() {
  return (
    <AppShell lockScroll>
      <AccessDeniedContent message="Vous n'avez pas les droits necessaires pour acceder a cette page." />
    </AppShell>
  );
}
