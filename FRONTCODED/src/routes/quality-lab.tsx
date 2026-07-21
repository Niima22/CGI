import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  FileText,
  Sparkles,
  Wand2,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { getBusinessRoleLabel, useAuth } from "@/lib/auth-store";
import qualityLabCasesSource from "@/mocks/qualityLabCases.json?raw";

export const Route = createFileRoute("/quality-lab")({
  head: () => ({
    meta: [
      { title: "Quality Lab IA - CGI Intranet" },
      {
        name: "description",
        content: "Génération, supervision et analyse des trames de résolution par IA.",
      },
    ],
  }),
  component: QualityLabPage,
});

type Tab = "form" | "supervision" | "metrics";

interface QualityLabResult {
  resolutionFrame: string;
  resolutionType: string;
  qualityScore: number;
  confidenceScore: number;
  missingElements: string[];
  similarCases: {
    ticketId: number;
    ticketTitle: string;
    resolutionType: string;
    similarityScore: number;
  }[];
}

interface QualityLabCase {
  input: {
    title: string;
    basket: string;
    summary: string;
    actions: string;
    tools: string;
  };
  output: {
    suggestedType: string;
    qualityScore: number;
    resolutionFrame: {
      title: string;
      basket: string;
      context: string;
      diagnosis: string;
      actionsPerformed: string[];
      toolsUsed: string[];
      result: string;
      closingMessage: string;
    };
    similarCases: {
      ticketId: number;
      title: string;
      similarity: number;
    }[];
    missingElements: string[];
  };
}

const QUALITY_LAB_ENDPOINT = "/api/ai/generate-resolution-frame";
const qualityLabCases = JSON.parse(qualityLabCasesSource) as QualityLabCase[];

function isQualityLabMockEnabled() {
  return import.meta.env.VITE_USE_QUALITY_LAB_MOCK === "true";
}

function QualityLabPage() {
  const { roles, hasRole } = useAuth();
  const role = roles.map(getBusinessRoleLabel).join(", ");
  const isSup = hasRole("ADMIN") || hasRole("MANAGER");
  const [tab, setTab] = useState<Tab>("form");

  return (
    <AppShell lockScroll>
      <div className="flex h-full min-h-0 origin-top scale-[0.96] flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Retour Dashboard
            </Link>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cgi-gradient shadow-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              Quality Lab IA
            </h1>
            <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
              Génération, supervision et analyse des trames de résolution.
            </p>
          </div>
          <span className="hidden">Rôle : {role}</span>
        </div>

        {isSup ? (
          <div className="inline-flex shrink-0 rounded-xl border border-border bg-muted p-1">
            {([
              { id: "form", label: "Formulaire", icon: FileText },
              { id: "supervision", label: "Supervision", icon: Eye },
              { id: "metrics", label: "Metrics", icon: BarChart3 },
            ] as const).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all " +
                    (active
                      ? "bg-card text-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {(!isSup || tab === "form") && <ConsultantForm />}
        {isSup && tab === "supervision" && <SupervisionPanel />}
        {isSup && tab === "metrics" && <MetricsPanel />}
      </div>
    </AppShell>
  );
}

function ConsultantForm() {
  const emptyForm = { titre: "", bannette: "", synthese: "", actions: "", outils: "" };
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QualityLabResult | null>(null);
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");

  const canGenerate =
    form.titre.trim().length > 0 &&
    form.bannette.trim().length > 0 &&
    form.synthese.trim().length > 0;
  const isGenerating = loading;

  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  async function handleGenerate() {
    if (!canGenerate) return;

    setLoading(true);
    setError("");
    setCopyNotice("");
    setResult(null);

    try {
      const generated = isQualityLabMockEnabled()
        ? await mockGenerate()
        : await generateFromApi(form);
      setResult(generated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de générer la trame.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void handleGenerate();
  }

  async function copyGeneratedResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.resolutionFrame);
      setError("");
      setCopyNotice("Trame copiée");
      window.setTimeout(() => setCopyNotice(""), 2200);
    } catch {
      setError("Impossible de copier la trame générée.");
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[520px_minmax(0,1fr)]">
      <form
        onSubmit={submit}
        className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-card"
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cgi-pink" />
            <h2 className="text-lg font-semibold">Formulaire Consultant</h2>
          </div>

          <Input
            label="Titre du ticket"
            value={form.titre}
            onChange={set("titre")}
            placeholder="Déconnexion automatique inattendue"
          />
          <Select
            label="Bannette"
            value={form.bannette}
            onChange={set("bannette")}
            options={["BO", "FO", "PROXI-PMC", "Partenaire", "Supply", "DS-Magasin"]}
          />
          <Textarea
            label="Synthèse de la demande"
            value={form.synthese}
            onChange={set("synthese")}
            rows={2}
            placeholder="Décrivez brièvement la demande..."
          />
          <Textarea
            label="Actions réalisées"
            value={form.actions}
            onChange={set("actions")}
            rows={2}
            placeholder="- Vérification de la durée de session configurée..."
          />
          <Input
            label="Outils utilisés"
            value={form.outils}
            onChange={set("outils")}
            placeholder="Console du navigateur, journaux applicatifs"
          />
          <div className="mt-4 flex justify-end border-t border-border pt-3">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
            >
              <Wand2 className="h-4 w-4" />
              {isGenerating ? "Génération..." : "Générer la trame"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[color:var(--cgi-red)]">
            {error}
          </div>
        ) : null}
      </form>

      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cgi-pink" />
            <h2 className="text-lg font-semibold">Trame générée</h2>
          </div>
          {result ? (
            <div className="flex items-center gap-2">
              {copyNotice ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {copyNotice}
                </span>
              ) : null}
              <button
                type="button"
                onClick={copyGeneratedResult}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                <Copy className="h-4 w-4" />
                Copier la trame
              </button>
            </div>
          ) : null}
        </div>

        {!result && !loading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Sparkles className="h-6 w-6 text-cgi-pink" />
            </div>
            Remplissez le formulaire puis lancez la génération.
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-[color:var(--cgi-pink)]" />
            L'IA prépare votre trame...
          </div>
        ) : null}

        {result ? <GeneratedResult result={result} /> : null}
      </div>
    </div>
  );
}

function GeneratedResult({ result }: { result: QualityLabResult }) {
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-2">
      <pre className="whitespace-pre-wrap rounded-xl border border-border bg-muted/60 p-4 font-mono text-sm leading-relaxed">
        {result.resolutionFrame}
      </pre>

      <div className="grid grid-cols-2 gap-3">
        <ScoreCard label="Quality Score" value={result.qualityScore} />
        <ScoreCard label="Confidence Score" value={result.confidenceScore} />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[color:var(--cgi-red)]" />
          <h3 className="text-sm font-semibold">Éléments manquants</h3>
        </div>
        <ul className="space-y-1.5">
          {result.missingElements.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cgi-red)]" /> {item}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[color:var(--cgi-purple)]" />
          <h3 className="text-sm font-semibold">Cas similaires</h3>
        </div>
        <div className="space-y-2">
          {result.similarCases.map((item) => (
            <div
              key={item.ticketId}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/60 p-3 transition hover:bg-muted"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-muted-foreground">
                  Ticket {item.ticketId} · {item.resolutionType}
                </div>
                <div className="truncate text-sm text-foreground">{item.ticketTitle}</div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-cgi-gradient">
                {Math.round(item.similarityScore * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function mockGenerate() {
  await new Promise((resolve) => window.setTimeout(resolve, 450));
  return mapCaseToResult(qualityLabCases[0]);
}

async function generateFromApi(form: {
  titre: string;
  bannette: string;
  synthese: string;
  actions: string;
  outils: string;
}) {
  const response = await fetch(QUALITY_LAB_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketTitle: form.titre.trim(),
      bannette: form.bannette.trim(),
      requestSummary: form.synthese.trim(),
      actionsDone: splitList(form.actions),
      toolsUsed: splitList(form.outils),
    }),
  });

  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}`);
  }

  return (await response.json()) as QualityLabResult;
}

function mapCaseToResult(item: QualityLabCase): QualityLabResult {
  return {
    resolutionFrame: formatResolutionFrame(item.output.resolutionFrame),
    resolutionType: item.output.suggestedType,
    qualityScore: item.output.qualityScore / 100,
    confidenceScore: 0.96,
    missingElements: item.output.missingElements,
    similarCases: item.output.similarCases.map((similarCase) => ({
      ticketId: similarCase.ticketId,
      ticketTitle: similarCase.title,
      resolutionType: "Cas similaire",
      similarityScore: similarCase.similarity / 100,
    })),
  };
}

function formatResolutionFrame(frame: QualityLabCase["output"]["resolutionFrame"]) {
  return `# Trame de résolution - ${frame.title}

## Contexte
${frame.context}

## Diagnostic
${frame.diagnosis}

## Actions réalisées
${frame.actionsPerformed.map((action) => `- ${action}`).join("\n")}

## Outils utilisés
${frame.toolsUsed.map((tool) => `- ${tool}`).join("\n")}

## Résultat
${frame.result}

## Message de clôture
${frame.closingMessage}`;
}

function splitList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="rounded-xl border border-border bg-muted/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{pct}%</div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-cgi-gradient" style={{ width: `${pct}%` }} />
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
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-transparent bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-ring focus:bg-card"
      />
    </label>
  );
}

function Select({
  label,
  options,
  ...props
}: { label: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      <div className="relative">
        <select
          {...props}
          className="w-full appearance-none rounded-xl border border-transparent bg-muted px-3 py-2.5 pr-10 text-sm outline-none transition-all focus:border-ring focus:bg-card"
        >
          <option value="">Choisir une bannette</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  );
}

function Textarea({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      <textarea
        {...props}
        className="w-full resize-none rounded-xl border border-transparent bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-ring focus:bg-card"
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border p-5">
        <Eye className="h-4 w-4 text-cgi-pink" />
        <h2 className="font-semibold">Supervision des trames</h2>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-muted/40"
          >
            <div>
              <div className="text-xs font-semibold text-muted-foreground">{item.id}</div>
              <div className="text-sm font-medium text-foreground">{item.agent}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-cgi-gradient">
                {Math.round(item.score * 100)}%
              </span>
              <span
                className={
                  "rounded-full px-2.5 py-1 text-xs font-semibold " +
                  (item.status === "Validée"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700")
                }
              >
                {item.status}
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="text-xs text-muted-foreground">{metric.label}</div>
          <div className="mt-2 text-3xl font-bold text-cgi-gradient">{metric.value}</div>
        </div>
      ))}
    </div>
  );
}
