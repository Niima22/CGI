import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Sparkles, FileText, Wand2, CheckCircle2, AlertCircle, BookOpen, BarChart3, Eye } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/quality-lab")({
  head: () => ({
    meta: [
      { title: "Quality Lab IA — CGI Intranet" },
      {
        name: "description",
        content: "Génération, supervision et analyse des trames de résolution par IA.",
      },
    ],
  }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("cgi-auth");
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.isAuthenticated) throw redirect({ to: "/" });
    } catch (e) {
      if ((e as { isRedirect?: boolean })?.isRedirect) throw e;
    }
  },
  component: QualityLabPage,
});

type Tab = "form" | "supervision" | "metrics";

function QualityLabPage() {
  const { role } = useAuth();
  const isSup = role === "Superviseur";
  const [tab, setTab] = useState<Tab>("form");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Retour Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-foreground flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-cgi-gradient flex items-center justify-center shadow-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              Quality Lab IA
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Génération, supervision et analyse des trames de résolution.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cgi-gradient text-white shadow-glow">
            Rôle : {role}
          </span>
        </div>

        {isSup && (
          <div className="inline-flex p-1 rounded-xl bg-muted border border-border">
            {([
              { id: "form", label: "Formulaire", icon: FileText },
              { id: "supervision", label: "Supervision", icon: Eye },
              { id: "metrics", label: "Metrics", icon: BarChart3 },
            ] as const).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={
                    "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all " +
                    (active
                      ? "bg-card shadow-card text-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>
        )}

        {(!isSup || tab === "form") && <ConsultantForm />}
        {isSup && tab === "supervision" && <SupervisionPanel />}
        {isSup && tab === "metrics" && <MetricsPanel />}
      </div>
    </AppShell>
  );
}

interface MockResult {
  resolutionFrame: string;
  resolutionType: string;
  qualityScore: number;
  confidenceScore: number;
  missingElements: string[];
  similarCases: {
    ticketTitle: string;
    solution: string;
    resolutionType: string;
    similarityScore: number;
  }[];
}

function mockGenerate(input: {
  titre: string;
  bannette: string;
  synthese: string;
  actions: string;
  outils: string;
}): MockResult {
  return {
    resolutionFrame: `# Trame de résolution — ${input.titre || "Ticket"}

## Contexte
${input.synthese || "Synthèse du ticket fournie par le consultant."}

## Diagnostic
- Bannette : ${input.bannette || "Support N2"}
- Symptômes identifiés et corrélés à l'historique récent.

## Actions menées
${input.actions || "- Vérification des logs\n- Reproduction du cas\n- Application du correctif"}

## Outils utilisés
${input.outils || "ServiceNow, Splunk, AD"}

## Résolution
Correctif appliqué avec succès. Ticket clôturé après validation utilisateur.`,
    resolutionType: "Procédure standard validée",
    qualityScore: 0.87,
    confidenceScore: 0.92,
    missingElements: ["Validation utilisateur finale", "Capture d'écran post-correction"],
    similarCases: [
      { id: "INC-10324", title: "Échec authentification AD — réinitialisation profil", similarity: 0.94 },
      { id: "INC-09812", title: "Latence réseau site Lyon", similarity: 0.81 },
      { id: "INC-08741", title: "Erreur synchronisation Outlook", similarity: 0.76 },
    ],
  } as unknown as MockResult;
}

const QUALITY_LAB_ENDPOINT = "/generate-resolution-frame";

function splitList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
}

function ConsultantForm() {
  const [form, setForm] = useState({ titre: "", bannette: "", synthese: "", actions: "", outils: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MockResult | null>(null);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // mock — real Angular app calls POST http://127.0.0.1:8001/generate-resolution-frame
    setError("");
    setResult(null);

    try {
      const response = await fetch(QUALITY_LAB_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketTitle: form.titre.trim(),
          bannette: form.bannette.trim(),
          requestSummary: form.synthese.trim(),
          actionsDone: splitList(form.actions),
          toolsUsed: splitList(form.outils),
        }),
      });

      if (!response.ok) {
        let detail = `Erreur API ${response.status}`;
        try {
          const payload = (await response.json()) as { detail?: string };
          if (payload.detail) detail = payload.detail;
        } catch {
          /* keep HTTP status fallback */
        }
        throw new Error(detail);
      }

      setResult((await response.json()) as MockResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de contacter le service IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <form
        onSubmit={submit}
        className="xl:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card space-y-4"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cgi-pink" />
          <h2 className="font-semibold">Formulaire Consultant</h2>
        </div>

        <Input label="Titre du ticket" value={form.titre} onChange={set("titre")} placeholder="Ex : Échec authentification SSO" />
        <Input label="Bannette / département concerné" value={form.bannette} onChange={set("bannette")} placeholder="Support N2" />
        <Textarea label="Synthèse de la demande" value={form.synthese} onChange={set("synthese")} rows={3} placeholder="Décrivez brièvement la demande..." />
        <Textarea label="Actions réalisées" value={form.actions} onChange={set("actions")} rows={3} placeholder="- Vérification logs..." />
        <Input label="Outils utilisés" value={form.outils} onChange={set("outils")} placeholder="ServiceNow, AD, Splunk..." />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[color:var(--cgi-red)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-cgi-gradient text-white font-semibold text-sm shadow-glow hover:opacity-95 active:scale-[0.99] transition disabled:opacity-70"
        >
          <span className="inline-flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            {loading ? "Génération en cours..." : "Générer la trame de résolution"}
          </span>
        </button>
      </form>

      <div className="xl:col-span-3 bg-card border border-border rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cgi-pink" />
            <h2 className="font-semibold">Trame générée</h2>
          </div>
          {result && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              {result.resolutionType}
            </span>
          )}
        </div>

        {!result && !loading && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-cgi-pink" />
            </div>
            Remplissez le formulaire puis lancez la génération.
          </div>
        )}

        {loading && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-muted border-t-[color:var(--cgi-pink)] animate-spin mb-3" />
            L'IA prépare votre trame...
          </div>
        )}

        {result && (
          <div className="space-y-5">
            <pre className="whitespace-pre-wrap text-sm bg-muted/60 rounded-xl p-4 border border-border font-mono leading-relaxed">
              {result.resolutionFrame}
            </pre>

            <div className="grid grid-cols-2 gap-3">
              <ScoreCard label="Quality Score" value={result.qualityScore} />
              <ScoreCard label="Confidence Score" value={result.confidenceScore} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-[color:var(--cgi-red)]" />
                <h3 className="text-sm font-semibold">Éléments manquants</h3>
              </div>
              {result.missingElements.length > 0 ? (
                <ul className="space-y-1.5">
                  {result.missingElements.map((m) => (
                    <li
                      key={m}
                      className="text-sm text-foreground flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cgi-red)]" /> {m}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-emerald-700 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  Aucun element manquant detecte.
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-[color:var(--cgi-purple)]" />
                <h3 className="text-sm font-semibold">Cas similaires</h3>
              </div>
              <div className="space-y-2">
                {result.similarCases.map((c) => (
                  <div
                    key={`${c.ticketTitle}-${c.similarityScore}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/60 border border-border hover:bg-muted transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-muted-foreground">{c.resolutionType}</div>
                      <div className="text-sm text-foreground truncate">{c.ticketTitle}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.solution}</div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-cgi-gradient">
                      {Math.round(c.similarityScore * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="p-4 rounded-xl bg-muted/60 border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{pct}%</div>
      <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full bg-cgi-gradient"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground mb-1.5 block">{label}</span>
      <input
        {...props}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border border-transparent focus:border-ring focus:bg-card outline-none text-sm transition-all"
      />
    </label>
  );
}

function Textarea({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground mb-1.5 block">{label}</span>
      <textarea
        {...props}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border border-transparent focus:border-ring focus:bg-card outline-none text-sm transition-all resize-none"
      />
    </label>
  );
}

function SupervisionPanel() {
  const items = [
    { id: "TR-2041", agent: "M. Dupont", score: 0.92, status: "Validée" },
    { id: "TR-2042", agent: "S. Laurent", score: 0.74, status: "À revoir" },
    { id: "TR-2043", agent: "K. Ahmed", score: 0.88, status: "Validée" },
    { id: "TR-2044", agent: "L. Moreau", score: 0.61, status: "À revoir" },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
      <div className="p-5 border-b border-border flex items-center gap-2">
        <Eye className="h-4 w-4 text-cgi-pink" />
        <h2 className="font-semibold">Supervision des trames</h2>
      </div>
      <div className="divide-y divide-border">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40 transition">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">{it.id}</div>
              <div className="text-sm font-medium text-foreground">{it.agent}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-cgi-gradient">{Math.round(it.score * 100)}%</span>
              <span
                className={
                  "text-xs px-2.5 py-1 rounded-full font-semibold " +
                  (it.status === "Validée"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200")
                }
              >
                {it.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsPanel() {
  const metrics = [
    { label: "Trames générées (30j)", value: "1 286" },
    { label: "Quality Score moyen", value: "86%" },
    { label: "Confidence moyen", value: "91%" },
    { label: "Taux de validation", value: "78%" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs text-muted-foreground">{m.label}</div>
          <div className="mt-2 text-3xl font-bold text-cgi-gradient">{m.value}</div>
        </div>
      ))}
    </div>
  );
}
