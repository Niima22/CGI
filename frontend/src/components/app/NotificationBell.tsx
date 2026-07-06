import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationType,
  type NotificationResponse,
} from "@/lib/api/notifications";
import { useAuth } from "@/lib/auth-store";

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function readStateLabel(notification: NotificationResponse) {
  return notification.read ? "Lu" : "Non lu";
}

const notificationTypeFallbackLabels: Record<NotificationType, string> = {
  TICKET_ASSIGNED: "Ticket affecte",
  TICKET_REASSIGNED: "Ticket reaffecte",
  TICKET_STATUS_UPDATED: "Mise a jour du statut",
  TICKET_PENDING_REMINDER: "Rappel ticket en attente",
  SLA_AT_RISK: "SLA en risque",
  SLA_BREACHED: "SLA depasse",
  SLA_ESCALATION_LEVEL_1: "Escalade superviseur",
  SLA_ESCALATION_LEVEL_2: "Escalade administrateur",
};

function notificationTypeLabel(notification: NotificationResponse) {
  const typeLabel = notification.typeLabel?.trim();
  if (typeLabel) {
    return typeLabel;
  }
  return notificationTypeFallbackLabels[notification.type];
}

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const { isReady, isAuthenticated, authenticatedFetch } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const visibleNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  const refresh = useCallback(
    async (includeList = true) => {
      if (!isReady || !isAuthenticated) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      if (includeList) {
        setLoading(true);
      }
      setError(null);

      try {
        const countResponse = await getUnreadNotificationCount(authenticatedFetch);

        setUnreadCount(countResponse.unreadCount);
        if (includeList) {
          const listResponse = await getNotifications(authenticatedFetch);
          setNotifications(listResponse);
        }
      } catch {
        setError("Impossible de charger les notifications.");
      } finally {
        if (includeList) {
          setLoading(false);
        }
      }
    },
    [authenticatedFetch, isAuthenticated, isReady],
  );

  useEffect(() => {
    void refresh(true);

    if (!isReady || !isAuthenticated) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh(open);
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, isReady, open, refresh]);

  useEffect(() => {
    if (open) {
      void refresh(true);
    }
  }, [open, refresh]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead(authenticatedFetch);
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
          readAt: notification.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch {
      setError("Impossible de charger les notifications.");
    }
  }, [authenticatedFetch]);

  const handleMarkRead = useCallback(
    async (notificationId: number) => {
      try {
        const updated = await markNotificationRead(authenticatedFetch, notificationId);
        setNotifications((current) =>
          current.map((notification) => (notification.id === notificationId ? updated : notification)),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        setError("Impossible de charger les notifications.");
      }
    },
    [authenticatedFetch],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className={`relative flex items-center justify-center rounded-xl border border-transparent bg-muted/75 transition-colors hover:bg-accent ${
            compact ? "h-8 w-8" : "h-10 w-10"
          }`}
        >
          <Bell className="h-4 w-4 text-foreground" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] overflow-hidden rounded-xl border border-border/80 p-0 shadow-card">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <div className="text-sm font-semibold text-foreground">Notifications</div>
            <div className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Toutes les notifications sont lues"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </button>
        </div>

        <DropdownMenuSeparator />

        <div className="max-h-[420px] overflow-y-auto bg-background">
          {loading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Chargement des notifications...</div>
          ) : error ? (
            <div className="px-4 py-6 text-sm text-destructive">{error}</div>
          ) : visibleNotifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Aucune notification</div>
          ) : (
            visibleNotifications.map((notification, index) => (
              <div key={notification.id}>
                <div className={`space-y-3 px-4 py-3.5 ${notification.read ? "bg-background" : "bg-accent/25"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{notification.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{notificationTypeLabel(notification)}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        notification.read
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {readStateLabel(notification)}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-foreground/90">{notification.message}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatNotificationDate(notification.createdAt)}
                    </span>
                    <div className="flex items-center gap-3">
                      {!notification.read ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(notification.id)}
                          className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          Marquer comme lu
                        </button>
                      ) : null}
                      {notification.ticketId ? (
                        <Link
                          reloadDocument
                          to="/tickets/$id"
                          params={{ id: String(notification.ticketId) }}
                          className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          Voir le ticket
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
                {index < visibleNotifications.length - 1 ? <DropdownMenuSeparator /> : null}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
