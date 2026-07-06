import { describe, expect, it, vi } from "vitest";
import {
  getConversationMessages,
  type PaginatedMessagesResponse,
} from "@/lib/api/messages";

describe("messages api client", () => {
  it("normalizes the stable paginated response contract", async () => {
    const authenticatedFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            {
              id: 1,
              conversationId: 4,
              senderUserId: 2,
              content: "Bonjour",
              urgent: false,
              createdAt: "2026-07-04T09:00:00",
              editedAt: null,
              deletedAt: null,
              ownMessage: false,
            },
          ],
          page: 2,
          size: 50,
          totalElements: 101,
          totalPages: 3,
          first: false,
          last: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = (await getConversationMessages(
      authenticatedFetch,
      4,
      2,
      50,
    )) as PaginatedMessagesResponse;

    expect(response.page).toBe(2);
    expect(response.totalPages).toBe(3);
    expect(response.last).toBe(true);
    expect(response.hasNext).toBe(false);
    expect(response.content[0]?.content).toBe("Bonjour");
  });
});
