import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Ticket } from "@/lib/mock-tickets";
import {
  TicketStatusBadge,
  TicketPriorityBadge,
  TicketCriticalityBadge,
  TicketSlaBadge,
  Initials,
} from "./badges";
import {
  Sparkles,
  Paperclip,
  Send,
  AlertCircle,
  Clock,
  CheckCircle2,
  UserPlus,
  RefreshCw,
  MoreHorizontal,
  History,
  MessageCircle,
  Wrench,
  Gauge,
  FileText,
} from "lucide-react";

export function TicketDetailDrawer({
  ticket,
  open,
  onOpenChange,
  onAssign,
  onStatus,
}: {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAssign: () => void;
  onStatus: () => void;
}) {
  if (!ticket) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <div className="p-6 text-white" style={{ background: "var(--gradient-cgi)" }}>
          <SheetHeader className="text-left">
            <div className="font-mono text-xs text-white/80">{ticket.reference}</div>
            <SheetTitle className="text-white">{ticket.title}</SheetTitle>
            <SheetDescription className="text-white/80">{ticket.description}</SheetDescription>
          </SheetHeader>
          <div className="mt-3 flex flex-wrap gap-2">
            <TicketStatusBadge value={ticket.status} />
            <TicketPriorityBadge value={ticket.priority} />
            <TicketCriticalityBadge value={ticket.criticality} />
            <TicketSlaBadge value={ticket.sla} remaining={ticket.slaRemaining} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={onAssign}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Affecter / Réaffecter
            </Button>
            <Button size="sm" variant="secondary" onClick={onStatus}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Modifier le statut
            </Button>
            <Button size="sm" variant="secondary">
              <MoreHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Plus d'actions
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview"><FileText className="mr-1.5 h-3.5 w-3.5" />Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="sla"><Gauge className="mr-1.5 h-3.5 w-3.5" />SLA</TabsTrigger>
              <TabsTrigger value="history"><History className="mr-1.5 h-3.5 w-3.5" />Historique</TabsTrigger>
              <TabsTrigger value="discussion"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />Discussion</TabsTrigger>
              <TabsTrigger value="resolution"><Wrench className="mr-1.5 h-3.5 w-3.5" />Résolution</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <Card title="Informations principales">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Demandeur" value={ticket.requester} />
                  <Info label="Créé par" value={ticket.creator} />
                  <Info label="Département" value={ticket.department} />
                  <Info label="Type" value={ticket.type} />
                  <Info label="Catégorie" value={ticket.category} />
                  <Info label="Créé le" value={ticket.createdAt} />
                  <Info label="Dernière mise à jour" value={ticket.updated} />
                  <Info label="Statut actuel" value={ticket.status} />
                </dl>
              </Card>
              <Card title="Affectation">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ticket.assignee ? <Initials name={ticket.assignee} /> : null}
                    <div>
                      <div className="text-sm font-medium">{ticket.assignee ?? "Non affecté"}</div>
                      <div className="text-xs text-muted-foreground">
                        Disponible · 8 tickets actifs · Charge équilibrée
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={onAssign}>Réaffecter</Button>
                </div>
              </Card>
              <Card title="Prochaines actions">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button variant="outline" size="sm">Commencer le traitement</Button>
                  <Button variant="outline" size="sm">Demander une information</Button>
                  <Button variant="outline" size="sm">Marquer comme résolu</Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="sla" className="mt-4 space-y-4">
              <Card title="Politique SLA">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Politique" value="Incident critique – Support prioritaire" />
                  <Info label="Prise en charge cible" value="15 min" />
                  <Info label="Résolution cible" value="4 h" />
                  <Info label="Temps écoulé" value="3 h 18 min" />
                  <Info label="Temps restant" value="42 min" />
                  <Info label="Statut" value="En risque" />
                  <Info label="Niveau d'escalade" value="Niveau 2" />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Progression de résolution</span>
                    <span>82 %</span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>
              </Card>
              <Card title="Chronologie SLA">
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {[
                    { label: "Ticket créé", time: "14:42", state: "done" },
                    { label: "Ticket affecté", time: "14:46", state: "done" },
                    { label: "Prise en charge", time: "14:52", state: "done" },
                    { label: "Risque détecté", time: "16:18", state: "warn" },
                    { label: "Échéance prévue", time: "18:00", state: "pending" },
                  ].map((s) => (
                    <li key={s.label} className="relative">
                      <span
                        className={
                          "absolute -left-[26px] top-1 grid h-3 w-3 place-items-center rounded-full ring-4 ring-background " +
                          (s.state === "done"
                            ? "bg-emerald-500"
                            : s.state === "warn"
                            ? "bg-orange-500"
                            : "bg-muted-foreground/40")
                        }
                      />
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.time}</div>
                    </li>
                  ))}
                </ol>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card title="Historique">
                <ol className="relative space-y-5 border-l border-border pl-5">
                  {[
                    { t: "14:42", who: "Nadia El Mansouri", what: "Ticket créé", icon: FileText },
                    { t: "14:46", who: "Système", what: "Ticket affecté à Sara El Amrani", icon: UserPlus },
                    { t: "14:52", who: "Sara El Amrani", what: "Statut modifié de Assigné à En cours", icon: RefreshCw },
                    { t: "16:18", who: "Système", what: "Risque de dépassement SLA détecté", icon: AlertCircle },
                  ].map((e, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[30px] top-0 grid h-6 w-6 place-items-center rounded-full bg-muted text-muted-foreground ring-4 ring-background">
                        <e.icon className="h-3 w-3" />
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {e.t}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{e.who}</span> — {e.what}
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </TabsContent>

            <TabsContent value="discussion" className="mt-4">
              <Card title="Discussion">
                <div className="space-y-4">
                  {[
                    { who: "Sara El Amrani", when: "14:55", msg: "J'ai commencé le diagnostic sur la passerelle VPN.", urgent: false },
                    { who: "Nadia El Mansouri", when: "15:10", msg: "Merci, l'utilisateur est bloqué depuis ce matin.", urgent: true },
                  ].map((m, i) => (
                    <div key={i} className="flex gap-3">
                      <Initials name={m.who} />
                      <div className="flex-1 rounded-xl border border-border bg-muted/40 p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{m.who}</span>
                          <span className="text-muted-foreground">{m.when}</span>
                          {m.urgent ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                              Urgent
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm">{m.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-border p-3">
                  <Textarea rows={3} placeholder="Écrire un message…" className="border-0 shadow-none focus-visible:ring-0" />
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                        Joindre
                      </Button>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input type="checkbox" className="h-3.5 w-3.5" />
                        Message urgent
                      </label>
                    </div>
                    <Button size="sm" className="text-white" style={{ background: "var(--gradient-cgi)" }}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Envoyer
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="resolution" className="mt-4 space-y-4">
              <Card title="Résolution">
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>Type de résolution</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
                      <SelectContent>
                        {["Correctif définitif", "Contournement", "Sans action", "Redirigé"].map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Actions réalisées</Label>
                    <Textarea rows={2} placeholder="Détaillez les actions menées…" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Synthèse de résolution</Label>
                    <Textarea rows={2} placeholder="Résumez la résolution en quelques lignes…" />
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label>Outils utilisés</Label>
                      <Textarea rows={2} placeholder="Ex : Console VPN, Active Directory…" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Commentaire final</Label>
                      <Textarea rows={2} placeholder="Note finale à l'attention du demandeur…" />
                    </div>
                  </div>
                </div>
              </Card>

              <div
                className="rounded-2xl border p-5 text-white"
                style={{ background: "var(--gradient-cgi)", boxShadow: "var(--shadow-cgi)" }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <div className="text-sm font-semibold">Assistance Quality Lab</div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                  <button className="rounded-lg bg-white/15 px-2 py-2 hover:bg-white/25">Analyser le ticket</button>
                  <button className="rounded-lg bg-white/15 px-2 py-2 hover:bg-white/25">Rechercher des cas similaires</button>
                  <button className="rounded-lg bg-white/15 px-2 py-2 hover:bg-white/25">Générer une trame de résolution</button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-white/10 p-3 text-xs sm:grid-cols-3">
                  <div>
                    <div className="text-white/70">Score qualité</div>
                    <div className="text-lg font-semibold">86 %</div>
                  </div>
                  <div>
                    <div className="text-white/70">Cas similaires</div>
                    <div className="text-lg font-semibold">3 résultats</div>
                  </div>
                  <div>
                    <div className="text-white/70">Éléments manquants</div>
                    <div className="text-sm">Préciser la vérification finale effectuée.</div>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-white text-foreground">
                  <div className="border-b border-border p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Trame de résolution générée
                  </div>
                  <div className="space-y-2 p-4 text-sm">
                    <p><span className="font-medium">Diagnostic :</span> Blocage du client VPN suite à un renouvellement de certificat.</p>
                    <p><span className="font-medium">Actions :</span> Réinitialisation du profil utilisateur, redéploiement du certificat et test de connexion.</p>
                    <p><span className="font-medium">Vérification :</span> Connexion validée depuis le poste utilisateur, accès aux ressources internes confirmé.</p>
                    <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                      La proposition doit être vérifiée et validée avant la clôture du ticket.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 border-t border-border p-3">
                    <Button variant="ghost" size="sm">Rejeter</Button>
                    <Button variant="outline" size="sm">Modifier</Button>
                    <Button size="sm" className="text-white" style={{ background: "var(--gradient-cgi)" }}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Utiliser cette trame
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}