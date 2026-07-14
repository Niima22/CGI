import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { RoleGuard } from "@/components/app/RoleGuard";
import ShiftPlanning from "@/components/shift-planning/ShiftPlanning";

export const Route = createFileRoute("/planning")({
  head: () => ({
    meta: [
      { title: "Planning - CGI Intranet" },
      {
        name: "description",
        content: "Weekly planning interface.",
      },
    ],
  }),
  component: PlanningPage,
});

function PlanningPage() {
  return (
    <AppShell compactTopbar lockScroll>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER"]}
        message="L'acces au planning est actuellement reserve aux Pilotes et Superviseurs."
      >
        <div className="planning-lovable-shell -mx-4 -my-3 h-[calc(100%+1.5rem)] overflow-hidden md:-mx-8">
          <ShiftPlanning />
        </div>
      </RoleGuard>
    </AppShell>
  );
}
