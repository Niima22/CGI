package com.cgi.intranet.messaging.repository;

import com.cgi.intranet.messaging.entity.Conversation;
import com.cgi.intranet.messaging.entity.ConversationParticipant;
import com.cgi.intranet.messaging.enums.ConversationType;
import jakarta.persistence.EntityManager;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class ConversationRepositoryTest {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private ConversationParticipantRepository participantRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void persistsConversationTypeAsStringAndFindsTicketConversation() {
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.TICKET);
        conversation.setTicketId(99L);
        conversation.setTitle("Ticket 99");
        conversation.setCreatedByUserId(7L);

        Conversation saved = conversationRepository.saveAndFlush(conversation);
        entityManager.clear();

        assertThat(saved.getId()).isNotNull();
        assertThat(conversationRepository.findTicketConversationByTicketId(99L))
                .isPresent()
                .get()
                .extracting(Conversation::getType)
                .isEqualTo(ConversationType.TICKET);
        assertThat(conversationRepository.existsTicketConversationByTicketId(99L)).isTrue();
    }

    @Test
    void rejectsDuplicateTicketConversation() {
        Conversation first = new Conversation();
        first.setType(ConversationType.TICKET);
        first.setTicketId(14L);
        first.setCreatedByUserId(1L);
        conversationRepository.saveAndFlush(first);

        Conversation second = new Conversation();
        second.setType(ConversationType.TICKET);
        second.setTicketId(14L);
        second.setCreatedByUserId(2L);

        assertThatThrownBy(() -> conversationRepository.saveAndFlush(second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsTicketConversationWithoutTicketId() {
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.TICKET);
        conversation.setCreatedByUserId(1L);

        assertThatThrownBy(() -> conversationRepository.saveAndFlush(conversation))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsDuplicateParticipantForSameConversationAndUser() {
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.GROUP);
        conversation.setTitle("Ops");
        conversation.setCreatedByUserId(1L);
        Conversation savedConversation = conversationRepository.saveAndFlush(conversation);

        ConversationParticipant first = new ConversationParticipant();
        first.setConversation(savedConversation);
        first.setUserId(77L);
        participantRepository.saveAndFlush(first);

        ConversationParticipant second = new ConversationParticipant();
        second.setConversation(savedConversation);
        second.setUserId(77L);

        assertThatThrownBy(() -> participantRepository.saveAndFlush(second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
