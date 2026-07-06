package com.cgi.intranet.messaging.repository;

import com.cgi.intranet.messaging.entity.Conversation;
import com.cgi.intranet.messaging.enums.ConversationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("""
            select conversation
            from Conversation conversation
            join ConversationParticipant participant
              on participant.conversation = conversation
            where participant.userId = :userId
              and participant.active = true
            order by conversation.updatedAt desc, conversation.id desc
            """)
    List<Conversation> findActiveConversationsForParticipant(@Param("userId") Long userId);

    @Query("""
            select conversation
            from Conversation conversation
            where conversation.type = com.cgi.intranet.messaging.enums.ConversationType.DIRECT
              and 2 = (
                    select count(participant)
                    from ConversationParticipant participant
                    where participant.conversation = conversation
                      and participant.active = true
              )
              and exists (
                    select 1
                    from ConversationParticipant participant
                    where participant.conversation = conversation
                      and participant.userId = :firstUserId
                      and participant.active = true
              )
              and exists (
                    select 1
                    from ConversationParticipant participant
                    where participant.conversation = conversation
                      and participant.userId = :secondUserId
                      and participant.active = true
              )
            """)
    Optional<Conversation> findDirectConversationForUsers(
            @Param("firstUserId") Long firstUserId,
            @Param("secondUserId") Long secondUserId
    );

    Optional<Conversation> findByTypeAndTicketId(ConversationType type, Long ticketId);

    default Optional<Conversation> findTicketConversationByTicketId(Long ticketId) {
        return findByTypeAndTicketId(ConversationType.TICKET, ticketId);
    }

    boolean existsByTypeAndTicketId(ConversationType type, Long ticketId);

    default boolean existsTicketConversationByTicketId(Long ticketId) {
        return existsByTypeAndTicketId(ConversationType.TICKET, ticketId);
    }
}
