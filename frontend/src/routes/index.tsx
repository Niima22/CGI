import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, LogIn, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CGI Intranet - Connexion" },
      {
        name: "description",
        content: "Plateforme CGI de gestion des operations internes.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (isReady && isAuthenticated) {
      void navigate({ to: "/dashboard" });
    }
  }, [isReady, isAuthenticated, navigate]);

  return (
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-soft-gradient p-12 lg:flex">
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cgi-gradient shadow-glow">
            <span className="font-bold tracking-tight text-white">CGI</span>
          </div>
          <div>
            <div className="font-semibold text-foreground">CGI Intranet</div>
            <div className="text-xs text-muted-foreground">Enterprise Operations Suite</div>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-foreground">
            Pilotez vos operations avec une{" "}
            <span className="text-cgi-gradient">intelligence augmentee</span>.
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Systeme interne pour la gestion des incidents, le suivi des SLA et la coordination de
            l'activite.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Feature icon={<Activity className="h-4 w-4" />} label="Suivi SLA temps reel" />
            <Feature icon={<Sparkles className="h-4 w-4" />} label="Quality Lab IA" />
            <Feature icon={<ShieldCheck className="h-4 w-4" />} label="Securite enterprise" />
            <Feature icon={<Mail className="h-4 w-4" />} label="Coordination unifiee" />
          </div>
        </div>

        <div className="relative text-xs text-muted-foreground">@CGI 2026</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cgi-gradient shadow-glow">
              <span className="text-sm font-bold text-white">CGI</span>
            </div>
            <div className="font-semibold">CGI Intranet</div>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Connexion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Utilisez votre compte interne pour acceder a votre espace.
          </p>

          <button
            type="button"
            disabled={!isReady}
            onClick={() => void login()}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cgi-gradient py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-95 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {isReady ? "Se connecter avec Keycloak" : "Initialisation..."}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Acces reserve aux collaborateurs autorises
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground">
      <span className="text-cgi-pink">{icon}</span>
      {label}
    </div>
  );
}
