# PFE Demo Checklist

## A. Preparation

1. Start the local stack:
   `powershell -ExecutionPolicy Bypass -File scripts\start-dev.ps1`
2. Run the health check:
   `powershell -ExecutionPolicy Bypass -File scripts\health-dev.ps1`
3. Clear local demo data:
   `powershell -ExecutionPolicy Bypass -File scripts\clear-demo-sla-kpi.ps1`
4. Seed local demo data:
   `powershell -ExecutionPolicy Bypass -File scripts\seed-demo-sla-kpi.ps1`
5. Prepare login accounts:
   - `pilote@cgi.local`
   - `superviseur@cgi.local`
   - `agent@cgi.local`

## B. Pages To Demo

- `/dashboard`
- `/tickets`
- `/tickets/:id`
- `/sla/policies`

## C. Demo Flow

1. Open `/dashboard`
2. Show incident metrics
3. Show SLA cards
4. Show `KPI employés`
5. Show `Tickets SLA urgents`
6. Open one urgent ticket or one ticket from `/tickets`
7. Show `Détail du ticket`
8. Show `Suivi SLA`
9. Click `Recalculer le SLA`
10. Show the notification bell
11. Mark one notification as read
12. Export `Rapport KPI & SLA`
13. Export `Rapport SLA`
14. Open `/sla/policies`
15. Show active SLA rules and role-based access

## D. Key PFE Points To Say

- Ticket lifecycle from creation to resolution
- Automatic SLA calculation
- Detection of `En risque` and `Dépassé`
- Escalations and notifications
- KPI decision dashboard
- Employee workload and productivity
- PDF reporting
- French UI and role-based access

## E. Known Limitations

- Employee labels currently use `Agent #id`
- Manager scoping is global for now
- Demo scripts are local/dev only
- WebSocket/Kafka are future improvements, not part of this version
