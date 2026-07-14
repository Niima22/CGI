import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  AlertCircle,
  ArrowUp,
  Check,
  CircleAlert,
  LoaderCircle,
  MessageCircleMore,
  MessageSquareMore,
  MessagesSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Ticket,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import {
  buildConversationTitle,
  buildParticipantSummary,
  formatConversationActivityDate,
  formatMessageDateTime,
  getConversationTypeLabel,
  getUserDisplayLabel,
} from "@/components/messages/message-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  addConversationParticipant,
  createDirectConversation,
  createGroupConversation,
  createTicketConversation,
  getConversationDetail,
  getConversationMessages,
  getTicketConversation,
  getUnreadCount,
  listConversations,
  listMessagingDirectoryUsers,
  markConversationRead,
  MessagesApiError,
  removeConversationParticipant,
  sendMessage,
  type Conversation,
  type ConversationType,
  type Message,
  type MessagingDirectoryUser,
} from "@/lib/api/messages";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const routeSearchSchema = z.object({
  conversationId: z.coerce.number().optional(),
  ticketId: z.coerce.number().optional(),
  ticketReference: z.string().optional(),
});

const CONVERSATIONS_POLL_MS = 45000;
const MESSAGES_POLL_MS = 30000;
const MESSAGE_PAGE_SIZE = 50;

type CreationMode = ConversationType;

interface TicketThreadContext {
  ticketId: number;
  ticketReference?: string | null;
}

interface CreationFormState {
  mode: CreationMode;
  title: string;
  initialMessage: string;
  urgent: boolean;
  participantIds: number[];
  ticketId: number | null;
}

const emptyCreationForm: CreationFormState = {
  mode: "DIRECT",
  title: "",
  initialMessage: "",
  urgent: false,
  participantIds: [],
  ticketId: null,
};

export const Route = createFileRoute("/messages")({
  validateSearch: routeSearchSchema,
  head: () => ({
    meta: [
      { title: "Messagerie - CGI-FLOW" },
      {
        name: "description",
        content: "Conversations internes, discussions tickets et suivi des messages CGI-FLOW.",
      },
    ],
  }),
  component: MessagesPage,
});

export function MessagesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { authenticatedFetch, hasRole, isAuthenticated, isReady, user } = useAuth();
  const currentUserId = user?.localProfile?.id ?? null;
  const [conversationFilter, setConversationFilter] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<MessagingDirectoryUser[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderPageIndex, setOlderPageIndex] = useState<number | null>(null);
  const [olderPagesAvailable, setOlderPagesAvailable] = useState(false);
  const [composerValue, setComposerValue] = useState("");
  const [composerUrgent, setComposerUrgent] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreationFormState>(emptyCreationForm);
  const [createSearch, setCreateSearch] = useState("");
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [ticketThreadContext, setTicketThreadContext] = useState<TicketThreadContext | null>(null);
  const [ticketThreadNotice, setTicketThreadNotice] = useState<string | null>(null);
  const [refreshingOverview, setRefreshingOverview] = useState(false);
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [participantMutationError, setParticipantMutationError] = useState<string | null>(null);
  const [participantMutationPending, setParticipantMutationPending] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const conversationsPollInFlightRef = useRef(false);
  const messagesPollInFlightRef = useRef(false);
  const markReadInFlightRef = useRef(false);
  const ticketResolutionRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const usersById = useMemo(
    () => new Map(directoryUsers.map((directoryUser) => [directoryUser.id, directoryUser])),
    [directoryUsers],
  );

  const filteredConversations = useMemo(() => {
    const query = normalize(conversationFilter);
    const sorted = [...conversations].sort(
      (left, right) =>
        new Date(right.lastMessageAt ?? right.updatedAt).getTime() -
        new Date(left.lastMessageAt ?? left.updatedAt).getTime(),
    );
    if (!query) {
      return sorted;
    }

    return sorted.filter((conversation) => {
      const title = buildConversationTitle(conversation, currentUserId, usersById);
      const summary = buildParticipantSummary(conversation, currentUserId, usersById);
      const ticketLabel = conversation.ticketId ? `ticket ${conversation.ticketId}` : "";
      return [title, summary, conversation.lastMessagePreview ?? "", ticketLabel]
        .map(normalize)
        .some((value) => value.includes(query));
    });
  }, [conversationFilter, conversations, currentUserId, usersById]);

  const selectableUsers = useMemo(() => {
    const query = normalize(createSearch);
    return directoryUsers
      .filter((directoryUser) => directoryUser.id !== currentUserId)
      .filter((directoryUser) => {
        if (!query) {
          return true;
        }
        return `${directoryUser.fullName} ${directoryUser.email} ${directoryUser.role}`
          .toLowerCase()
          .includes(query);
      });
  }, [createSearch, currentUserId, directoryUsers]);

  const selectedConversationTitle = useMemo(() => {
    if (!selectedConversation) {
      return null;
    }
    return buildConversationTitle(selectedConversation, currentUserId, usersById);
  }, [currentUserId, selectedConversation, usersById]);

  const selectedConversationTypeLabel = useMemo(() => {
    if (!selectedConversation) {
      return null;
    }
    return getConversationTypeLabel(selectedConversation.type);
  }, [selectedConversation]);

  const selectedParticipantSummary = useMemo(() => {
    if (!selectedConversation) {
      return null;
    }
    return buildParticipantSummary(selectedConversation, currentUserId, usersById);
  }, [currentUserId, selectedConversation, usersById]);

  const canManageSelectedParticipants = useMemo(() => {
    if (!selectedConversation || selectedConversation.type !== "GROUP" || !currentUserId) {
      return false;
    }
    return (
      selectedConversation.createdByUserId === currentUserId ||
      hasRole("ADMIN") ||
      hasRole("MANAGER")
    );
  }, [currentUserId, hasRole, selectedConversation]);

  const availableParticipantsToAdd = useMemo(() => {
    const activeParticipantIds = new Set(
      (selectedConversation?.participants ?? [])
        .filter((participant) => participant.active)
        .map((participant) => participant.userId),
    );
    const query = normalize(participantSearch);
    return directoryUsers
      .filter((directoryUser) => directoryUser.id !== currentUserId)
      .filter((directoryUser) => !activeParticipantIds.has(directoryUser.id))
      .filter((directoryUser) => {
        if (!query) {
          return true;
        }
        return `${directoryUser.fullName} ${directoryUser.email} ${directoryUser.role}`
          .toLowerCase()
          .includes(query);
      });
  }, [currentUserId, directoryUsers, participantSearch, selectedConversation]);

  const canSendMessage = composerValue.trim().length > 0 && !sendingMessage && Boolean(selectedConversationId);

  const loadDirectory = useCallback(async () => {
    if (!isReady || !isAuthenticated) {
      setDirectoryUsers([]);
      setLoadingDirectory(false);
      return;
    }
    setLoadingDirectory(true);
    setDirectoryError(null);
    try {
      setDirectoryUsers(await listMessagingDirectoryUsers(authenticatedFetch));
    } catch (caught) {
      setDirectoryError(readMessagesError(caught, "Impossible de charger l'annuaire des participants."));
    } finally {
      setLoadingDirectory(false);
    }
  }, [authenticatedFetch, isAuthenticated, isReady]);

  const loadUnreadTotal = useCallback(async () => {
    if (!isReady || !isAuthenticated) {
      setTotalUnreadCount(0);
      return;
    }
    try {
      const response = await getUnreadCount(authenticatedFetch);
      setTotalUnreadCount(response.unreadCount);
    } catch {
      setTotalUnreadCount(0);
    }
  }, [authenticatedFetch, isAuthenticated, isReady]);

  const loadConversations = useCallback(async () => {
    if (!isReady || !isAuthenticated) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);
    setConversationsError(null);
    try {
      const response = await listConversations(authenticatedFetch);
      setConversations(response);
    } catch (caught) {
      setConversationsError(readMessagesError(caught, "Impossible de charger les conversations."));
    } finally {
      setLoadingConversations(false);
    }
  }, [authenticatedFetch, isAuthenticated, isReady]);

  const refreshOverview = useCallback(
    async (showSpinner = false) => {
      if (!isReady || !isAuthenticated) {
        setConversations([]);
        setTotalUnreadCount(0);
        return;
      }
      if (showSpinner) {
        setRefreshingOverview(true);
      }
      setConversationsError(null);
      try {
        const [conversationResponse, unreadResponse] = await Promise.all([
          listConversations(authenticatedFetch),
          getUnreadCount(authenticatedFetch),
        ]);
        setConversations(conversationResponse);
        setTotalUnreadCount(unreadResponse.unreadCount);
      } catch (caught) {
        setConversationsError(readMessagesError(caught, "Impossible de rafraichir la messagerie."));
      } finally {
        if (showSpinner) {
          setRefreshingOverview(false);
        }
      }
    },
    [authenticatedFetch, isAuthenticated, isReady],
  );

  const scrollMessagesToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      const viewport = messagesViewportRef.current;
      if (!viewport) {
        return;
      }
      viewport.scrollTop = viewport.scrollHeight;
    });
  }, []);

  const fetchLatestMessagePage = useCallback(
    async (conversationId: number) => {
      const firstPage = await getConversationMessages(
        authenticatedFetch,
        conversationId,
        0,
        MESSAGE_PAGE_SIZE,
      );
      if (firstPage.totalPages <= 1) {
        return firstPage;
      }
      return getConversationMessages(
        authenticatedFetch,
        conversationId,
        firstPage.totalPages - 1,
        MESSAGE_PAGE_SIZE,
      );
    },
    [authenticatedFetch],
  );

  const syncSelectedConversationFromList = useCallback(
    (conversationId: number) => {
      const matched = conversations.find((conversation) => conversation.id === conversationId);
      if (!matched) {
        return;
      }
      setSelectedConversation((current) => {
        if (!current || current.id !== matched.id) {
          return matched;
        }
        return {
          ...matched,
          participants: current.participants.length > 0 ? current.participants : matched.participants,
        };
      });
    },
    [conversations],
  );

  const loadConversationContext = useCallback(
    async (conversationId: number, scrollToBottomAfterLoad = true) => {
      setMessagesLoading(true);
      setMessagesError(null);
      try {
        const [detail, latestPage] = await Promise.all([
          getConversationDetail(authenticatedFetch, conversationId),
          fetchLatestMessagePage(conversationId),
        ]);
        setSelectedConversation(detail);
        setMessages(latestPage.content);
        setOlderPageIndex(latestPage.page > 0 ? latestPage.page - 1 : null);
        setOlderPagesAvailable(latestPage.page > 0);
        if (scrollToBottomAfterLoad) {
          scrollMessagesToBottom();
        }
      } catch (caught) {
        setMessages([]);
        setMessagesError(readMessagesError(caught, "Impossible de charger l'historique de la conversation."));
      } finally {
        setMessagesLoading(false);
      }
    },
    [authenticatedFetch, fetchLatestMessagePage, scrollMessagesToBottom],
  );

  const openConversation = useCallback(
    async (conversationId: number, options?: { updateSearch?: boolean; scrollToBottomAfterLoad?: boolean }) => {
      setTicketThreadNotice(null);
      setSelectedConversationId(conversationId);
      if (options?.updateSearch !== false) {
        await navigate({
          to: "/messages",
          search: (previous) => ({
            ...previous,
            conversationId,
          }),
        });
      }
      await loadConversationContext(conversationId, options?.scrollToBottomAfterLoad !== false);
    },
    [loadConversationContext, navigate],
  );

  const refreshSelectedConversationMessages = useCallback(
    async (conversationId: number, scrollToLatest = false) => {
      const latestPage = await fetchLatestMessagePage(conversationId);
      setOlderPageIndex((current) => {
        if (current == null) {
          return latestPage.page > 0 ? latestPage.page - 1 : null;
        }
        return Math.min(current, latestPage.page - 1);
      });
      setOlderPagesAvailable((current) => current || latestPage.page > 0);
      setMessages((current) => mergeMessages(current, latestPage.content));
      if (scrollToLatest) {
        scrollMessagesToBottom();
      }
    },
    [fetchLatestMessagePage, scrollMessagesToBottom],
  );

  const loadOlderMessages = useCallback(async () => {
    if (!selectedConversationId || olderPageIndex == null || loadingOlderMessages) {
      return;
    }
    setLoadingOlderMessages(true);
    try {
      const page = await getConversationMessages(
        authenticatedFetch,
        selectedConversationId,
        olderPageIndex,
        MESSAGE_PAGE_SIZE,
      );
      setMessages((current) => mergeMessages(page.content, current));
      setOlderPageIndex(page.page > 0 ? page.page - 1 : null);
      setOlderPagesAvailable(page.page > 0);
    } catch (caught) {
      toast.error(readMessagesError(caught, "Impossible de charger les messages plus anciens."));
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [authenticatedFetch, loadingOlderMessages, olderPageIndex, selectedConversationId]);

  const resolveTicketConversation = useCallback(
    async (ticketId: number, ticketReference?: string | null) => {
      const resolutionKey = `${ticketId}:${ticketReference ?? ""}`;
      if (ticketResolutionRef.current === resolutionKey) {
        return;
      }
      ticketResolutionRef.current = resolutionKey;
      setTicketThreadNotice(null);
      try {
        const response = await getTicketConversation(authenticatedFetch, ticketId);
        setTicketThreadContext(null);
        await openConversation(response.id, { updateSearch: true });
      } catch (caught) {
        if (caught instanceof MessagesApiError && caught.status === 404) {
          setTicketThreadContext({ ticketId, ticketReference });
          setSelectedConversationId(null);
          setSelectedConversation(null);
          setMessages([]);
          setMessagesError(null);
          setTicketThreadNotice("Aucune discussion ticket n'existe encore pour cette reference.");
          return;
        }
        setTicketThreadNotice(readMessagesError(caught, "Impossible d'ouvrir la discussion ticket."));
      }
    },
    [authenticatedFetch, openConversation],
  );

  useEffect(() => {
    void Promise.all([loadDirectory(), loadConversations(), loadUnreadTotal()]);
  }, [loadConversations, loadDirectory, loadUnreadTotal]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    syncSelectedConversationFromList(selectedConversationId);
  }, [conversations, selectedConversationId, syncSelectedConversationFromList]);

  useEffect(() => {
    if (loadingConversations || !isReady || !isAuthenticated || initializedRef.current) {
      return;
    }

    if (search.conversationId) {
      initializedRef.current = true;
      void openConversation(search.conversationId, { updateSearch: false });
      return;
    }

    if (search.ticketId) {
      initializedRef.current = true;
      void resolveTicketConversation(search.ticketId, search.ticketReference);
      return;
    }

    if (filteredConversations[0]) {
      initializedRef.current = true;
      void openConversation(filteredConversations[0].id, { updateSearch: true });
    } else {
      initializedRef.current = true;
    }
  }, [
    filteredConversations,
    isAuthenticated,
    isReady,
    loadingConversations,
    openConversation,
    resolveTicketConversation,
    search.conversationId,
    search.ticketId,
    search.ticketReference,
  ]);

  useEffect(() => {
    if (!selectedConversation || selectedConversation.unreadCount <= 0 || markReadInFlightRef.current) {
      return;
    }

    const unreadToClear = selectedConversation.unreadCount;
    markReadInFlightRef.current = true;
    void markConversationRead(authenticatedFetch, selectedConversation.id)
      .then((participant) => {
        setSelectedConversation((current) =>
          current
            ? {
                ...current,
                unreadCount: 0,
                participants: current.participants.map((existing) =>
                  existing.userId === participant.userId ? participant : existing,
                ),
              }
            : current,
        );
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversation.id ? { ...conversation, unreadCount: 0 } : conversation,
          ),
        );
        setTotalUnreadCount((current) => Math.max(0, current - unreadToClear));
      })
      .catch((caught) => {
        toast.error(readMessagesError(caught, "Impossible de marquer la conversation comme lue."));
      })
      .finally(() => {
        markReadInFlightRef.current = false;
      });
  }, [authenticatedFetch, selectedConversation]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible" || conversationsPollInFlightRef.current) {
        return;
      }
      conversationsPollInFlightRef.current = true;
      void refreshOverview(false).finally(() => {
        conversationsPollInFlightRef.current = false;
      });
    }, CONVERSATIONS_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshOverview]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible" || messagesPollInFlightRef.current) {
        return;
      }
      messagesPollInFlightRef.current = true;
      void refreshSelectedConversationMessages(selectedConversationId, false)
        .then(() => refreshOverview(false))
        .finally(() => {
          messagesPollInFlightRef.current = false;
        });
    }, MESSAGES_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshOverview, refreshSelectedConversationMessages, selectedConversationId]);

  async function handleRefreshAll() {
    await refreshOverview(true);
    if (selectedConversationId) {
      await loadConversationContext(selectedConversationId, false);
    }
  }

  async function handleSendMessage() {
    if (!selectedConversationId || !canSendMessage) {
      return;
    }
    setSendingMessage(true);
    setComposerError(null);
    try {
      const sentMessage = await sendMessage(authenticatedFetch, selectedConversationId, {
        content: composerValue,
        urgent: composerUrgent,
      });
      setMessages((current) => mergeMessages(current, [sentMessage]));
      setComposerValue("");
      setComposerUrgent(false);
      setConversations((current) =>
        sortConversationsByActivity(
          current.map((conversation) =>
            conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  lastMessagePreview: sentMessage.content,
                  lastMessageAt: sentMessage.createdAt,
                  lastMessageUrgent: sentMessage.urgent,
                  updatedAt: sentMessage.createdAt,
                }
              : conversation,
          ),
        ),
      );
      setSelectedConversation((current) =>
        current
          ? {
              ...current,
              lastMessagePreview: sentMessage.content,
              lastMessageAt: sentMessage.createdAt,
              lastMessageUrgent: sentMessage.urgent,
              updatedAt: sentMessage.createdAt,
            }
          : current,
      );
      scrollMessagesToBottom();
      void refreshOverview(false);
    } catch (caught) {
      const message = readMessagesError(caught, "Impossible d'envoyer le message.");
      setComposerError(message);
      toast.error(message);
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleAddParticipant(userId: number) {
    if (!selectedConversationId) {
      return;
    }
    setParticipantMutationPending(true);
    setParticipantMutationError(null);
    try {
      await addConversationParticipant(authenticatedFetch, selectedConversationId, userId);
      await Promise.all([loadConversationContext(selectedConversationId, false), refreshOverview(false)]);
      setParticipantDialogOpen(false);
      setParticipantSearch("");
    } catch (caught) {
      setParticipantMutationError(readMessagesError(caught, "Impossible d'ajouter le participant."));
    } finally {
      setParticipantMutationPending(false);
    }
  }

  async function handleRemoveParticipant(userId: number) {
    if (!selectedConversationId) {
      return;
    }
    setParticipantMutationPending(true);
    setParticipantMutationError(null);
    try {
      await removeConversationParticipant(authenticatedFetch, selectedConversationId, userId);
      await Promise.all([loadConversationContext(selectedConversationId, false), refreshOverview(false)]);
    } catch (caught) {
      const message = readMessagesError(caught, "Impossible de retirer le participant.");
      setParticipantMutationError(message);
      toast.error(message);
    } finally {
      setParticipantMutationPending(false);
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSendMessage) {
        void handleSendMessage();
      }
    }
  }

  function openCreateDialog(mode: CreationMode, ticketContext?: TicketThreadContext | null) {
    setCreateError(null);
    setCreateSearch("");
    setCreateForm({
      mode,
      title: "",
      initialMessage: "",
      urgent: false,
      participantIds: [],
      ticketId: ticketContext?.ticketId ?? null,
    });
    setCreateOpen(true);
  }

  function toggleParticipantSelection(userId: number, checked: boolean) {
    setCreateForm((current) => {
      const nextIds = checked
        ? Array.from(new Set([...current.participantIds, userId]))
        : current.participantIds.filter((id) => id !== userId);
      if (current.mode === "DIRECT" && checked) {
        return { ...current, participantIds: [userId] };
      }
      return { ...current, participantIds: nextIds };
    });
  }

  async function handleCreateConversation() {
    setCreatingConversation(true);
    setCreateError(null);
    try {
      let createdConversation: Conversation;
      if (createForm.mode === "DIRECT") {
        if (createForm.participantIds.length !== 1) {
          throw new Error("Selectionnez exactement un participant pour une conversation directe.");
        }
        createdConversation = await createDirectConversation(authenticatedFetch, createForm.participantIds[0], {
          initialMessage: createForm.initialMessage.trim() || null,
          urgent: createForm.urgent,
        });
      } else if (createForm.mode === "GROUP") {
        if (!createForm.title.trim()) {
          throw new Error("Le titre du groupe est obligatoire.");
        }
        if (createForm.participantIds.length < 1) {
          throw new Error("Selectionnez au moins un participant pour le groupe.");
        }
        createdConversation = await createGroupConversation(authenticatedFetch, {
          title: createForm.title.trim(),
          participantUserIds: dedupeNumbers(createForm.participantIds),
          initialMessage: createForm.initialMessage.trim() || null,
          urgent: createForm.urgent,
        });
      } else {
        if (!createForm.ticketId) {
          throw new Error("Le ticket de reference est obligatoire.");
        }
        createdConversation = await createTicketConversation(authenticatedFetch, createForm.ticketId, {
          participantUserIds: dedupeNumbers(createForm.participantIds),
          initialMessage: createForm.initialMessage.trim() || null,
          urgent: createForm.urgent,
        });
      }

      setCreateOpen(false);
      setTicketThreadContext(null);
      setTicketThreadNotice(null);
      setCreateForm(emptyCreationForm);
      await refreshOverview(false);
      await openConversation(createdConversation.id, { updateSearch: true });
      toast.success("Conversation ouverte.");
    } catch (caught) {
      setCreateError(
        caught instanceof Error
          ? caught.message
          : "Impossible de creer la conversation.",
      );
    } finally {
      setCreatingConversation(false);
    }
  }

  return (
    <AppShell lockScroll compactTopbar>
      <div className="mx-auto flex h-full w-full max-w-[1680px] min-h-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessagesSquare className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">Messagerie</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Conversations internes, discussions ticket et suivi des messages urgents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
              {totalUnreadCount} non lu{totalUnreadCount > 1 ? "s" : ""}
            </Badge>
            <Button variant="outline" onClick={() => void handleRefreshAll()} disabled={refreshingOverview}>
              <RefreshCw className={refreshingOverview ? "animate-spin" : ""} />
              Actualiser
            </Button>
            <Button onClick={() => openCreateDialog("DIRECT")}>
              <Plus />
              Nouvelle conversation
            </Button>
          </div>
        </div>

        {ticketThreadNotice ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4" />
              <span>{ticketThreadNotice}</span>
            </div>
            {ticketThreadContext ? (
              <Button size="sm" variant="outline" onClick={() => openCreateDialog("TICKET", ticketThreadContext)}>
                <MessageSquareMore />
                Creer la discussion ticket
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-card shadow-card">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={28} minSize={22}>
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-border px-4 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Conversations</div>
                      <div className="text-xs text-muted-foreground">
                        {conversations.length} conversation{conversations.length > 1 ? "s" : ""}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openCreateDialog("GROUP")}>
                      <Users />
                      Groupe
                    </Button>
                  </div>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={conversationFilter}
                      onChange={(event) => setConversationFilter(event.target.value)}
                      placeholder="Rechercher une conversation"
                      className="pl-9"
                    />
                  </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-1 p-2">
                    {loadingConversations ? (
                      <PanelNotice label="Chargement des conversations..." icon={LoaderCircle} spinning />
                    ) : conversationsError ? (
                      <PanelError message={conversationsError} />
                    ) : filteredConversations.length === 0 ? (
                      <PanelNotice
                        label="Aucune conversation disponible pour le moment."
                        description="Demarrez un echange direct, un groupe ou une discussion ticket."
                        icon={MessagesSquare}
                      />
                    ) : (
                      filteredConversations.map((conversation) => {
                        const active = conversation.id === selectedConversationId;
                        const title = buildConversationTitle(conversation, currentUserId, usersById);
                        const summary = buildParticipantSummary(conversation, currentUserId, usersById);
                        return (
                          <button
                            key={conversation.id}
                            type="button"
                            onClick={() => void openConversation(conversation.id)}
                            className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                              active
                                ? "border-primary/40 bg-primary/5 shadow-sm"
                                : "border-transparent hover:border-border hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">{title}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{getConversationTypeLabel(conversation.type)}</span>
                                  {conversation.ticketId ? <span>Ticket #{conversation.ticketId}</span> : null}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {conversation.lastMessageUrgent ? (
                                  <TriangleAlert className="h-4 w-4 text-[color:var(--cgi-red)]" />
                                ) : null}
                                {conversation.unreadCount > 0 ? (
                                  <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">
                                    {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-2 truncate text-xs text-muted-foreground">{summary}</div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <div className="min-w-0 truncate text-sm text-foreground/85">
                                {conversation.lastMessagePreview || "Aucun message pour le moment."}
                              </div>
                              <div className="shrink-0 text-[11px] text-muted-foreground">
                                {formatConversationActivityDate(conversation.lastMessageAt ?? conversation.updatedAt)}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={52} minSize={38}>
              <div className="flex h-full min-h-0 flex-col">
                {selectedConversation ? (
                  <>
                    <div className="border-b border-border px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold text-foreground">
                            {selectedConversationTitle}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{selectedConversationTypeLabel}</Badge>
                            {selectedConversation.ticketId ? (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                                Ticket #{selectedConversation.ticketId}
                              </Badge>
                            ) : null}
                            {selectedConversation.lastMessageUrgent ? (
                              <Badge variant="outline" className="border-red-200 bg-red-50 text-[color:var(--cgi-red)]">
                                Dernier message urgent
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">{selectedParticipantSummary}</div>
                        </div>

                        {selectedConversation.ticketId ? (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              to="/tickets/$id"
                              params={{ id: String(selectedConversation.ticketId) }}
                            >
                              <Ticket />
                              Ouvrir le ticket
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-hidden">
                      <ScrollArea className="h-full" viewportRef={messagesViewportRef}>
                        <div className="flex min-h-full flex-col justify-end px-4 py-4 sm:px-5">
                          {loadingOlderMessages ? (
                            <div className="mb-4 flex justify-center">
                              <Badge variant="outline">Chargement de l'historique...</Badge>
                            </div>
                          ) : null}

                          {olderPagesAvailable ? (
                            <div className="mb-4 flex justify-center">
                              <Button size="sm" variant="outline" onClick={() => void loadOlderMessages()}>
                                <ArrowUp />
                                Charger les messages plus anciens
                              </Button>
                            </div>
                          ) : null}

                          {messagesLoading ? (
                            <PanelNotice label="Chargement des messages..." icon={LoaderCircle} spinning />
                          ) : messagesError ? (
                            <PanelError message={messagesError} />
                          ) : messages.length === 0 ? (
                            <PanelNotice
                              label="Aucun message dans cette conversation."
                              description="Envoyez le premier message pour demarrer l'echange."
                              icon={MessageCircleMore}
                            />
                          ) : (
                            <div className="space-y-2 pb-2">
                              {messages.map((message, index) => {
                                const senderLabel = getUserDisplayLabel(
                                  message.senderUserId,
                                  usersById,
                                  currentUserId,
                                );
                                const previousMessage = index > 0 ? messages[index - 1] : null;
                                const senderChanged =
                                  !previousMessage ||
                                  previousMessage.senderUserId !== message.senderUserId ||
                                  previousMessage.ownMessage !== message.ownMessage;
                                return (
                                  <div
                                    key={message.id}
                                    className={cn(
                                      "flex w-full",
                                      message.ownMessage ? "justify-end" : "justify-start",
                                      senderChanged && index > 0 ? "pt-1.5" : "",
                                    )}
                                  >
                                    <div
                                      data-testid={`message-bubble-${message.id}`}
                                      className={cn(
                                        "inline-flex w-auto max-w-[88%] flex-col rounded-2xl px-3 py-2 text-left sm:max-w-[75%] sm:px-3.5 xl:max-w-[55%]",
                                        message.ownMessage
                                          ? "ml-auto rounded-br-md border border-primary/15 bg-primary text-primary-foreground"
                                          : "mr-auto rounded-bl-md border border-border/60 bg-muted/40 text-foreground",
                                        message.urgent
                                          ? message.ownMessage
                                            ? "border-r-[3px] border-r-red-200"
                                            : "border-l-[3px] border-l-red-300"
                                          : "",
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={cn(
                                            "text-[11px] font-medium leading-none",
                                            message.ownMessage
                                              ? "text-primary-foreground/85"
                                              : "text-foreground/80",
                                          )}
                                        >
                                          {senderLabel}
                                        </span>
                                        {message.urgent ? (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "h-5 px-2 text-[10px] font-medium",
                                              message.ownMessage
                                                ? "border-white/30 bg-white/10 text-white"
                                                : "border-red-200 bg-red-50 text-[color:var(--cgi-red)]",
                                            )}
                                          >
                                            Urgent
                                          </Badge>
                                        ) : null}
                                      </div>
                                      <div className="mt-1 whitespace-pre-wrap text-sm leading-5 [overflow-wrap:anywhere]">
                                        {message.deletedAt ? "Message supprime." : message.content}
                                      </div>
                                      <div
                                        className={cn(
                                          "mt-1.5 flex items-center gap-2 text-[10px] leading-none",
                                          message.ownMessage
                                            ? "text-primary-foreground/75"
                                            : "text-muted-foreground",
                                        )}
                                      >
                                        <span>{formatMessageDateTime(message.createdAt)}</span>
                                        {message.editedAt ? <span>Modifie</span> : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    <Separator />

                    <div className="px-5 py-4">
                      <div className="space-y-3">
                        {composerError ? (
                          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {composerError}
                          </div>
                        ) : null}
                        <Textarea
                          value={composerValue}
                          onChange={(event) => setComposerValue(event.target.value)}
                          onKeyDown={handleComposerKeyDown}
                          placeholder="Ecrire un message... Entrer pour envoyer, Maj + Entrer pour une nouvelle ligne."
                          rows={4}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="message-urgent"
                              checked={composerUrgent}
                              onCheckedChange={setComposerUrgent}
                            />
                            <Label htmlFor="message-urgent" className="text-sm">
                              Marquer comme urgent
                            </Label>
                          </div>
                          <Button onClick={() => void handleSendMessage()} disabled={!canSendMessage}>
                            {sendingMessage ? <LoaderCircle className="animate-spin" /> : <Send />}
                            Envoyer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center px-6">
                    <PanelNotice
                      label="Selectionnez une conversation"
                      description="Choisissez un echange dans la liste ou creez une nouvelle conversation."
                      icon={MessagesSquare}
                    />
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={20} minSize={18}>
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-border px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Participants</div>
                      <div className="text-xs text-muted-foreground">
                        Les discussions ticket verifient maintenant l'acces reel au ticket cote ticket-service.
                      </div>
                    </div>
                    {selectedConversation?.type === "GROUP" && canManageSelectedParticipants ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setParticipantMutationError(null);
                          setParticipantSearch("");
                          setParticipantDialogOpen(true);
                        }}
                      >
                        <Plus />
                        Ajouter
                      </Button>
                    ) : null}
                  </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-3 px-4 py-4">
                    {loadingDirectory ? (
                      <PanelNotice label="Chargement de l'annuaire..." icon={LoaderCircle} spinning />
                    ) : directoryError ? (
                      <PanelError message={directoryError} />
                    ) : selectedConversation ? (
                      <>
                        {selectedConversation.ticketId ? (
                          <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <Ticket className="h-4 w-4 text-primary" />
                              Ticket lie
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {search.ticketReference && search.ticketId === selectedConversation.ticketId
                                ? search.ticketReference
                                : `Ticket #${selectedConversation.ticketId}`}
                            </div>
                            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                              <Link
                                to="/tickets/$id"
                                params={{ id: String(selectedConversation.ticketId) }}
                              >
                                Ouvrir le detail
                              </Link>
                            </Button>
                          </div>
                        ) : null}

                        {selectedConversation.participants.map((participant) => {
                          const directoryUser = usersById.get(participant.userId);
                          return (
                            <div
                              key={participant.userId}
                              className="rounded-lg border border-border bg-background px-3 py-3"
                            >
                              <div className="flex items-start gap-3">
                                <div className="rounded-full border border-border bg-muted p-2 text-muted-foreground">
                                  <UserRound className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-foreground">
                                    {getUserDisplayLabel(participant.userId, usersById, currentUserId)}
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {directoryUser?.email || `Utilisateur #${participant.userId}`}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Badge variant="outline">
                                      {directoryUser?.role ?? "Participant"}
                                    </Badge>
                                    {participant.lastReadAt ? (
                                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                        Lu
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 text-[11px] text-muted-foreground">
                                    Ajoute le {formatMessageDateTime(participant.joinedAt)}
                                  </div>
                                  {selectedConversation.type === "GROUP" && canManageSelectedParticipants ? (
                                    <div className="mt-3">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={
                                          participantMutationPending ||
                                          (participant.userId === currentUserId &&
                                            selectedConversation.createdByUserId === currentUserId)
                                        }
                                        onClick={() => void handleRemoveParticipant(participant.userId)}
                                      >
                                        Retirer
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <PanelNotice
                        label="Aucun participant affiche"
                        description="Ouvrez une conversation pour voir les membres et le contexte ticket."
                        icon={Users}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <Dialog
        open={participantDialogOpen}
        onOpenChange={(open) => {
          setParticipantDialogOpen(open);
          if (!open) {
            setParticipantMutationError(null);
            setParticipantSearch("");
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ajouter un participant</DialogTitle>
            <DialogDescription>
              Selectionnez un utilisateur actif a ajouter a ce groupe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
                placeholder="Rechercher un participant"
                className="pl-9"
              />
            </div>

            <div className="rounded-md border border-border">
              <ScrollArea className="h-[280px]">
                <div className="space-y-1 p-2">
                  {availableParticipantsToAdd.length === 0 ? (
                    <PanelNotice
                      label="Aucun participant disponible"
                      description="Tous les utilisateurs actifs eligibles sont deja presents."
                      icon={Users}
                    />
                  ) : (
                    availableParticipantsToAdd.map((directoryUser) => (
                      <button
                        key={directoryUser.id}
                        type="button"
                        className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition hover:bg-muted/40"
                        onClick={() => void handleAddParticipant(directoryUser.id)}
                        disabled={participantMutationPending}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {directoryUser.fullName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {directoryUser.email}
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-auto shrink-0">
                          {directoryUser.role}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {participantMutationError ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {participantMutationError}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateError(null);
            setCreateSearch("");
            setCreateForm(emptyCreationForm);
          }
        }}
      >
        <DialogContent className="grid w-[calc(100vw-1.5rem)] max-w-[880px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-border p-0 sm:max-h-[calc(100vh-2rem)] sm:rounded-xl">
          <DialogHeader className="space-y-2 border-b border-border/60 px-5 py-5 sm:px-6">
            <DialogTitle className="pr-8">{getCreateDialogTitle(createForm.mode)}</DialogTitle>
            <DialogDescription className="max-w-2xl pr-8">
              {getCreateDialogDescription(createForm.mode)}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type de conversation
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["DIRECT", "GROUP", "TICKET"] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={createForm.mode === mode ? "default" : "outline"}
                      className="min-w-0 px-2 text-center leading-tight whitespace-normal"
                      onClick={() =>
                        setCreateForm((current) => ({
                          ...current,
                          mode,
                          title: mode === "GROUP" ? current.title : "",
                          ticketId: mode === "TICKET" ? current.ticketId ?? ticketThreadContext?.ticketId ?? null : null,
                          participantIds: mode === "DIRECT" ? current.participantIds.slice(0, 1) : current.participantIds,
                        }))
                      }
                    >
                      <span className="truncate">{getConversationTypeLabel(mode)}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
                <div className="space-y-4">
                  <div className="space-y-4 rounded-xl bg-muted/20 p-4">
                    {createForm.mode === "GROUP" ? (
                      <Field label="Titre du groupe">
                        <Input
                          value={createForm.title}
                          onChange={(event) =>
                            setCreateForm((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder="Ex. Equipe support"
                          className="h-10"
                        />
                      </Field>
                    ) : null}

                    {createForm.mode === "TICKET" ? (
                      <Field label="Ticket lie">
                        <Input
                          value={String(createForm.ticketId ?? ticketThreadContext?.ticketId ?? "")}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              ticketId: event.target.value ? Number(event.target.value) : null,
                            }))
                          }
                          placeholder="Identifiant du ticket"
                          className="h-10"
                        />
                        <div className="text-xs text-muted-foreground">
                          {ticketThreadContext?.ticketReference
                            ? `Reference ouverte depuis le ticket ${ticketThreadContext.ticketReference}.`
                            : "Une seule discussion est autorisee par ticket dans cette version."}
                        </div>
                      </Field>
                    ) : null}

                    <Field label="Message initial (optionnel)">
                      <Textarea
                        rows={4}
                        value={createForm.initialMessage}
                        onChange={(event) =>
                          setCreateForm((current) => ({ ...current, initialMessage: event.target.value }))
                        }
                        placeholder="Ajoutez un contexte initial si necessaire."
                        className="min-h-[104px] resize-none"
                      />
                    </Field>

                    <div className="flex items-center gap-3 rounded-lg bg-background px-3 py-2.5">
                      <Checkbox
                        id="create-conversation-urgent"
                        checked={createForm.urgent}
                        onCheckedChange={(checked) =>
                          setCreateForm((current) => ({ ...current, urgent: checked === true }))
                        }
                      />
                      <Label htmlFor="create-conversation-urgent" className="text-sm leading-none">
                        Marquer le message initial comme urgent
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 space-y-3 rounded-xl bg-muted/20 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Participants</Label>
                      <span className="text-xs text-muted-foreground">
                        {createForm.participantIds.length} selectionne{createForm.participantIds.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={createSearch}
                        onChange={(event) => setCreateSearch(event.target.value)}
                        placeholder="Rechercher un participant"
                        className="h-10 pl-9"
                      />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg bg-background">
                    <ScrollArea className="h-[260px] sm:h-[300px] lg:h-[332px]">
                      <div className="space-y-1 p-2">
                        {loadingDirectory ? (
                          <PanelNotice label="Chargement des participants..." icon={LoaderCircle} spinning />
                        ) : directoryError ? (
                          <PanelError message="Impossible de charger les participants." />
                        ) : selectableUsers.length === 0 ? (
                          <PanelNotice
                            label="Aucun participant disponible."
                            description="Ajustez votre recherche ou verifiez l'annuaire local."
                            icon={Users}
                          />
                        ) : (
                          selectableUsers.map((directoryUser) => {
                            const selected = createForm.participantIds.includes(directoryUser.id);
                            return (
                              <label
                                key={directoryUser.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition ${
                                  selected ? "bg-primary/5" : "hover:bg-muted/40"
                                }`}
                              >
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={(checked) =>
                                    toggleParticipantSelection(directoryUser.id, checked === true)
                                  }
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-foreground">
                                    {directoryUser.fullName}
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {directoryUser.email}
                                  </div>
                                </div>
                                <Badge variant="outline" className="ml-auto shrink-0 self-center">
                                  {directoryUser.role}
                                </Badge>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {createForm.mode === "DIRECT"
                      ? "Selectionnez exactement un autre utilisateur."
                      : createForm.mode === "GROUP"
                        ? "Selectionnez un ou plusieurs participants."
                        : "Selectionnez les participants a inclure dans la discussion ticket."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {createError ? (
            <div className="mx-5 mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:mx-6">
              <AlertCircle className="h-4 w-4" />
              {createError}
            </div>
          ) : null}

          <DialogFooter className="border-t border-border/60 px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateConversation()}
              disabled={creatingConversation || !isCreateConversationReady(createForm)}
            >
              {creatingConversation ? <LoaderCircle className="animate-spin" /> : <Check />}
              Ouvrir la conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PanelNotice({
  label,
  description,
  icon: Icon,
  spinning = false,
}: {
  label: string;
  description?: string;
  icon: typeof LoaderCircle;
  spinning?: boolean;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-border bg-background/70 px-4 py-6 text-center">
      <Icon className={`h-5 w-5 text-muted-foreground ${spinning ? "animate-spin" : ""}`} />
      <div className="mt-3 text-sm font-medium text-foreground">{label}</div>
      {description ? <div className="mt-1 text-xs text-muted-foreground">{description}</div> : null}
    </div>
  );
}

function PanelError({ message }: { message: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 px-4 py-4 text-center text-sm text-destructive">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {message}
      </div>
    </div>
  );
}

function mergeMessages(existing: Message[], incoming: Message[]) {
  const merged = new Map<number, Message>();
  for (const message of existing) {
    merged.set(message.id, message);
  }
  for (const message of incoming) {
    merged.set(message.id, message);
  }
  return [...merged.values()].sort((left, right) => {
    const timeDelta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    if (timeDelta !== 0) {
      return timeDelta;
    }
    return left.id - right.id;
  });
}

function sortConversationsByActivity(conversations: Conversation[]) {
  return [...conversations].sort(
    (left, right) =>
      new Date(right.lastMessageAt ?? right.updatedAt).getTime() -
      new Date(left.lastMessageAt ?? left.updatedAt).getTime(),
  );
}

function dedupeNumbers(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value))));
}

function isCreateConversationReady(form: CreationFormState) {
  switch (form.mode) {
    case "DIRECT":
      return form.participantIds.length === 1;
    case "GROUP":
      return form.title.trim().length > 0 && form.participantIds.length >= 1;
    case "TICKET":
      return Boolean(form.ticketId);
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function readMessagesError(caught: unknown, fallback: string) {
  if (caught instanceof MessagesApiError) {
    switch (caught.status) {
      case 400:
        return caught.message || "La requete de messagerie est invalide.";
      case 401:
        return "Votre session a expire. Reconnectez-vous.";
      case 403:
        return "Acces refuse a cette conversation.";
      case 404:
        return "Conversation introuvable.";
      case 409:
        return caught.message || "Une discussion existe deja pour ce ticket.";
      case 502:
      case 503:
        return "Le service de messagerie est indisponible pour le moment.";
      default:
        return caught.message || fallback;
    }
  }
  return caught instanceof Error ? caught.message : fallback;
}

function getCreateDialogTitle(mode: CreationMode) {
  switch (mode) {
    case "DIRECT":
      return "Nouvelle conversation directe";
    case "GROUP":
      return "Nouveau groupe";
    case "TICKET":
      return "Nouvelle discussion ticket";
  }
}

function getCreateDialogDescription(mode: CreationMode) {
  switch (mode) {
    case "DIRECT":
      return "Selectionnez un seul interlocuteur. Si une conversation existe deja, elle sera reutilisee.";
    case "GROUP":
      return "Definissez le titre du groupe et choisissez ses participants.";
    case "TICKET":
      return "Une seule discussion est autorisee par ticket dans cette version.";
  }
}
