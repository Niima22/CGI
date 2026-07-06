package com.cgi.intranet.messaging.repository;

import com.cgi.intranet.messaging.entity.Conversation;
import com.cgi.intranet.messaging.entity.ConversationParticipant;
import com.cgi.intranet.messaging.entity.Message;
import com.cgi.intranet.messaging.enums.ConversationType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class MessageRepositoryTest {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private ConversationParticipantRepository participantRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void findsMessagesOrderedByCreationDateAscending() {
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.DIRECT);
        conversation.setCreatedByUserId(10L);
        conversation = conversationRepository.saveAndFlush(conversation);

        ConversationParticipant firstParticipant = new ConversationParticipant();
        firstParticipant.setConversation(conversation);
        firstParticipant.setUserId(10L);
        participantRepository.saveAndFlush(firstParticipant);

        ConversationParticipant secondParticipant = new ConversationParticipant();
        secondParticipant.setConversation(conversation);
        secondParticipant.setUserId(11L);
        participantRepository.saveAndFlush(secondParticipant);

        Message later = new Message();
        later.setConversation(conversation);
        later.setSenderUserId(10L);
        later.setContent("second");
        later = messageRepository.saveAndFlush(later);

        Message earlier = new Message();
        earlier.setConversation(conversation);
        earlier.setSenderUserId(11L);
        earlier.setContent("first");
        earlier = messageRepository.saveAndFlush(earlier);
        entityManager.createNativeQuery("update messages set created_at = ? where id = ?")
                .setParameter(1, LocalDateTime.now().plusMinutes(1))
                .setParameter(2, later.getId())
                .executeUpdate();
        entityManager.createNativeQuery("update messages set created_at = ? where id = ?")
                .setParameter(1, LocalDateTime.now().minusMinutes(1))
                .setParameter(2, earlier.getId())
                .executeUpdate();
        entityManager.flush();
        entityManager.clear();

        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAscIdAsc(conversation.getId());

        assertThat(messages)
                .extracting(Message::getContent)
                .containsExactly("first", "second");
    }

    @Test
    void unreadCountExcludesOwnMessagesAndOnlyCountsAfterLastReadAt() {
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.GROUP);
        conversation.setTitle("Ops");
        conversation.setCreatedByUserId(10L);
        conversation = conversationRepository.saveAndFlush(conversation);

        ConversationParticipant currentUser = new ConversationParticipant();
        currentUser.setConversation(conversation);
        currentUser.setUserId(10L);
        currentUser.setLastReadAt(LocalDateTime.now().minusMinutes(5));
        participantRepository.saveAndFlush(currentUser);

        ConversationParticipant otherUser = new ConversationParticipant();
        otherUser.setConversation(conversation);
        otherUser.setUserId(11L);
        participantRepository.saveAndFlush(otherUser);

        Message ownMessage = new Message();
        ownMessage.setConversation(conversation);
        ownMessage.setSenderUserId(10L);
        ownMessage.setContent("own");
        ownMessage = messageRepository.saveAndFlush(ownMessage);

        Message oldOtherMessage = new Message();
        oldOtherMessage.setConversation(conversation);
        oldOtherMessage.setSenderUserId(11L);
        oldOtherMessage.setContent("old");
        oldOtherMessage = messageRepository.saveAndFlush(oldOtherMessage);

        Message unreadOtherMessage = new Message();
        unreadOtherMessage.setConversation(conversation);
        unreadOtherMessage.setSenderUserId(11L);
        unreadOtherMessage.setContent("new");
        unreadOtherMessage = messageRepository.saveAndFlush(unreadOtherMessage);

        entityManager.createNativeQuery("update messages set created_at = ? where id = ?")
                .setParameter(1, LocalDateTime.now().minusMinutes(4))
                .setParameter(2, ownMessage.getId())
                .executeUpdate();
        entityManager.createNativeQuery("update messages set created_at = ? where id = ?")
                .setParameter(1, LocalDateTime.now().minusMinutes(6))
                .setParameter(2, oldOtherMessage.getId())
                .executeUpdate();
        entityManager.createNativeQuery("update messages set created_at = ? where id = ?")
                .setParameter(1, LocalDateTime.now().minusMinutes(2))
                .setParameter(2, unreadOtherMessage.getId())
                .executeUpdate();
        entityManager.flush();
        entityManager.clear();

        assertThat(messageRepository.countUnreadMessagesForConversationAndUser(conversation.getId(), 10L))
                .isEqualTo(1L);
        assertThat(messageRepository.countUnreadMessagesForUser(10L)).isEqualTo(1L);
    }

    @Test
    void unreadCountExcludesSoftDeletedMessages() {
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.DIRECT);
        conversation.setCreatedByUserId(10L);
        conversation = conversationRepository.saveAndFlush(conversation);

        ConversationParticipant currentUser = new ConversationParticipant();
        currentUser.setConversation(conversation);
        currentUser.setUserId(10L);
        participantRepository.saveAndFlush(currentUser);

        ConversationParticipant otherUser = new ConversationParticipant();
        otherUser.setConversation(conversation);
        otherUser.setUserId(11L);
        participantRepository.saveAndFlush(otherUser);

        Message deletedMessage = new Message();
        deletedMessage.setConversation(conversation);
        deletedMessage.setSenderUserId(11L);
        deletedMessage.setContent("deleted");
        deletedMessage.setDeletedAt(LocalDateTime.now());
        messageRepository.saveAndFlush(deletedMessage);

        entityManager.clear();

        assertThat(messageRepository.countUnreadMessagesForConversationAndUser(conversation.getId(), 10L))
                .isZero();
    }
}
