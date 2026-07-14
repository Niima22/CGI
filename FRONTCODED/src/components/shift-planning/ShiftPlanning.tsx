import { useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Printer,
  PenLine,
  BarChart3,
  CalendarDays,
  Info,
  Clock,
  Flame,
  Wrench,
  Calendar as CalIcon,
  Pencil,
  ExternalLink,
  X,
} from "lucide-react";
import { days, calendarWeeks, months, type Accent, type WorkOrder, type Status } from "./data";

const accentVar: Record<Accent, { bar: string; bg: string }> = {
  purple: { bar: "var(--sp-purple)", bg: "var(--sp-purple-bg)" },
  cyan: { bar: "var(--sp-cyan)", bg: "var(--sp-cyan-bg)" },
  green: { bar: "var(--sp-green)", bg: "var(--sp-green-bg)" },
  yellow: { bar: "var(--sp-yellow)", bg: "var(--sp-yellow-bg)" },
};

const statusColor: Record<Status, string> = {
  Open: "var(--sp-green)",
  Planned: "var(--sp-cyan)",
  "In progress": "var(--sp-yellow)",
  Closed: "var(--sp-ink-faint)",
};

function Avatar({ initials, bg, size = 22 }: { initials: string; bg: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ background: bg, width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}

function OrderCard({
  order,
  selected,
  onSelect,
}: {
  order: WorkOrder;
  selected: boolean;
  onSelect: () => void;
}) {
  const a = accentVar[order.accent];
  return (
    <button
      onClick={onSelect}
      className="w-full rounded-lg p-2 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: a.bg,
        borderLeft: `3px solid ${a.bar}`,
        boxShadow: selected
          ? `0 0 0 2px ${a.bar}, 0 6px 16px -6px rgba(20,50,90,0.4)`
          : "0 1px 2px rgba(16,40,80,0.06)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <Avatar initials={order.initials} bg={order.avatarBg} size={18} />
        <span className="truncate text-[10px] font-medium text-[var(--sp-ink-soft)]">
          {order.person}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] font-semibold leading-tight text-[var(--sp-ink)]">
        {order.title}
      </p>
      <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-[var(--sp-ink-soft)]">
        <Clock className="h-2.5 w-2.5" />
        {order.hours}
      </div>
    </button>
  );
}

function SidebarIcon({
  icon: Icon,
  active,
  onClick,
}: {
  icon: typeof Search;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-[color-mix(in_oklch,var(--sp-blue)_8%,white)]"
      style={{
        color: active ? "var(--sp-blue)" : "var(--sp-ink-faint)",
        background: active ? "color-mix(in oklch, var(--sp-blue) 12%, white)" : "transparent",
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
          style={{ background: "var(--sp-blue)" }}
        />
      )}
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

function Legend({
  color,
  label,
  value,
  active,
  onClick,
}: {
  color: string;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-1.5 py-1.5 transition-colors hover:bg-[var(--sp-page)]"
      style={{ background: active ? "var(--sp-page)" : "transparent" }}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-xs text-[var(--sp-ink-soft)]">{label}</span>
      </div>
      <span className="text-xs font-semibold text-[var(--sp-ink)]">{value}</span>
    </button>
  );
}

export default function ShiftPlanning() {
  const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const [activeTab, setActiveTab] = useState<"Individuals" | "Teams">("Individuals");
  const [view, setView] = useState<"Day" | "Week">("Week");
  const [query, setQuery] = useState("");
  const [monthIdx, setMonthIdx] = useState(0);
  const [selectedDate, setSelectedDate] = useState(15);
  const [selectedId, setSelectedId] = useState<string | null>("th2");
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shift, setShift] = useState("Morning shift");

  const q = query.trim().toLowerCase();

  const visibleDays = useMemo(() => {
    let list = days;
    if (view === "Day") {
      list = days.filter((d) => d.date === selectedDate);
      if (list.length === 0) list = [days[0]];
    }
    if (!q) return list;
    return list.map((d) => ({
      ...d,
      orders: d.orders.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.person.toLowerCase().includes(q) ||
          o.system.toLowerCase().includes(q),
      ),
    }));
  }, [view, selectedDate, q]);

  const allOrders = days.flatMap((d) => d.orders);
  const selected = allOrders.find((o) => o.id === selectedId) ?? null;

  const planned = allOrders.filter((o) => o.status === "Planned").length;
  const unplanned = allOrders.filter(
    (o) => o.status === "Open" || o.status === "In progress",
  ).length;
  const predictive = allOrders.filter((o) => o.accent === "yellow").length;

  return (
    <main className="sp-dots min-h-screen w-full overflow-x-hidden px-4 py-8 sm:px-10 lg:px-14">
      <p className="mb-4 ml-2 text-sm font-medium tracking-wide text-[var(--sp-ink-faint)]">
        Workorders · Week View
      </p>

      <div className="relative mx-auto max-w-[1180px]">
        <div className="flex overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_-30px_rgba(20,50,90,0.35)] ring-1 ring-black/[0.03]">
          {/* sidebar */}
          <aside className="hidden w-[60px] flex-col items-center gap-1 border-r border-[var(--sp-line)] py-6 sm:flex">
            {(
              [CalendarDays, Plus, CheckCircle2, Printer, PenLine, BarChart3, CalIcon] as const
            ).map((Icon, i) => (
              <SidebarIcon key={i} icon={Icon} active={i === 6} />
            ))}
            <div className="mt-auto">
              <SidebarIcon icon={Info} />
            </div>
          </aside>

          {/* content */}
          <div className="flex-1">
            {/* top header */}
            <header className="flex items-center justify-between gap-4 px-6 py-5">
              <h1 className="text-xl font-bold tracking-tight text-[var(--sp-ink)]">
                Shift Planning
              </h1>
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-[var(--sp-line)] px-3 py-1.5 transition-colors focus-within:border-[var(--sp-blue)] md:flex">
                  <Search className="h-3.5 w-3.5 text-[var(--sp-ink-faint)]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search company space..."
                    className="w-44 bg-transparent text-xs text-[var(--sp-ink)] placeholder:text-[var(--sp-ink-faint)] focus:outline-none"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} className="text-[var(--sp-ink-faint)]">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <button className="text-[var(--sp-ink-faint)] transition-colors hover:text-[var(--sp-blue)]">
                  <MapPin className="h-4 w-4" />
                </button>
                <button className="relative text-[var(--sp-ink-faint)] transition-colors hover:text-[var(--sp-blue)]">
                  <Bell className="h-4 w-4" />
                  <span
                    className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-bold text-white"
                    style={{ background: "var(--sp-blue)" }}
                  >
                    2
                  </span>
                </button>
                <div className="flex cursor-pointer items-center gap-1.5">
                  <Avatar initials="JD" bg="#8ec5ff" size={24} />
                  <span className="text-xs font-medium text-[var(--sp-ink)]">John Dre</span>
                  <ChevronDown className="h-3 w-3 text-[var(--sp-ink-faint)]" />
                </div>
              </div>
            </header>

            {/* toolbar tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-[color-mix(in_oklch,var(--sp-page)_60%,white)] p-0.5 text-xs">
                  {(["Individuals", "Teams"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className="rounded-md px-3 py-1.5 transition-all"
                      style={{
                        background: activeTab === t ? "white" : "transparent",
                        fontWeight: activeTab === t ? 600 : 500,
                        color: activeTab === t ? "var(--sp-ink)" : "var(--sp-ink-faint)",
                        boxShadow: activeTab === t ? "0 1px 2px rgba(16,40,80,0.1)" : "none",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button className="flex items-center gap-1.5 rounded-lg border border-[var(--sp-line)] px-3 py-1.5 text-xs font-medium text-[var(--sp-ink-soft)] transition-colors hover:border-[var(--sp-blue)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--sp-blue)" }} />
                  Workorders
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-[var(--sp-line)] px-3.5 py-1.5 text-xs font-medium text-[var(--sp-ink-soft)] transition-colors hover:border-[var(--sp-blue)]">
                  Vacations
                </button>
                <button
                  className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                  style={{ background: "var(--sp-blue)" }}
                >
                  Manage Shifts
                </button>
              </div>
            </div>

            <div className="border-t border-[var(--sp-line)]" />

            {/* body */}
            <div className="flex">
              {/* left panel */}
              <div className="hidden w-[210px] shrink-0 border-r border-[var(--sp-line)] p-5 lg:block">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--sp-ink)]">Calendar</h2>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--sp-ink-faint)]" />
                </div>

                <div className="rounded-xl border border-[var(--sp-line)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <button
                      onClick={() => setMonthIdx((m) => Math.max(0, m - 1))}
                      className="text-[var(--sp-ink-faint)] transition-colors hover:text-[var(--sp-blue)]"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-semibold text-[var(--sp-ink)]">
                      {months[monthIdx]}
                    </span>
                    <button
                      onClick={() => setMonthIdx((m) => Math.min(months.length - 1, m + 1))}
                      className="text-[var(--sp-ink-faint)] transition-colors hover:text-[var(--sp-blue)]"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 text-center">
                    {weekDayLabels.map((d) => (
                      <span key={d} className="text-[9px] font-medium text-[var(--sp-ink-faint)]">
                        {d}
                      </span>
                    ))}
                    {calendarWeeks.flat().map((n, i) => {
                      const isCurrentMonth = monthIdx === 0;
                      const selectedDay = isCurrentMonth && n === selectedDate;
                      const inRange = isCurrentMonth && n !== null && n >= 15 && n <= 21;
                      return (
                        <button
                          key={i}
                          disabled={n === null}
                          onClick={() => {
                            if (n !== null && isCurrentMonth) {
                              setSelectedDate(n);
                              setView("Day");
                            }
                          }}
                          className="mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition-colors"
                          style={{
                            background: selectedDay
                              ? "var(--sp-blue)"
                              : inRange
                                ? "color-mix(in oklch, var(--sp-blue) 12%, white)"
                                : "transparent",
                            color: selectedDay
                              ? "white"
                              : n === null
                                ? "transparent"
                                : "var(--sp-ink-soft)",
                            fontWeight: inRange ? 600 : 400,
                          }}
                        >
                          {n ?? "."}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <h2 className="mb-1 mt-6 text-sm font-semibold text-[var(--sp-ink)]">Workorders</h2>
                <Legend
                  color="var(--sp-green)"
                  label="Planned"
                  value={planned}
                  active={false}
                  onClick={() => {}}
                />
                <Legend
                  color="var(--sp-cyan)"
                  label="Unplanned"
                  value={unplanned}
                  active={false}
                  onClick={() => {}}
                />
                <Legend
                  color="var(--sp-purple)"
                  label="Predictive"
                  value={predictive}
                  active={false}
                  onClick={() => {}}
                />
              </div>

              {/* week grid */}
              <div className="min-w-0 flex-1 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--sp-ink)]">
                      {view === "Day" ? `${selectedDate} January, 2020` : "15–21 January, 2020"}
                    </h2>
                    <button
                      onClick={() => setSelectedDate((d) => Math.max(15, d - 1))}
                      className="text-[var(--sp-ink-faint)] transition-colors hover:text-[var(--sp-blue)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedDate((d) => Math.min(21, d + 1))}
                      className="text-[var(--sp-ink-faint)] transition-colors hover:text-[var(--sp-blue)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShiftOpen((o) => !o)}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--sp-line)] px-3 py-1.5 text-xs font-medium text-[var(--sp-ink-soft)] transition-colors hover:border-[var(--sp-blue)]"
                      >
                        {shift}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {shiftOpen && (
                        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-[var(--sp-line)] bg-white py-1 shadow-lg">
                          {["Morning shift", "Evening shift", "Night shift"].map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setShift(s);
                                setShiftOpen(false);
                              }}
                              className="block w-full px-3 py-1.5 text-left text-xs text-[var(--sp-ink-soft)] hover:bg-[var(--sp-page)]"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex rounded-lg border border-[var(--sp-line)] p-0.5 text-xs">
                      {(["Day", "Week"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setView(v)}
                          className="rounded-md px-3 py-1 transition-all"
                          style={{
                            background:
                              view === v
                                ? "color-mix(in oklch, var(--sp-page) 70%, white)"
                                : "transparent",
                            fontWeight: view === v ? 600 : 500,
                            color: view === v ? "var(--sp-ink)" : "var(--sp-ink-faint)",
                          }}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* columns */}
                <div
                  className="sp-scroll grid gap-3 overflow-x-auto"
                  style={{
                    gridTemplateColumns:
                      view === "Day" ? "minmax(0,1fr)" : "repeat(7, minmax(110px, 1fr))",
                  }}
                >
                  {visibleDays.map((day) => (
                    <div key={day.date} className="min-w-[110px]">
                      <div className="mb-3 flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-[var(--sp-ink-faint)]">
                          {day.weekday}
                        </span>
                        {day.off ? (
                          <span className="ml-auto rounded bg-[color-mix(in_oklch,var(--sp-page)_60%,white)] px-1 text-[8px] font-semibold uppercase text-[var(--sp-ink-faint)]">
                            Off
                          </span>
                        ) : (
                          <span
                            className="ml-auto flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                            style={{ background: "var(--sp-blue)" }}
                          >
                            {day.orders.length}
                          </span>
                        )}
                      </div>
                      <div
                        className="mb-3 text-lg font-bold"
                        style={{ color: day.off ? "var(--sp-ink-faint)" : "var(--sp-blue)" }}
                      >
                        {day.date}
                      </div>
                      <div className="space-y-2.5">
                        {day.orders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            selected={order.id === selectedId}
                            onSelect={() => setSelectedId(order.id)}
                          />
                        ))}
                        {!day.off && day.orders.length === 0 && (
                          <p className="text-[10px] text-[var(--sp-ink-faint)]">No matches</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* floating mini card (top) — shows selected order */}
        {selected && (
          <div className="absolute left-1/2 top-[-20px] hidden w-[180px] -translate-x-1/2 rounded-xl bg-white p-3 shadow-[0_20px_45px_-15px_rgba(20,50,90,0.4)] ring-1 ring-black/[0.04] sm:block lg:left-[34%]">
            <div className="flex items-center gap-1.5">
              <Avatar initials={selected.initials} bg={selected.avatarBg} size={20} />
              <span className="truncate text-[11px] font-medium text-[var(--sp-ink-soft)]">
                {selected.person}
              </span>
              <ChevronDown className="ml-auto h-3 w-3 text-[var(--sp-ink-faint)]" />
            </div>
            <p className="mt-2 text-xs font-semibold leading-tight text-[var(--sp-ink)]">
              {selected.title}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-1 rounded-md bg-[var(--sp-page)] px-2 py-1 text-[10px] font-medium text-[var(--sp-ink-soft)]">
                <Clock className="h-2.5 w-2.5" />
                {selected.hours}
              </div>
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                style={{ background: "var(--sp-blue)" }}
              >
                <Flame className="h-3 w-3" />
              </span>
            </div>
          </div>
        )}

        {/* floating detail card (bottom right) — shows selected order */}
        {selected && (
          <div className="absolute bottom-[-30px] right-[2%] hidden w-[260px] rounded-2xl bg-white p-4 shadow-[0_30px_60px_-20px_rgba(20,50,90,0.45)] ring-1 ring-black/[0.04] md:block">
            <div className="flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: `color-mix(in oklch, ${statusColor[selected.status]} 16%, white)`,
                  color: statusColor[selected.status],
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: statusColor[selected.status] }}
                />
                {selected.status}
                <ChevronDown className="h-3 w-3" />
              </span>
              <button
                onClick={() => setSelectedId(null)}
                className="text-[var(--sp-ink-faint)] transition-colors hover:text-[var(--sp-ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <h3 className="mt-3 text-sm font-bold text-[var(--sp-ink)]">{selected.title}</h3>
            <div className="mt-3 space-y-2 text-[11px] text-[var(--sp-ink-soft)]">
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-[var(--sp-ink-faint)]" />
                {selected.system}
              </div>
              <div className="flex items-center gap-2">
                <CalIcon className="h-3.5 w-3.5 text-[var(--sp-ink-faint)]" />
                {selected.datetime}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[var(--sp-ink-faint)]" />
                {selected.hours.replace("hr", "hours")}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--sp-line)] pt-3">
              <div className="flex items-center gap-1.5">
                <Avatar initials={selected.initials} bg={selected.avatarBg} size={20} />
                <span className="text-[11px] font-medium text-[var(--sp-ink-soft)]">
                  {selected.person}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[var(--sp-ink-faint)]">
                <button className="transition-colors hover:text-[var(--sp-blue)]">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button className="transition-colors hover:text-[var(--sp-blue)]">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
