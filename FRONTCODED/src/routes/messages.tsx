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
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ProfileAvatar } from "@/components/app/ProfileAvatar";
import {
  buildConversationTitle,
  buildParticipantSummary,
  formatConversationActivityDate,
  formatMessageTime,
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
import { getBusinessRoleLabel, useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  type AdminMessagesConversation,
  getAdminMessagesMockData,
  isAdminMessagesMockEnabled,
  MOCK_CURRENT_USER_ID,
} from "@/mocks/adminMessagesMock";

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
  const demoMode = isAdminMessagesMockEnabled();
  const mockData = useMemo(() => (demoMode ? getAdminMessagesMockData() : null), [demoMode]);
  const currentUserId = demoMode ? mockData!.currentUserId : (user?.localProfile?.id ?? null);
  const [conversationFilter, setConversationFilter] = useState("");
  const [conversations, setConversations] = useState<AdminMessagesConversation[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<MessagingDirectoryUser[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<AdminMessagesConversation | null>(null);
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
    if (demoMode) {
      return true;
    }
    return (
      selectedConversation.createdByUserId === currentUserId ||
      hasRole("ADMIN") ||
      hasRole("MANAGER")
    );
  }, [currentUserId, demoMode, hasRole, selectedConversation]);

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

  const canSendMessage =
    composerValue.trim().length > 0 && !sendingMessage && Boolean(selectedConversationId);

  const loadDirectory = useCallback(async () => {
    if (demoMode) {
      setDirectoryUsers(mockData!.directoryUsers);
      setLoadingDirectory(false);
      return;
    }
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
      setDirectoryError(
        readMessagesError(caught, "Impossible de charger l'annuaire des participants."),
      );
    } finally {
      setLoadingDirectory(false);
    }
  }, [authenticatedFetch, demoMode, isAuthenticated, isReady, mockData]);

  const loadUnreadTotal = useCallback(async () => {
    if (demoMode) {
      setTotalUnreadCount(
        mockData!.conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
      );
      return;
    }
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
  }, [authenticatedFetch, demoMode, isAuthenticated, isReady, mockData]);

  const loadConversations = useCallback(async () => {
    if (demoMode) {
      setConversations(mockData!.conversations);
      setLoadingConversations(false);
      return;
    }
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
  }, [authenticatedFetch, demoMode, isAuthenticated, isReady, mockData]);

  const refreshOverview = useCallback(
    async (showSpinner = false) => {
      if (demoMode) {
        return;
      }
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
    [authenticatedFetch, demoMode, isAuthenticated, isReady],
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
          participants:
            current.participants.length > 0 ? current.participants : matched.participants,
        };
      });
    },
    [conversations],
  );

  const loadConversationContext = useCallback(
    async (conversationId: number, scrollToBottomAfterLoad = true) => {
      if (demoMode) {
        const detail = mockData!.conversations.find(
          (conversation) => conversation.id === conversationId,
        );
        setSelectedConversation(detail ?? null);
        setMessages(mockData!.messagesByConversationId[conversationId] ?? []);
        setOlderPageIndex(null);
        setOlderPagesAvailable(false);
        if (scrollToBottomAfterLoad) {
          scrollMessagesToBottom();
        }
        return;
      }
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
        setMessagesError(
          readMessagesError(caught, "Impossible de charger l'historique de la conversation."),
        );
      } finally {
        setMessagesLoading(false);
      }
    },
    [authenticatedFetch, demoMode, fetchLatestMessagePage, mockData, scrollMessagesToBottom],
  );

  const openConversation = useCallback(
    async (
      conversationId: number,
      options?: { updateSearch?: boolean; scrollToBottomAfterLoad?: boolean },
    ) => {
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
      if (demoMode) {
        return;
      }
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
    [demoMode, fetchLatestMessagePage, scrollMessagesToBottom],
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
        setTicketThreadNotice(
          readMessagesError(caught, "Impossible d'ouvrir la discussion ticket."),
        );
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
    if (
      !selectedConversation ||
      selectedConversation.unreadCount <= 0 ||
      markReadInFlightRef.current
    ) {
      return;
    }

    const unreadToClear = selectedConversation.unreadCount;

    if (demoMode) {
      setSelectedConversation((current) => (current ? { ...current, unreadCount: 0 } : current));
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
      setTotalUnreadCount((current) => Math.max(0, current - unreadToClear));
      return;
    }

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
            conversation.id === selectedConversation.id
              ? { ...conversation, unreadCount: 0 }
              : conversation,
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
  }, [authenticatedFetch, demoMode, selectedConversation]);

  useEffect(() => {
    if (demoMode) {
      return;
    }
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
  }, [demoMode, refreshOverview]);

  useEffect(() => {
    if (demoMode || !selectedConversationId) {
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
  }, [demoMode, refreshOverview, refreshSelectedConversationMessages, selectedConversationId]);

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

    if (demoMode) {
      const sentMessage: Message = {
        id: Date.now(),
        conversationId: selectedConversationId,
        senderUserId: currentUserId ?? MOCK_CURRENT_USER_ID,
        content: composerValue.trim(),
        urgent: composerUrgent,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        ownMessage: true,
      };
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
      setSendingMessage(false);
      return;
    }

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

    if (demoMode) {
      const newParticipant = {
        userId,
        joinedAt: new Date().toISOString(),
        active: true,
        lastReadAt: null,
      };
      setSelectedConversation((current) =>
        current ? { ...current, participants: [...current.participants, newParticipant] } : current,
      );
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversationId
            ? { ...conversation, participants: [...conversation.participants, newParticipant] }
            : conversation,
        ),
      );
      setParticipantDialogOpen(false);
      setParticipantSearch("");
      setParticipantMutationPending(false);
      return;
    }

    try {
      await addConversationParticipant(authenticatedFetch, selectedConversationId, userId);
      await Promise.all([
        loadConversationContext(selectedConversationId, false),
        refreshOverview(false),
      ]);
      setParticipantDialogOpen(false);
      setParticipantSearch("");
    } catch (caught) {
      setParticipantMutationError(
        readMessagesError(caught, "Impossible d'ajouter le participant."),
      );
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

    if (demoMode) {
      setSelectedConversation((current) =>
        current
          ? {
              ...current,
              participants: current.participants.filter((item) => item.userId !== userId),
            }
          : current,
      );
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversationId
            ? {
                ...conversation,
                participants: conversation.participants.filter((item) => item.userId !== userId),
              }
            : conversation,
        ),
      );
      setParticipantMutationPending(false);
      return;
    }

    try {
      await removeConversationParticipant(authenticatedFetch, selectedConversationId, userId);
      await Promise.all([
        loadConversationContext(selectedConversationId, false),
        refreshOverview(false),
      ]);
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
      if (createForm.mode === "DIRECT" && createForm.participantIds.length !== 1) {
        throw new Error("Sélectionnez exactement un participant pour une conversation directe.");
      }
      if (createForm.mode === "GROUP" && !createForm.title.trim()) {
        throw new Error("Le titre du groupe est obligatoire.");
      }
      if (createForm.mode === "GROUP" && createForm.participantIds.length < 1) {
        throw new Error("Sélectionnez au moins un participant pour le groupe.");
      }
      if (createForm.mode === "TICKET" && !createForm.ticketId) {
        throw new Error("L'identifiant du ticket est obligatoire.");
      }

      if (demoMode) {
        const now = new Date().toISOString();
        const participantIds =
          createForm.mode === "DIRECT"
            ? createForm.participantIds
            : dedupeNumbers(createForm.participantIds);
        const newConversation: Conversation = {
          id: Date.now(),
          type: createForm.mode,
          title: createForm.mode === "GROUP" ? createForm.title.trim() : null,
          ticketId: createForm.mode === "TICKET" ? createForm.ticketId : null,
          createdByUserId: currentUserId ?? MOCK_CURRENT_USER_ID,
          createdAt: now,
          updatedAt: now,
          lastMessagePreview: createForm.initialMessage.trim() || null,
          lastMessageAt: createForm.initialMessage.trim() ? now : null,
          lastMessageUrgent: createForm.initialMessage.trim() ? createForm.urgent : null,
          unreadCount: 0,
          participants: [
            {
              userId: currentUserId ?? MOCK_CURRENT_USER_ID,
              joinedAt: now,
              active: true,
              lastReadAt: now,
            },
            ...participantIds.map((userId) => ({
              userId,
              joinedAt: now,
              active: true,
              lastReadAt: null,
            })),
          ],
        };
        setConversations((current) => sortConversationsByActivity([...current, newConversation]));
        setCreateOpen(false);
        setTicketThreadContext(null);
        setTicketThreadNotice(null);
        setCreateForm(emptyCreationForm);
        await openConversation(newConversation.id, { updateSearch: true });
        toast.success("Conversation ouverte.");
        return;
      }

      let createdConversation: Conversation;
      if (createForm.mode === "DIRECT") {
        createdConversation = await createDirectConversation(
          authenticatedFetch,
          createForm.participantIds[0],
          {
            initialMessage: createForm.initialMessage.trim() || null,
            urgent: createForm.urgent,
          },
        );
      } else if (createForm.mode === "GROUP") {
        createdConversation = await createGroupConversation(authenticatedFetch, {
          title: createForm.title.trim(),
          participantUserIds: dedupeNumbers(createForm.participantIds),
          initialMessage: createForm.initialMessage.trim() || null,
          urgent: createForm.urgent,
        });
      } else {
        createdConversation = await createTicketConversation(
          authenticatedFetch,
          createForm.ticketId!,
          {
            participantUserIds: dedupeNumbers(createForm.participantIds),
            initialMessage: createForm.initialMessage.trim() || null,
            urgent: createForm.urgent,
          },
        );
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
        caught instanceof Error ? caught.message : "Impossible de créer la conversation.",
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
              Conversations internes, discussions liées aux tickets et suivi des messages urgents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {totalUnreadCount > 0 ? (
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                {totalUnreadCount} message{totalUnreadCount > 1 ? "s" : ""} non lu
                {totalUnreadCount > 1 ? "s" : ""}
              </Badge>
            ) : null}
            <Button
              variant="outline"
              onClick={() => void handleRefreshAll()}
              disabled={refreshingOverview}
            >
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCreateDialog("TICKET", ticketThreadContext)}
              >
                <MessageSquareMore />
                Créer la discussion liée au ticket
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
                      Conversation de groupe
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
                      <PanelNotice
                        label="Chargement des conversations..."
                        icon={LoaderCircle}
                        spinning
                      />
                    ) : conversationsError ? (
                      <PanelError message={conversationsError} />
                    ) : filteredConversations.length === 0 ? (
                      <PanelNotice
                        label="Aucune conversation disponible pour le moment."
                        description="Démarrez un échange direct, une conversation de groupe ou une discussion liée à un ticket."
                        icon={MessagesSquare}
                      />
                    ) : (
                      filteredConversations.map((conversation) => {
                        const active = conversation.id === selectedConversationId;
                        const title = buildConversationTitle(
                          conversation,
                          currentUserId,
                          usersById,
                        );
                        const summary = buildParticipantSummary(
                          conversation,
                          currentUserId,
                          usersById,
                        );
                        return (
                          <button
                            key={conversation.id}
                            type="button"
                            onClick={() => void openConversation(conversation.id)}
                            className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                              active
                                ? "border-primary/50 bg-primary/[0.06] shadow-sm ring-1 ring-primary/20"
                                : "border-transparent hover:border-border hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <ConversationAvatar
                                conversation={conversation}
                                currentUserId={currentUserId}
                                usersById={usersById}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-foreground">
                                      {title}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                      <ConversationTypeBadge type={conversation.type} />
                                      {conversation.ticketId ? (
                                        <Badge
                                          variant="outline"
                                          className="border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-800"
                                        >
                                          Ticket {conversation.ticketId}
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                                    <span className="text-[11px] text-muted-foreground">
                                      {formatConversationActivityDate(
                                        conversation.lastMessageAt ?? conversation.updatedAt,
                                      )}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {conversation.lastMessageUrgent ? (
                                        <Badge
                                          variant="outline"
                                          className="gap-1 border-red-200 bg-red-50 px-1.5 py-0 text-[10px] font-semibold text-[color:var(--cgi-red)]"
                                        >
                                          <TriangleAlert className="h-3 w-3" />
                                          Urgent
                                        </Badge>
                                      ) : null}
                                      {conversation.unreadCount > 0 ? (
                                        <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">
                                          {conversation.unreadCount > 9
                                            ? "9+"
                                            : conversation.unreadCount}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-1.5 truncate text-xs text-muted-foreground">
                                  {summary}
                                </div>
                                <div className="mt-1.5 truncate text-sm text-foreground/80">
                                  {conversation.lastMessagePreview ||
                                    "Aucun message pour le moment."}
                                </div>
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
                        <div className="flex min-w-0 items-center gap-3">
                          <ConversationAvatar
                            conversation={selectedConversation}
                            currentUserId={currentUserId}
                            usersById={usersById}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-lg font-semibold text-foreground">
                              {selectedConversationTitle}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                              <ConversationTypeBadge type={selectedConversation.type} />
                              {selectedConversation.ticketId ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-800"
                                >
                                  Ticket {selectedConversation.ticketId}
                                </Badge>
                              ) : null}
                              {selectedConversation.bannette ? (
                                <Badge
                                  variant="outline"
                                  className="border-border bg-muted/50 text-[11px] font-medium text-foreground/80"
                                >
                                  Bannette : {selectedConversation.bannette}
                                </Badge>
                              ) : null}
                              {selectedConversation.lastMessageUrgent ? (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-red-200 bg-red-50 text-[11px] font-semibold text-[color:var(--cgi-red)]"
                                >
                                  <TriangleAlert className="h-3 w-3" />
                                  Urgent
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {selectedParticipantSummary}
                            </div>
                          </div>
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void loadOlderMessages()}
                              >
                                <ArrowUp />
                                Charger les messages plus anciens
                              </Button>
                            </div>
                          ) : null}

                          {messagesLoading ? (
                            <PanelNotice
                              label="Chargement des messages..."
                              icon={LoaderCircle}
                              spinning
                            />
                          ) : messagesError ? (
                            <PanelError message={messagesError} />
                          ) : messages.length === 0 ? (
                            <PanelNotice
                              label="Aucun message dans cette conversation."
                              description="Envoyez le premier message pour démarrer l'échange."
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
                                const senderRole = message.ownMessage
                                  ? null
                                  : usersById.get(message.senderUserId)?.role;
                                const senderRoleLabel = senderRole
                                  ? getBusinessRoleLabel(senderRole)
                                  : null;
                                const previousMessage = index > 0 ? messages[index - 1] : null;
                                const senderChanged =
                                  !previousMessage ||
                                  previousMessage.senderUserId !== message.senderUserId ||
                                  previousMessage.ownMessage !== message.ownMessage;
                                const senderDirectoryUser = usersById.get(message.senderUserId);
                                return (
                                  <div
                                    key={message.id}
                                    className={cn(
                                      "flex w-full items-end gap-2",
                                      message.ownMessage ? "justify-end" : "justify-start",
                                      senderChanged && index > 0 ? "pt-1.5" : "",
                                    )}
                                  >
                                    {!message.ownMessage ? (
                                      <div className="h-6 w-6 shrink-0">
                                        {senderChanged ? (
                                          <ProfileAvatar
                                            fullName={senderDirectoryUser?.fullName ?? senderLabel}
                                            email={senderDirectoryUser?.email}
                                            size="xs"
                                          />
                                        ) : null}
                                      </div>
                                    ) : null}
                                    <div
                                      data-testid={`message-bubble-${message.id}`}
                                      className={cn(
                                        "inline-flex w-auto max-w-[88%] flex-col rounded-2xl px-3 py-2 text-left sm:max-w-[75%] sm:px-3.5 xl:max-w-[55%]",
                                        message.ownMessage
                                          ? "ml-auto rounded-br-md border border-primary/15 bg-primary text-primary-foreground"
                                          : "rounded-bl-md border border-border/60 bg-muted/40 text-foreground",
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
                                            "text-[11px] font-semibold leading-none",
                                            message.ownMessage
                                              ? "text-primary-foreground/85"
                                              : "text-foreground/80",
                                          )}
                                        >
                                          {senderLabel}
                                        </span>
                                        {senderRoleLabel ? (
                                          <span className="text-[10px] leading-none text-muted-foreground">
                                            · {senderRoleLabel}
                                          </span>
                                        ) : null}
                                        {message.urgent ? (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "h-5 gap-1 px-1.5 text-[10px] font-medium",
                                              message.ownMessage
                                                ? "border-white/30 bg-white/10 text-white"
                                                : "border-red-200 bg-red-50 text-[color:var(--cgi-red)]",
                                            )}
                                          >
                                            <TriangleAlert className="h-3 w-3" />
                                            Urgent
                                          </Badge>
                                        ) : null}
                                      </div>
                                      <div className="mt-1 whitespace-pre-wrap text-sm leading-5 [overflow-wrap:anywhere]">
                                        {message.deletedAt ? "Message supprimé." : message.content}
                                      </div>
                                      <div
                                        className={cn(
                                          "mt-1.5 flex items-center justify-end gap-2 text-[10px] leading-none tabular-nums",
                                          message.ownMessage
                                            ? "text-primary-foreground/75"
                                            : "text-muted-foreground",
                                        )}
                                      >
                                        {message.editedAt ? <span>Modifié</span> : null}
                                        <span>{formatMessageTime(message.createdAt)}</span>
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

                    <div className="px-5 py-3">
                      <div className="space-y-2">
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
                          placeholder="Écrivez un message... Entrée pour envoyer, Maj + Entrée pour un retour à la ligne."
                          rows={3}
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
                          <Button
                            onClick={() => void handleSendMessage()}
                            disabled={!canSendMessage}
                          >
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
                      label="Sélectionnez une conversation"
                      description="Choisissez un échange dans la liste ou créez une nouvelle conversation."
                      icon={MessagesSquare}
                    />
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={20} minSize={18}>
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Participants</div>
                      <div className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        Les discussions liées aux tickets respectent les droits d'accès et le
                        périmètre des participants.
                      </div>
                    </div>
                    {selectedConversation?.type === "GROUP" && canManageSelectedParticipants ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => {
                          setParticipantMutationError(null);
                          setParticipantSearch("");
                          setParticipantDialogOpen(true);
                        }}
                      >
                        <Plus />
                        Ajouter un participant
                      </Button>
                    ) : null}
                  </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-2 px-3 py-3">
                    {loadingDirectory ? (
                      <PanelNotice
                        label="Chargement de l'annuaire..."
                        icon={LoaderCircle}
                        spinning
                      />
                    ) : directoryError ? (
                      <PanelError message={directoryError} />
                    ) : selectedConversation ? (
                      <>
                        {selectedConversation.ticketId ? (
                          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <Ticket className="h-4 w-4 text-primary" />
                              Ticket lié
                            </div>
                            <div className="mt-1.5 text-sm text-muted-foreground">
                              Ticket {selectedConversation.ticketId}
                            </div>
                            {selectedConversation.bannette ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Bannette :{" "}
                                <span className="font-medium text-foreground/80">
                                  {selectedConversation.bannette}
                                </span>
                              </div>
                            ) : null}
                            <Button asChild size="sm" variant="outline" className="mt-2.5 w-full">
                              <Link
                                to="/tickets/$id"
                                params={{ id: String(selectedConversation.ticketId) }}
                              >
                                Ouvrir le détail
                              </Link>
                            </Button>
                          </div>
                        ) : null}

                        {selectedConversation.participants.map((participant) => {
                          const directoryUser = usersById.get(participant.userId);
                          const businessRoleLabel = directoryUser
                            ? getBusinessRoleLabel(directoryUser.role)
                            : "Participant";
                          const canRemove =
                            selectedConversation.type === "GROUP" &&
                            canManageSelectedParticipants &&
                            !(
                              participant.userId === currentUserId &&
                              selectedConversation.createdByUserId === currentUserId
                            );
                          return (
                            <div
                              key={participant.userId}
                              className="rounded-lg border border-border bg-background px-3 py-2.5"
                            >
                              <div className="flex items-start gap-2.5">
                                <ProfileAvatar
                                  fullName={directoryUser?.fullName}
                                  email={directoryUser?.email}
                                  size="sm"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="truncate text-sm font-semibold text-foreground">
                                      {getUserDisplayLabel(
                                        participant.userId,
                                        usersById,
                                        currentUserId,
                                      )}
                                    </div>
                                    {canRemove ? (
                                      <button
                                        type="button"
                                        disabled={participantMutationPending}
                                        onClick={() =>
                                          void handleRemoveParticipant(participant.userId)
                                        }
                                        className="shrink-0 text-[11px] text-muted-foreground underline-offset-2 transition hover:text-destructive hover:underline disabled:opacity-50"
                                      >
                                        Retirer
                                      </button>
                                    ) : null}
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {directoryUser?.email || `Utilisateur #${participant.userId}`}
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] font-medium">
                                      {businessRoleLabel}
                                    </Badge>
                                    {directoryUser ? (
                                      <Badge
                                        variant="outline"
                                        className="border-border bg-muted/50 text-[10px] font-medium text-muted-foreground"
                                      >
                                        {directoryUser.role}
                                      </Badge>
                                    ) : null}
                                    {participant.lastReadAt ? (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700"
                                      >
                                        Lu
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <PanelNotice
                        label="Aucun participant affiché"
                        description="Ouvrez une conversation pour voir les membres et le contexte du ticket."
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
              Sélectionnez un utilisateur actif à ajouter à ce groupe.
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
                      description="Tous les utilisateurs actifs éligibles sont déjà présents."
                      icon={Users}
                    />
                  ) : (
                    availableParticipantsToAdd.map((directoryUser) => (
                      <button
                        key={directoryUser.id}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-muted/40"
                        onClick={() => void handleAddParticipant(directoryUser.id)}
                        disabled={participantMutationPending}
                      >
                        <ProfileAvatar
                          fullName={directoryUser.fullName}
                          email={directoryUser.email}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
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
                          ticketId:
                            mode === "TICKET"
                              ? (current.ticketId ?? ticketThreadContext?.ticketId ?? null)
                              : null,
                          participantIds:
                            mode === "DIRECT"
                              ? current.participantIds.slice(0, 1)
                              : current.participantIds,
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
                          placeholder="Ex. Coordination de la bannette FO"
                          className="h-10"
                        />
                      </Field>
                    ) : null}

                    {createForm.mode === "TICKET" ? (
                      <Field label="Identifiant du ticket">
                        <Input
                          value={String(createForm.ticketId ?? ticketThreadContext?.ticketId ?? "")}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              ticketId: event.target.value ? Number(event.target.value) : null,
                            }))
                          }
                          placeholder="Ex. 124381627"
                          className="h-10"
                        />
                        <div className="text-xs text-muted-foreground">
                          {ticketThreadContext?.ticketId
                            ? `Ouverte depuis le ticket ${ticketThreadContext.ticketId}.`
                            : "Une seule discussion est autorisée par ticket dans cette version."}
                        </div>
                      </Field>
                    ) : null}

                    <Field label="Message initial (optionnel)">
                      <Textarea
                        rows={4}
                        value={createForm.initialMessage}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            initialMessage: event.target.value,
                          }))
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
                        {createForm.participantIds.length} selectionne
                        {createForm.participantIds.length > 1 ? "s" : ""}
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
                          <PanelNotice
                            label="Chargement des participants..."
                            icon={LoaderCircle}
                            spinning
                          />
                        ) : directoryError ? (
                          <PanelError message="Impossible de charger les participants." />
                        ) : selectableUsers.length === 0 ? (
                          <PanelNotice
                            label="Aucun participant disponible."
                            description="Ajustez votre recherche ou vérifiez l'annuaire local."
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
                                <ProfileAvatar
                                  fullName={directoryUser.fullName}
                                  email={directoryUser.email}
                                  size="sm"
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
                      ? "Sélectionnez exactement un autre utilisateur."
                      : createForm.mode === "GROUP"
                        ? "Sélectionnez un ou plusieurs participants."
                        : "Sélectionnez les participants à inclure dans la discussion liée au ticket."}
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

const conversationTypeBadgeStyles: Record<ConversationType, string> = {
  DIRECT: "border-sky-200 bg-sky-50 text-sky-700",
  GROUP: "border-violet-200 bg-violet-50 text-violet-700",
  TICKET: "border-amber-200 bg-amber-50 text-amber-800",
};

function ConversationTypeBadge({ type }: { type: ConversationType }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-medium", conversationTypeBadgeStyles[type])}
    >
      {getConversationTypeLabel(type)}
    </Badge>
  );
}

const conversationAvatarIconStyles: Record<ConversationType, string> = {
  DIRECT: "",
  GROUP: "bg-gradient-to-br from-violet-500 to-violet-700",
  TICKET: "bg-gradient-to-br from-amber-500 to-amber-700",
};

function ConversationAvatar({
  conversation,
  currentUserId,
  usersById,
  size = "sm",
}: {
  conversation: AdminMessagesConversation;
  currentUserId: number | null | undefined;
  usersById: Map<number, MessagingDirectoryUser>;
  size?: "sm" | "md";
}) {
  if (conversation.type === "DIRECT") {
    const otherParticipant = conversation.participants.find(
      (participant) => currentUserId == null || participant.userId !== currentUserId,
    );
    const directoryUser = otherParticipant ? usersById.get(otherParticipant.userId) : undefined;
    return (
      <ProfileAvatar fullName={directoryUser?.fullName} email={directoryUser?.email} size={size} />
    );
  }

  const dimension = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const Icon = conversation.type === "GROUP" ? Users : Ticket;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-white shadow-glow",
        dimension,
        conversationAvatarIconStyles[conversation.type],
      )}
    >
      <Icon className={size === "md" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />
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
        return caught.message || "La requête de messagerie est invalide.";
      case 401:
        return "Votre session a expiré. Reconnectez-vous.";
      case 403:
        return "Accès refusé à cette conversation.";
      case 404:
        return "Conversation introuvable.";
      case 409:
        return caught.message || "Une discussion existe déjà pour ce ticket.";
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
      return "Nouvelle conversation de groupe";
    case "TICKET":
      return "Nouvelle discussion liée à un ticket";
  }
}

function getCreateDialogDescription(mode: CreationMode) {
  switch (mode) {
    case "DIRECT":
      return "Sélectionnez un seul interlocuteur. Si une conversation existe déjà, elle sera réutilisée.";
    case "GROUP":
      return "Définissez le titre du groupe et choisissez ses participants.";
    case "TICKET":
      return "Une seule discussion est autorisée par ticket dans cette version.";
  }
}
