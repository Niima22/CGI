package com.cgi.intranet.messaging.repository;

import com.cgi.intranet.messaging.entity.ConversationParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {

    List<ConversationParticipant> findByConversationIdOrderByIdAsc(Long conversationId);

    List<ConversationParticipant> findByConversationIdInOrderByConversationIdAscIdAsc(List<Long> conversationIds);

    @Query("""
            select participant
            from ConversationParticipant participant
            where participant.userId = :userId
              and participant.active = true
            order by participant.joinedAt desc, participant.id desc
            """)
    List<ConversationParticipant> findActiveConversationsForUser(@Param("userId") Long userId);

    @Query("""
            select participant
            from ConversationParticipant participant
            join fetch participant.conversation conversation
            where participant.userId = :userId
              and participant.active = true
            order by conversation.updatedAt desc, conversation.id desc
            """)
    List<ConversationParticipant> findActiveMembershipsWithConversationForUser(@Param("userId") Long userId);

    boolean existsByConversationIdAndUserIdAndActiveTrue(Long conversationId, Long userId);

    Optional<ConversationParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);

    @Query("""
            select participant
            from ConversationParticipant participant
            join fetch participant.conversation conversation
            where conversation.id = :conversationId
              and participant.userId = :userId
              and participant.active = true
            """)
    Optional<ConversationParticipant> findActiveMembershipWithConversation(
            @Param("conversationId") Long conversationId,
            @Param("userId") Long userId
    );
}
