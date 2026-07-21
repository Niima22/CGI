import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Lock,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import type { FormEvent } from "react";
import { useAuth } from "@/lib/auth-store";
import logoUrl from "../../images/logo.png?url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CGI-Intranet - Connexion" },
      {
        name: "description",
        content:
          "Accédez à CGI-FLOW : gestion des incidents, suivi des SLA et coordination opérationnelle.",
      },
      { property: "og:title", content: "CGI-Intranet - Connexion" },
      {
        property: "og:description",
        content:
          "Plateforme interne CGI pour piloter vos opérations avec une intelligence augmentée.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isReady, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      void navigate({ to: "/dashboard" });
    }
  }, [isReady, isAuthenticated, navigate]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !isReady) return;

    setErrorMessage(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      void navigate({ to: "/dashboard" });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "La connexion a echoue. Verifiez vos identifiants Keycloak.",
      );
      setLoading(false);
    }
  }

  const chips = [
    "Suivi des SLA",
    "Gestion des incidents",
    "Sécurité d'entreprise",
    "Quality Lab IA",
  ];

  const capabilities = [
    { icon: Activity, label: "Gestion centralisée des incidents" },
    { icon: Timer, label: "Suivi des SLA en temps réel" },
    { icon: Users, label: "Coordination des équipes" },
    { icon: Sparkles, label: "Assistance à la résolution par IA" },
  ];

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-x-hidden overflow-y-auto bg-[oklch(0.985_0.005_300)] px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8 lg:pb-14 lg:pt-8 [@media(max-height:700px)]:px-4 [@media(max-height:700px)]:pb-6 [@media(max-height:700px)]:pt-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 45% at 15% 10%, oklch(0.9 0.12 22 / 0.5), transparent 60%), radial-gradient(50% 40% at 85% 20%, oklch(0.85 0.15 340 / 0.45), transparent 65%), radial-gradient(55% 45% at 80% 95%, oklch(0.75 0.18 300 / 0.4), transparent 70%), radial-gradient(45% 40% at 10% 90%, oklch(0.7 0.2 285 / 0.35), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0.4 0.15 300) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.4 0.15 300) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />

      <div className="relative w-full max-w-[1280px]">
          <div className="mx-auto w-full overflow-hidden rounded-[20px] border border-white/50 bg-white/40 shadow-glass backdrop-blur-2xl sm:rounded-[24px] lg:rounded-[28px]">
            <div className="grid grid-cols-1 lg:grid-cols-[45fr_55fr]">
              <section className="relative flex flex-col gap-4 p-5 sm:p-6 lg:gap-5 lg:p-7 [@media(max-height:760px)]:gap-3 [@media(max-height:760px)]:p-5 [@media(max-height:640px)]:gap-2 [@media(max-height:640px)]:p-4">
                <header className="flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="CGI-Intranet"
                    className="h-10 max-w-[160px] object-contain [@media(max-height:640px)]:h-8"
                  />
                </header>

                <div className="space-y-3 [@media(max-height:760px)]:space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-medium text-[oklch(0.45_0.2_300)] backdrop-blur [@media(max-height:640px)]:hidden">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-cgi" />
                    Bienvenue sur CGI-FLOW
                  </span>
                  <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-[2rem] xl:text-[2.2rem] [@media(max-height:760px)]:text-[1.75rem] [@media(max-height:640px)]:text-[1.45rem]">
                    Pilotez vos opérations
                    <br />
                    avec une <span className="text-gradient-cgi">intelligence augmentée</span>.
                  </h1>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px] [@media(max-height:760px)]:hidden">
                    Une plateforme interne dédiée à la gestion des incidents, au suivi des SLA et à
                    la coordination opérationnelle des équipes.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-soft backdrop-blur-xl sm:p-5 [@media(max-height:760px)]:p-4 [@media(max-height:640px)]:p-3">
                  <div className="mb-3 space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      Connexion
                    </h2>
                    <p className="text-sm text-muted-foreground [@media(max-height:640px)]:hidden">
                      Accédez à votre espace professionnel en toute sécurité.
                    </p>
                  </div>

                  <form className="space-y-2.5" onSubmit={(event) => void handleSignIn(event)}>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label
                          className="block text-sm font-medium text-foreground"
                          htmlFor="email"
                        >
                          Identifiant Keycloak
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            id="email"
                            type="text"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="username"
                            placeholder="nom@cgi.com"
                            disabled={loading || !isReady}
                            className="h-11 w-full rounded-xl border border-white/70 bg-white/75 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none transition focus:border-[oklch(0.55_0.24_300)] focus:ring-2 focus:ring-[oklch(0.55_0.24_300_/_0.18)] disabled:cursor-not-allowed disabled:opacity-70 [@media(max-height:640px)]:h-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label
                          className="block text-sm font-medium text-foreground"
                          htmlFor="password"
                        >
                          Mot de passe
                        </label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            placeholder="Votre mot de passe"
                            disabled={loading || !isReady}
                            className="h-11 w-full rounded-xl border border-white/70 bg-white/75 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none transition focus:border-[oklch(0.55_0.24_300)] focus:ring-2 focus:ring-[oklch(0.55_0.24_300_/_0.18)] disabled:cursor-not-allowed disabled:opacity-70 [@media(max-height:640px)]:h-10"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {errorMessage ? (
                      <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs leading-relaxed text-red-700">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{errorMessage}</span>
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={loading || !isReady}
                      aria-label="Se connecter à CGI-Intranet"
                      className="group relative flex min-h-[48px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-cgi px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:brightness-110 hover:shadow-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.24_300)] focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-80 motion-reduce:transition-none [@media(max-height:640px)]:min-h-[42px] [@media(max-height:640px)]:py-2"
                    >
                      {loading || !isReady ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                          <span>Connexion en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>Se connecter</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground [@media(max-height:640px)]:hidden [@media(max-width:380px)]:hidden">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[oklch(0.5_0.2_300)]" />
                    Authentification sécurisée via votre compte professionnel CGI
                  </p>
                </div>

                <ul className="hidden flex-wrap gap-2 2xl:flex">
                  {chips.map((chip) => (
                    <li
                      key={chip}
                      className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-foreground/70 backdrop-blur"
                    >
                      {chip}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="relative m-3 hidden overflow-hidden rounded-[20px] bg-gradient-panel-dark p-6 text-white sm:m-4 sm:p-8 lg:m-4 lg:block lg:p-7 xl:m-4 [@media(max-height:700px)]:hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-50 blur-3xl"
                  style={{ background: "oklch(0.6 0.25 350 / 0.7)" }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full opacity-40 blur-3xl"
                  style={{ background: "oklch(0.45 0.25 285 / 0.7)" }}
                />

                <div className="relative flex h-full flex-col">
                  <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.1rem]">
                    Une vision unifiée
                    <br />
                    <span className="text-white/80">de vos opérations</span>
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px]">
                    Centralisez les incidents, les plannings, les indicateurs SLA et les alertes
                    afin de faciliter le pilotage quotidien et la prise de décision.
                  </p>

                  <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {capabilities.map(({ icon: Icon, label }) => (
                      <li
                        key={label}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-cgi/20 ring-1 ring-white/15">
                          <Icon className="h-4 w-4 text-white" />
                        </span>
                        <span className="text-sm font-medium leading-tight">{label}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="relative mt-6 hidden flex-1 items-center justify-center 2xl:flex">
                    <DecorativeStarburst />
                  </div>

                  <div className="relative mt-6 2xl:mt-0">
                    <div className="ml-auto max-w-sm rounded-2xl border border-white/60 bg-white/95 p-5 text-foreground shadow-glass backdrop-blur-xl">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-cgi text-white">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <h3 className="text-sm font-semibold tracking-tight">Quality Lab IA</h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Améliorez la qualité des résolutions grâce à des suggestions structurées et
                        à la recherche de cas similaires.
                      </p>
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {["Trame de résolution", "Cas similaires", "Score qualité"].map((item) => (
                          <li
                            key={item}
                            className="rounded-full bg-[oklch(0.96_0.03_320)] px-2 py-0.5 text-[11px] font-medium text-[oklch(0.4_0.2_300)]"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
      </div>
    </main>
  );
}

function DecorativeStarburst() {
  return (
    <svg aria-hidden viewBox="0 0 320 220" className="h-40 w-full max-w-md opacity-80" fill="none">
      <defs>
        <linearGradient id="cgi-line" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.75 0.22 22)" />
          <stop offset="50%" stopColor="oklch(0.65 0.24 340)" />
          <stop offset="100%" stopColor="oklch(0.55 0.24 285)" />
        </linearGradient>
      </defs>
      <g stroke="url(#cgi-line)" strokeWidth="1.2" strokeLinecap="round">
        {Array.from({ length: 18 }).map((_, index) => {
          const angle = (index / 18) * Math.PI * 2;
          const x1 = 220 + Math.cos(angle) * 18;
          const y1 = 110 + Math.sin(angle) * 18;
          const x2 = 220 + Math.cos(angle) * (60 + (index % 3) * 14);
          const y2 = 110 + Math.sin(angle) * (60 + (index % 3) * 14);
          return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} opacity={0.75} />;
        })}
      </g>
      <g stroke="url(#cgi-line)" strokeWidth="1.2" fill="none" opacity="0.7">
        <path d="M10 40 C 80 40, 100 100, 170 100" />
        <path d="M10 110 C 70 110, 110 160, 180 150" />
        <path d="M10 180 C 90 180, 120 130, 180 130" />
      </g>
      <g fill="oklch(0.85 0.15 340)">
        <circle cx="10" cy="40" r="3" />
        <circle cx="10" cy="110" r="3" />
        <circle cx="10" cy="180" r="3" />
        <circle cx="220" cy="110" r="4" fill="white" />
      </g>
    </svg>
  );
}
