package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.repository.AuthUserDirectoryRepository;
import com.cgi.intranet.ticket.service.SlaRecipientDirectoryService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SlaRecipientDirectoryServiceImpl implements SlaRecipientDirectoryService {

    private final AuthUserDirectoryRepository authUserDirectoryRepository;

    public SlaRecipientDirectoryServiceImpl(AuthUserDirectoryRepository authUserDirectoryRepository) {
        this.authUserDirectoryRepository = authUserDirectoryRepository;
    }

    @Override
    public List<Long> getLevelOneEscalationRecipients() {
        List<Long> managerIds = authUserDirectoryRepository.findActiveUserIdsByRole("MANAGER");
        if (!managerIds.isEmpty()) {
            return managerIds;
        }
        return getLevelTwoEscalationRecipients();
    }

    @Override
    public List<Long> getLevelTwoEscalationRecipients() {
        return authUserDirectoryRepository.findActiveUserIdsByRole("ADMIN");
    }
}
