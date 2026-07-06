package com.cgi.intranet.ticket.service;

import java.util.List;

public interface SlaRecipientDirectoryService {

    List<Long> getLevelOneEscalationRecipients();

    List<Long> getLevelTwoEscalationRecipients();
}
