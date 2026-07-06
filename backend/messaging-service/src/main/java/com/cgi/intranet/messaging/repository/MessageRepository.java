package com.cgi.intranet.messaging.repository;

import com.cgi.intranet.messaging.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByCreatedAtAscIdAsc(Long conversationId);

    List<Message> findByConversationIdOrderByCreatedAtAscIdAsc(Long conversationId, Pageable pageable);

    Page<Message> findByConversationIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(Long conversationId, Pageable pageable);

    List<Message> findByConversationIdInAndDeletedAtIsNullOrderByConversationIdAscCreatedAtDescIdDesc(List<Long> conversationIds);

    Message findFirstByConversationIdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(Long conversationId);

    @Query("""
            select count(message)
            from Message message
            join ConversationParticipant participant
              on participant.conversation = message.conversation
            where participant.conversation.id = :conversationId
              and participant.userId = :userId
              and participant.active = true
              and message.deletedAt is null
              and message.senderUserId <> :userId
              and (
                    participant.lastReadAt is null
                    or message.createdAt > participant.lastReadAt
              )
            """)
    long countUnreadMessagesForConversationAndUser(
            @Param("conversationId") Long conversationId,
            @Param("userId") Long userId
    );

    @Query("""
            select count(message)
            from Message message
            join ConversationParticipant participant
              on participant.conversation = message.conversation
            where participant.userId = :userId
              and participant.active = true
              and message.deletedAt is null
              and message.senderUserId <> :userId
              and (
                    participant.lastReadAt is null
                    or message.createdAt > participant.lastReadAt
              )
            """)
    long countUnreadMessagesForUser(@Param("userId") Long userId);
}
