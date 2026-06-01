import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ShieldCheck, Activity, Mail, Lock } from "lucide-react";
import { useAuth, type Role } from "@/lib/auth-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CGI Intranet — Connexion" },
      {
        name: "description",
        content:
          "Plateforme intelligente CGI pour la gestion des incidents, le suivi des SLA et la coordination opérationnelle.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Agent");

  if (isAuthenticated && typeof window !== "undefined") {
    // soft redirect
    throw redirect({ to: "/dashboard" });
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    login(email, role);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-soft-gradient overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cgi-gradient opacity-20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cgi-gradient opacity-10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-cgi-gradient flex items-center justify-center shadow-glow">
            <span className="text-white font-bold tracking-tight">CGI</span>
          </div>
          <div>
            <div className="font-semibold text-foreground">CGI Intranet</div>
            <div className="text-xs text-muted-foreground">Enterprise Operations Suite</div>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-foreground shadow-card">
            <Sparkles className="h-3 w-3 text-cgi-pink" /> Plateforme intelligente
          </span>
          <h1 className="text-4xl font-bold leading-tight text-foreground">
            Pilotez vos opérations avec une{" "}
            <span className="text-cgi-gradient">intelligence augmentée</span>.
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Système intelligent pour la gestion des incidents, le suivi des SLA et la coordination
            opérationnelle de l'activité.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Feature icon={<Activity className="h-4 w-4" />} label="Suivi SLA temps réel" />
            <Feature icon={<Sparkles className="h-4 w-4" />} label="Quality Lab IA" />
            <Feature icon={<ShieldCheck className="h-4 w-4" />} label="Sécurité enterprise" />
            <Feature icon={<Mail className="h-4 w-4" />} label="Coordination unifiée" />
          </div>
        </div>

        <div className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} CGI — Tous droits réservés
        </div>
      </div>

      {/* Right login card */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-card"
        >
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cgi-gradient flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-sm">CGI</span>
            </div>
            <div className="font-semibold">CGI Intranet</div>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Bon retour 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connectez-vous pour accéder à votre espace.
          </p>

          <div className="mt-6 space-y-4">
            <Field label="Email" icon={<Mail className="h-4 w-4" />}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@cgi.com"
                className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </Field>

            <Field label="Mot de passe" icon={<Lock className="h-4 w-4" />}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </Field>

            <div>
              <label className="text-xs font-medium text-foreground mb-2 block">Rôle</label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted">
                {(["Agent", "Superviseur"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={
                      "py-2 rounded-lg text-sm font-medium transition-all " +
                      (role === r
                        ? "bg-card shadow-card text-foreground"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full py-3 rounded-xl bg-cgi-gradient text-white font-semibold text-sm shadow-glow hover:opacity-95 active:scale-[0.99] transition"
          >
            Se connecter
          </button>

          <p className="mt-4 text-xs text-center text-muted-foreground">
            Accès réservé aux collaborateurs CGI
          </p>
        </form>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/70 border border-border text-sm text-foreground">
      <span className="text-cgi-pink">{icon}</span>
      {label}
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground mb-1.5 block">{label}</span>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted border border-transparent focus-within:border-ring focus-within:bg-card transition-all">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
    </label>
  );
}
