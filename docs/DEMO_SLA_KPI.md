# DEMO SLA / KPI

## Purpose

Prepare local demo data for SLA/KPI dashboard validation.

## Prerequisites

- Local stack running
- Dev users available:
  - `pilote@cgi.local`
  - `superviseur@cgi.local`
  - `agent@cgi.local`

## Commands

Start stack:

```powershell
scripts\start-dev.ps1
```

Health check:

```powershell
scripts\health-dev.ps1
```

Seed demo data:

```powershell
scripts\seed-demo-sla-kpi.ps1
```

Clear demo data:

```powershell
scripts\clear-demo-sla-kpi.ps1
```

## What the seed creates

- 3 SLA policies
- 8 demo tickets
- Assigned tickets for KPI workload/productivity
- SLA states covering:
  - `Respecté`
  - `En risque`
  - `Dépassé`

## Pages to verify

- `/dashboard`
- `/tickets`
- `/tickets/:id`
- `/sla/policies`

## Notes

- `seed-demo-sla-kpi.ps1` is local demo preparation only.
- `clear-demo-sla-kpi.ps1` removes only:
  - tickets whose reference starts with `DEMO-KPI-`
  - `ticket_sla` and `ticket_history` rows linked to those tickets
  - exact demo SLA policies named:
    - `Incident critique`
    - `Incident standard`
    - `Demande faible priorité`
- It does not remove unrelated local records such as `Validation UI SLA MAJ`.
