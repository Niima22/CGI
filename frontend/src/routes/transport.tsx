import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Route as RouteIcon,
  User,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/transport")({
  head: () => ({
    meta: [
      { title: "Transport - CGI Intranet" },
      {
        name: "description",
        content: "Gestion des demandes de transport, disponibilites vehicules et trajets planifies.",
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
  component: TransportPage,
});

type TransportRequest = {
  id: string;
  requester: string;
  destination: string;
  pickup: string;
  date: string;
  time: string;
  priority: "Normale" | "Urgente";
  status: "Planifie" | "En attente" | "En route";
};

type Vehicle = {
  label: string;
  driver: string;
  capacity: string;
  status: "Disponible" | "Occupe" | "Maintenance";
  location: string;
};

const initialRequests: TransportRequest[] = [
  {
    id: "TRP-2048",
    requester: "N. Bennis",
    destination: "Site Casa Nearshore",
    pickup: "CGI Rabat",
    date: "Aujourd'hui",
    time: "10:30",
    priority: "Urgente",
    status: "En route",
  },
  {
    id: "TRP-2049",
    requester: "S. Laurent",
    destination: "Gare Casa Voyageurs",
    pickup: "CGI Casablanca",
    date: "Aujourd'hui",
    time: "14:00",
    priority: "Normale",
    status: "Planifie",
  },
  {
    id: "TRP-2050",
    requester: "K. Ahmed",
    destination: "Aeroport Mohammed V",
    pickup: "CGI Technopolis",
    date: "Demain",
    time: "07:45",
    priority: "Normale",
    status: "En attente",
  },
];

const vehicles: Vehicle[] = [
  { label: "Navette 01", driver: "M. Idrissi", capacity: "7 places", status: "Disponible", location: "Parking A" },
  { label: "Navette 02", driver: "Y. Amrani", capacity: "5 places", status: "Occupe", location: "Route Casa" },
  { label: "Vehicule 03", driver: "A. El Fassi", capacity: "4 places", status: "Maintenance", location: "Atelier" },
];

const fieldControlClass =
  "w-full rounded-xl border border-transparent bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-ring focus:bg-card";

function TransportPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [form, setForm] = useState({
    requester: "",
    pickup: "",
    destination: "",
    date: "",
    time: "",
    priority: "Normale" as TransportRequest["priority"],
  });

  const stats = useMemo(
    () => [
      {
        label: "Demandes ouvertes",
        value: String(requests.length),
        hint: "jour courant",
        icon: Bus,
        tone: "text-cgi-pink bg-pink-50",
      },
      {
        label: "Vehicules disponibles",
        value: String(vehicles.filter((vehicle) => vehicle.status === "Disponible").length),
        hint: `sur ${vehicles.length} actifs`,
        icon: CheckCircle2,
        tone: "text-emerald-600 bg-emerald-50",
      },
      {
        label: "Trajets planifies",
        value: String(requests.filter((request) => request.status === "Planifie").length),
        hint: "a confirmer",
        icon: Calendar,
        tone: "text-[color:var(--cgi-purple)] bg-purple-50",
      },
      {
        label: "Priorite urgente",
        value: String(requests.filter((request) => request.priority === "Urgente").length),
        hint: "suivi requis",
        icon: AlertTriangle,
        tone: "text-amber-600 bg-amber-50",
      },
    ],
    [requests],
  );

  const set = (key: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.requester || !form.pickup || !form.destination || !form.date || !form.time) return;

    const request: TransportRequest = {
      id: `TRP-${Math.floor(2051 + Math.random() * 8000)}`,
      requester: form.requester.trim(),
      pickup: form.pickup.trim(),
      destination: form.destination.trim(),
      date: form.date,
      time: form.time,
      priority: form.priority,
      status: "En attente",
    };

    setRequests((current) => [request, ...current]);
    setForm({
      requester: "",
      pickup: "",
      destination: "",
      date: "",
      time: "",
      priority: "Normale",
    });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-card">
              <RouteIcon className="h-3.5 w-3.5 text-cgi-pink" />
              Coordination transport
            </div>
            <h1 className="mt-3 text-3xl font-bold text-foreground">Transport</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Suivi des demandes de transport, disponibilite des navettes et planification des trajets.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <div className="text-xs text-muted-foreground">Prochaine navette</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-cgi-pink" />
              10:30 - CGI Rabat
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Demandes en cours</h2>
                <p className="text-sm text-muted-foreground">Trajets a traiter par ordre de priorite.</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {requests.length} demandes
              </span>
            </div>

            <div className="space-y-3">
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cgi-gradient shadow-glow">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Nouvelle demande</h2>
                <p className="text-xs text-muted-foreground">Creation locale pour la maquette.</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <Field label="Demandeur">
                <input
                  value={form.requester}
                  onChange={set("requester")}
                  placeholder="Nom du collaborateur"
                  className={fieldControlClass}
                />
              </Field>
              <Field label="Point de depart">
                <input
                  value={form.pickup}
                  onChange={set("pickup")}
                  placeholder="Ex : CGI Casablanca"
                  className={fieldControlClass}
                />
              </Field>
              <Field label="Destination">
                <input
                  value={form.destination}
                  onChange={set("destination")}
                  placeholder="Ex : Aeroport Mohammed V"
                  className={fieldControlClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input value={form.date} onChange={set("date")} type="date" className={fieldControlClass} />
                </Field>
                <Field label="Heure">
                  <input value={form.time} onChange={set("time")} type="time" className={fieldControlClass} />
                </Field>
              </div>
              <Field label="Priorite">
                <select value={form.priority} onChange={set("priority")} className={fieldControlClass}>
                  <option>Normale</option>
                  <option>Urgente</option>
                </select>
              </Field>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cgi-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-95 active:scale-[0.99]"
              >
                Enregistrer la demande
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </section>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.label} vehicle={vehicle} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card transition hover:shadow-glow">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-2xl font-bold leading-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium text-foreground/80">{label}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function RequestCard({ request }: { request: TransportRequest }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/50 p-4 transition hover:bg-muted">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground">{request.id}</span>
            <PriorityPill priority={request.priority} />
          </div>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{request.requester}</h3>
        </div>
        <StatusPill status={request.status} />
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <InfoLine icon={MapPin} label="Depart" value={request.pickup} />
        <InfoLine icon={RouteIcon} label="Destination" value={request.destination} />
        <InfoLine icon={Calendar} label="Date" value={request.date} />
        <InfoLine icon={Clock} label="Heure" value={request.time} />
      </div>
    </div>
  );
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cgi-gradient shadow-glow">
            <Bus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{vehicle.label}</h3>
            <p className="text-xs text-muted-foreground">{vehicle.capacity}</p>
          </div>
        </div>
        <VehicleStatus status={vehicle.status} />
      </div>
      <div className="mt-4 space-y-2">
        <InfoLine icon={User} label="Chauffeur" value={vehicle.driver} />
        <InfoLine icon={MapPin} label="Position" value={vehicle.location} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-cgi-pink" />
      <span className="text-xs font-semibold text-muted-foreground">{label}:</span>
      <span className="min-w-0 truncate text-foreground">{value}</span>
    </div>
  );
}

function PriorityPill({ priority }: { priority: TransportRequest["priority"] }) {
  const urgent = priority === "Urgente";
  return (
    <span
      className={
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold " +
        (urgent
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-border bg-card text-muted-foreground")
      }
    >
      {priority}
    </span>
  );
}

function StatusPill({ status }: { status: TransportRequest["status"] }) {
  const styles = {
    Planifie: "border-sky-200 bg-sky-50 text-sky-700",
    "En attente": "border-amber-200 bg-amber-50 text-amber-700",
    "En route": "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function VehicleStatus({ status }: { status: Vehicle["status"] }) {
  const styles = {
    Disponible: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Occupe: "border-sky-200 bg-sky-50 text-sky-700",
    Maintenance: "border-red-200 bg-red-50 text-[color:var(--cgi-red)]",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}
