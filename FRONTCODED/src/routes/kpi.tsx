import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ExternalLink, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { RoleGuard } from "@/components/app/RoleGuard";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, SectionSurface } from "@/components/ui/page";

export const Route = createFileRoute("/kpi")({
  head: () => ({
    meta: [
      { title: "Indicateurs KPI - CGI-Intranet" },
      {
        name: "description",
        content: "Module complet de suivi des performances et des indicateurs.",
      },
    ],
  }),
  component: KpiModulePage,
});

type FrameStatus = "checking" | "loading" | "ready" | "error";

function KpiModulePage() {
  const configuredUrl = import.meta.env.VITE_KPI_MODULE_URL as string | undefined;
  const frameUrl = useMemo(() => configuredUrl || "/kpi-app/", [configuredUrl]);
  const [status, setStatus] = useState<FrameStatus>("checking");
  const [frameKey, setFrameKey] = useState(0);

  const checkAvailability = useCallback(async () => {
    setStatus("checking");

    const url = new URL(frameUrl, window.location.origin);
    const isSameOrigin = url.origin === window.location.origin;

    if (!isSameOrigin) {
      setStatus("loading");
      return;
    }

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
      });
      setStatus(response.ok ? "loading" : "error");
    } catch {
      setStatus("error");
    }
  }, [frameUrl]);

  useEffect(() => {
    void checkAvailability();
  }, [checkAvailability, frameKey]);

  useEffect(() => {
    if (status !== "loading") {
      return;
    }

    const timeout = window.setTimeout(() => setStatus("error"), 12000);
    return () => window.clearTimeout(timeout);
  }, [status, frameKey]);

  const retry = () => {
    setFrameKey((value) => value + 1);
  };

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER"]}
        message="Les indicateurs KPI sont reserves aux Pilotes et aux Superviseurs."
      >
        <PageContainer maxWidth="7xl">
          <PageHeader
            icon={<BarChart3 className="h-5 w-5" />}
            title="Indicateurs KPI"
            description="Accedez au module complet de suivi des performances et des indicateurs."
            actions={
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                <RefreshCw className={status === "checking" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Reessayer
              </Button>
            }
          />

          <SectionSurface className="overflow-hidden">
            {status === "checking" ? (
              <ModuleState label="Chargement du module KPI..." />
            ) : status === "error" ? (
              <ModuleError onRetry={retry} />
            ) : (
              <div className="relative min-h-[calc(100vh-13rem)]">
                {status === "loading" ? (
                  <div className="absolute inset-0 z-10 grid place-items-center bg-background/80 text-sm text-muted-foreground">
                    Chargement du module KPI...
                  </div>
                ) : null}
                <iframe
                  key={frameKey}
                  src={frameUrl}
                  title="Module Indicateurs KPI"
                  className="h-[calc(100vh-13rem)] min-h-[620px] w-full border-0"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-downloads"
                  onLoad={() => setStatus("ready")}
                  onError={() => setStatus("error")}
                />
              </div>
            )}
          </SectionSurface>
        </PageContainer>
      </RoleGuard>
    </AppShell>
  );
}

function ModuleState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[420px] place-items-center p-6 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function ModuleError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-[420px] place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-cgi-soft text-[color:var(--cgi-purple)]">
          <ExternalLink className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold">Impossible de charger le module KPI.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifiez que le frontend KPI est demarre sous /kpi-app/ puis reessayez.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Reessayer
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Retour au centre de controle</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
