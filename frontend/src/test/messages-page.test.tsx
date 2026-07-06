import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
} from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockSearch: { conversationId?: number; ticketId?: number; ticketReference?: string } = {};
const navigateSpy = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    useSearch: () => mockSearch,
  }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useNavigate: () => navigateSpy,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/app/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    viewportRef,
  }: {
    children: ReactNode;
    viewportRef?: Ref<HTMLDivElement>;
  }) => <div ref={viewportRef}>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) =>
    asChild ? <div>{children}</div> : <button onClick={onClick} disabled={disabled} {...props}>{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
  }) => (
    <input
      aria-label={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

const mockAuthState = {
  authenticatedFetch: vi.fn(),
  hasRole: (role: "ADMIN" | "MANAGER" | "EMPLOYEE") => role === "EMPLOYEE",
  isAuthenticated: true,
  isReady: true,
  user: {
    roles: ["EMPLOYEE"],
    localProfile: {
      id: 1,
    },
  },
};

vi.mock("@/lib/auth-store", () => ({
  useAuth: () => mockAuthState,
}));

const apiMocks = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getConversationDetail: vi.fn(),
  createDirectConversation: vi.fn(),
  createGroupConversation: vi.fn(),
  createTicketConversation: vi.fn(),
  getTicketConversation: vi.fn(),
  getConversationMessages: vi.fn(),
  sendMessage: vi.fn(),
  markConversationRead: vi.fn(),
  getUnreadCount: vi.fn(),
  listMessagingDirectoryUsers: vi.fn(),
  addConversationParticipant: vi.fn(),
  removeConversationParticipant: vi.fn(),
}));

vi.mock("@/lib/api/messages", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/messages")>("@/lib/api/messages");
  return {
    ...actual,
    ...apiMocks,
  };
});

import { MessagesApiError } from "@/lib/api/messages";
import { MessagesPage } from "@/routes/messages";

const baseConversation = {
  id: 10,
  type: "DIRECT" as const,
  title: null,
  ticketId: null,
  createdByUserId: 2,
  createdAt: "2026-07-04T08:00:00",
  updatedAt: "2026-07-04T09:00:00",
  participants: [
    { userId: 1, joinedAt: "2026-07-04T08:00:00", active: true, lastReadAt: null },
    { userId: 2, joinedAt: "2026-07-04T08:00:00", active: true, lastReadAt: null },
  ],
  lastMessagePreview: "Bonjour",
  lastMessageAt: "2026-07-04T09:00:00",
  lastMessageUrgent: true,
  unreadCount: 2,
};

const baseMessagePage = {
  content: [
    {
      id: 101,
      conversationId: 10,
      senderUserId: 2,
      content: "Bonjour",
      urgent: false,
      createdAt: "2026-07-04T09:00:00",
      editedAt: null,
      deletedAt: null,
      ownMessage: false,
    },
  ],
  page: 0,
  size: 50,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
  hasNext: false,
};

describe("MessagesPage", () => {
  beforeEach(() => {
    mockSearch = {};
    navigateSpy.mockReset();
    Object.values(apiMocks).forEach((mockFn) => mockFn.mockReset());
    apiMocks.listMessagingDirectoryUsers.mockResolvedValue([
      { id: 2, fullName: "Agent B Module 6", email: "b@cgi.local", role: "EMPLOYEE" },
      { id: 3, fullName: "Agent C", email: "c@cgi.local", role: "EMPLOYEE" },
    ]);
    apiMocks.listConversations.mockResolvedValue([baseConversation]);
    apiMocks.getUnreadCount.mockResolvedValue({ unreadCount: 2 });
    apiMocks.getConversationDetail.mockResolvedValue(baseConversation);
    apiMocks.getConversationMessages.mockResolvedValue(baseMessagePage);
    apiMocks.markConversationRead.mockResolvedValue({
      userId: 1,
      joinedAt: "2026-07-04T08:00:00",
      active: true,
      lastReadAt: "2026-07-04T10:00:00",
    });
  });

  it("renders conversations with French labels and without raw enums", async () => {
    render(<MessagesPage />);

    await screen.findByText("Messagerie");
    await screen.findByText("Conversation directe");
    expect(screen.getByText("2 non lus")).toBeInTheDocument();
    expect(screen.queryByText("DIRECT")).not.toBeInTheDocument();
  });

  it("loads messages and marks the opened conversation as read", async () => {
    render(<MessagesPage />);

    await screen.findByText("Bonjour");
    await waitFor(() => {
      expect(apiMocks.markConversationRead).toHaveBeenCalledWith(mockAuthState.authenticatedFetch, 10);
    });
  });

  it("keeps send disabled for blank messages and clears the composer after a successful send", async () => {
    apiMocks.sendMessage.mockResolvedValue({
      id: 102,
      conversationId: 10,
      senderUserId: 1,
      content: "Reponse",
      urgent: false,
      createdAt: "2026-07-04T10:15:00",
      editedAt: null,
      deletedAt: null,
      ownMessage: true,
    });

    render(<MessagesPage />);

    const sendButton = await screen.findByRole("button", { name: /Envoyer/i });
    const composer = screen.getByPlaceholderText(/Ecrire un message/i);
    expect(sendButton).toBeDisabled();

    await userEvent.type(composer, "Reponse");
    expect(sendButton).not.toBeDisabled();
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(apiMocks.sendMessage).toHaveBeenCalled();
    });
    expect(composer).toHaveValue("");
  });

  it("sends on Enter and keeps Shift+Enter as a newline", async () => {
    apiMocks.sendMessage.mockResolvedValue({
      id: 103,
      conversationId: 10,
      senderUserId: 1,
      content: "Ligne 1",
      urgent: false,
      createdAt: "2026-07-04T10:20:00",
      editedAt: null,
      deletedAt: null,
      ownMessage: true,
    });

    render(<MessagesPage />);

    const composer = await screen.findByPlaceholderText(/Ecrire un message/i);
    fireEvent.change(composer, { target: { value: "Ligne 1" } });
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(apiMocks.sendMessage).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(composer, { target: { value: "A" } });
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: true });
    expect(apiMocks.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("validates direct and group creation input", async () => {
    render(<MessagesPage />);

    await userEvent.click(await screen.findByRole("button", { name: /Nouvelle conversation/i }));
    expect(screen.getByRole("button", { name: /Ouvrir la conversation/i })).toBeDisabled();

    await userEvent.click(screen.getAllByRole("button", { name: /Groupe/i }).at(-1)!);
    expect(screen.getByRole("button", { name: /Ouvrir la conversation/i })).toBeDisabled();
  });

  it("shows the ticket conversation action when no thread exists", async () => {
    mockSearch = { ticketId: 20, ticketReference: "DEMO-KPI-008" };
    apiMocks.getTicketConversation.mockRejectedValue(new MessagesApiError(404, "Conversation introuvable."));
    apiMocks.listConversations.mockResolvedValue([]);
    apiMocks.getUnreadCount.mockResolvedValue({ unreadCount: 0 });

    render(<MessagesPage />);

    expect(await screen.findByText(/Aucune discussion ticket n'existe encore/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Creer la discussion ticket/i })).toBeInTheDocument();
  });

  it("renders compact bubbles that preserve short, multiline, urgent, and long-content messages", async () => {
    apiMocks.getConversationMessages.mockResolvedValue({
      ...baseMessagePage,
      content: [
        {
          id: 201,
          conversationId: 10,
          senderUserId: 2,
          content: "OK",
          urgent: false,
          createdAt: "2026-07-04T09:00:00",
          editedAt: null,
          deletedAt: null,
          ownMessage: false,
        },
        {
          id: 202,
          conversationId: 10,
          senderUserId: 1,
          content: "Bonjour equipe",
          urgent: false,
          createdAt: "2026-07-04T09:05:00",
          editedAt: null,
          deletedAt: null,
          ownMessage: true,
        },
        {
          id: 203,
          conversationId: 10,
          senderUserId: 2,
          content: "Ligne 1\nLigne 2",
          urgent: true,
          createdAt: "2026-07-04T09:10:00",
          editedAt: null,
          deletedAt: null,
          ownMessage: false,
        },
        {
          id: 204,
          conversationId: 10,
          senderUserId: 1,
          content: "https://cgi.local/messages/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          urgent: true,
          createdAt: "2026-07-04T09:15:00",
          editedAt: "2026-07-04T09:16:00",
          deletedAt: null,
          ownMessage: true,
        },
      ],
      totalElements: 4,
    });

    render(<MessagesPage />);

    expect(await screen.findByText("OK")).toBeInTheDocument();
    expect(screen.getByText("Bonjour equipe")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Ligne 1") && content.includes("Ligne 2"))).toBeInTheDocument();
    expect(screen.getByText(/AAAAAAAAAAAA/)).toBeInTheDocument();
    expect(screen.getAllByText("Urgent")).toHaveLength(2);

    expect(screen.getByTestId("message-bubble-201")).toHaveClass(
      "w-fit",
      "max-w-[88%]",
      "sm:max-w-[75%]",
      "xl:max-w-[55%]",
      "bg-muted/45",
    );
    expect(screen.getByTestId("message-bubble-202")).toHaveClass(
      "w-fit",
      "max-w-[88%]",
      "sm:max-w-[75%]",
      "xl:max-w-[55%]",
      "bg-primary",
    );
    expect(screen.getByTestId("message-bubble-203")).toHaveClass("border-l-[3px]");
    expect(screen.getByTestId("message-bubble-204")).toHaveClass("border-r-[3px]");
    expect(screen.getByText("Modifie")).toBeInTheDocument();
  });
});
