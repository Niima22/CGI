package com.support.kpi.agent_service.repository;

import com.support.kpi.agent_service.entity.ActionPlan;
import com.support.kpi.agent_service.entity.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActionPlanRepository extends JpaRepository<ActionPlan, UUID> {
    List<ActionPlan> findByAgent(Agent agent);
}
