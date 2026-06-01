const authScreen = document.querySelector("#auth-screen");
const appScreen = document.querySelector("#app-screen");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const authForm = document.querySelector("#auth-form");
const authError = document.querySelector("#auth-error");
const authTabs = document.querySelectorAll("[data-auth-mode]");
const signupOnlyFields = document.querySelectorAll(".signup-only");
const roleCards = document.querySelectorAll(".role-card");
const rolePill = document.querySelector("#role-pill");
const roleContext = document.querySelector("#role-context");
const navItems = document.querySelectorAll("[data-view]");
const supervisorOnlyItems = document.querySelectorAll(".supervisor-only");
const newTicketButton = document.querySelector("#new-chat");
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleLabel = document.querySelector("#theme-toggle-label");
const logoutButton = document.querySelector("#logout-button");
const roleMenuButton = document.querySelector("#role-menu-button");
const roleMenu = document.querySelector("#role-menu");

const agentView = document.querySelector("#agent-view");
const supervisorView = document.querySelector("#supervisor-view");
const metricsView = document.querySelector("#metrics-view");
const agentForm = document.querySelector("#agent-ticket-form");
const resolutionOutput = document.querySelector("#resolution-output");
const resolutionInsights = document.querySelector("#resolution-insights");
const copyResolutionButton = document.querySelector("#copy-resolution");
const backToTopButton = document.querySelector("#back-to-top");
const copyFeedback = document.querySelector("#copy-feedback");
const workspace = document.querySelector("#workspace");
const ticketReviewList = document.querySelector("#ticket-review-list");
const exportCsvButton = document.querySelector("#export-csv");
const exportFeedback = document.querySelector("#export-feedback");
const actionInput = document.querySelector("#action-input");
const addActionButton = document.querySelector("#add-action");
const actionList = document.querySelector("#action-list");
const actionsFeedback = document.querySelector("#actions-feedback");
const solutionSelector = document.querySelector("#solution-selector");
const selectedSolutionOutput = document.querySelector("#selected-solution-output");
const evaluateSolutionButton = document.querySelector("#evaluate-solution");
const evaluationFeedback = document.querySelector("#evaluation-feedback");
const evaluationResultGrid = document.querySelector("#evaluation-result-grid");
const weeklyMetricsTable = document.querySelector("#weekly-metrics-table");
const monthlyMetricsTable = document.querySelector("#monthly-metrics-table");
const metricsCharts = document.querySelector("#metrics-charts");

const BANNETTES = ["FO", "BO", "PROXI-PMC", "Partenaire", "Supply", "DS-Magasin"];

let authMode = "login";
let currentRole = "Consultant";
let authToken = localStorage.getItem("quality-lab-auth-token") || "";
let lastGeneratedFrame = "";
let ticketActions = [];
let generatedTickets = [
  {
    id: "MOCK-001",
    title: "VPN inaccessible apres changement de mot de passe",
    department: "FO",
    summary: "L'utilisateur ne parvient plus a se connecter au VPN apres modification de son mot de passe.",
    actions: [
      "Verification du compte",
      "Suppression des identifiants enregistres",
      "Synchronisation du profil",
      "Test de connexion",
    ],
    tools: "Active Directory, Console VPN",
    createdAt: new Date().toISOString(),
  },
  {
    id: "MOCK-002",
    title: "Imprimante magasin indisponible",
    department: "DS-Magasin",
    summary: "Le magasin signale une impossibilite d'imprimer les documents de caisse.",
    actions: [
      "Controle de la connectivite",
      "Vidage de la file d'attente",
      "Redemarrage du service d'impression",
    ],
    tools: "Console impression, outil reseau",
    createdAt: new Date().toISOString(),
  },
];
let savedEvaluations = [];

generatedTickets = generatedTickets.map((ticket) => ({
  ...ticket,
  resolutionFrame: buildResolutionFrame(ticket),
}));

function setAuthError(message) {
  authError.textContent = message;
}

function applySidebarState(isCollapsed) {
  appScreen.classList.toggle("sidebar-collapsed", isCollapsed);
  sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
  sidebarToggle.setAttribute("aria-label", isCollapsed ? "Ouvrir le menu" : "Reduire le menu");
  localStorage.setItem("quality-lab-sidebar-collapsed", String(isCollapsed));
}

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark-mode", isDark);
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggleLabel.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem("quality-lab-theme", theme);
}

function applyRoleAccess() {
  const isSupervisor = currentRole === "Supervisor";

  appScreen.dataset.role = currentRole;
  supervisorOnlyItems.forEach((item) => {
    item.classList.toggle("is-hidden", !isSupervisor);
  });

  if (!isSupervisor && !agentView.classList.contains("is-hidden")) {
    return;
  }

  if (!isSupervisor) {
    setView("agent");
  }
}

function applyAuthenticatedUser(user, token) {
  authToken = token;
  localStorage.setItem("quality-lab-auth-token", token);
  currentRole = user.role;

  const isSupervisor = currentRole === "Supervisor";
  rolePill.textContent = isSupervisor ? "Superviseur" : "Consultant";
  roleContext.textContent = isSupervisor
    ? "Espace superviseur pour generer, evaluer et suivre les trames de resolution."
    : "Espace Consultant limite a la generation de trames de resolution.";

  authScreen.classList.add("is-hidden");
  appScreen.classList.remove("is-hidden");
  applyRoleAccess();
  loadTicketsFromApi().finally(() => {
    renderSolutionSelector();
    renderSupervisorTickets();
  });
  setView("agent");
}

async function submitAuthRequest(formData) {
  const role = String(formData.get("role") || "Consultant");
  const payload = {
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
  };

  if (authMode === "signup") {
    payload.role = role;
    payload.full_name = String(formData.get("full_name") || "").trim();
  }

  const response = await fetch(authMode === "signup" ? "/auth/signup" : "/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Authentification impossible.");
  }

  return data;
}

function formValue(formData, key, fallback = "Non renseigne") {
  const value = String(formData.get(key) || "").trim();
  return value || fallback;
}

function buildResolutionFrame(ticket) {
  const actionLines = ticket.actions.map((action) => `- ${action}`).join("\n");

  return `ID du ticket :
${ticket.id}

Titre :
${ticket.title}

Synthese de la demande :
${ticket.summary}

Bannette :
${ticket.department}

Actions realisees :
${actionLines}

Outils utilises :
${ticket.tools || "Non renseigne"}`;
}

function createTicketFromForm(formData) {
  const ticket = {
    id: `TCK-${String(Date.now()).slice(-6)}`,
    title: formValue(formData, "title"),
    department: formValue(formData, "department"),
    summary: formValue(formData, "summary"),
    actions: [...ticketActions],
    tools: formValue(formData, "tools", ""),
    createdAt: new Date().toISOString(),
  };

  ticket.resolutionFrame = buildResolutionFrame(ticket);
  return ticket;
}

function createTicketFromGenerator(formData, actions, resolutionFrame) {
  return {
    id: `TCK-${String(Date.now()).slice(-6)}`,
    title: formValue(formData, "title"),
    department: formValue(formData, "department"),
    summary: formValue(formData, "summary"),
    actions,
    tools: formValue(formData, "tools", ""),
    resolutionFrame,
    createdAt: new Date().toISOString(),
  };
}

function ticketFromApi(data) {
  return {
    id: data.id,
    title: data.title,
    department: data.department,
    summary: data.summary,
    actions: data.actions,
    tools: data.tools || "",
    resolutionFrame: data.resolution_frame,
    createdAt: data.created_at,
  };
}

async function loadTicketsFromApi() {
  const response = await fetch("/tickets");
  if (!response.ok) {
    return;
  }

  const tickets = await response.json();
  generatedTickets = tickets.map(ticketFromApi);
}

async function saveTicketToApi(ticket) {
  if (!authToken) {
    return;
  }

  const response = await fetch("/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      id: ticket.id,
      title: ticket.title,
      department: ticket.department,
      summary: ticket.summary,
      actions: ticket.actions,
      tools: ticket.tools,
      resolution_frame: ticket.resolutionFrame,
    }),
  });

  if (!response.ok) {
    throw new Error("Sauvegarde PostgreSQL impossible.");
  }

  return ticketFromApi(await response.json());
}

async function generateResolutionFrame(payload) {
  const response = await fetch("/generate-resolution-frame", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Generation de la trame impossible.");
  }

  return data;
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const csvContent = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportEvaluationsCsv() {
  if (!savedEvaluations.length) {
    exportFeedback.textContent = "Aucune evaluation a exporter.";
    return;
  }

  const rows = [
    [
      "ID ticket",
      "Ticket",
      "Bannette",
      "Trame de resolution",
      "Type de resolution",
      "Commentaire trame",
      "Commentaire type",
      "Date evaluation",
    ],
    ...savedEvaluations.map((evaluation) => [
      evaluation.ticket.id,
      evaluation.ticket.title,
      evaluation.ticket.department,
      evaluation.trameResolution,
      evaluation.typeResolution,
      evaluation.trameComment,
      evaluation.typeComment,
      evaluation.evaluatedAtLabel,
    ]),
  ];

  downloadCsv("quality-lab-evaluations.csv", rows);
  exportFeedback.textContent = "Export CSV genere.";
}

function formatActionsForDisplay(actions) {
  if (!Array.isArray(actions) || !actions.length) {
    return "Non renseigne";
  }

  return actions.map((action) => `- ${action}`).join("\n");
}

function collectActionsForGeneration() {
  const actions = [...ticketActions];
  const pendingAction = actionInput.value.trim();

  if (pendingAction && !actions.includes(pendingAction)) {
    actions.push(pendingAction);
  }

  return actions;
}

function splitToolsForGeneration(value) {
  return String(value || "")
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean);
}

function formatScore(score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return "0%";
  }

  return `${Math.round(numericScore * 100)}%`;
}

function renderResolutionInsights(result) {
  resolutionInsights.innerHTML = "";
  resolutionInsights.classList.remove("is-hidden");

  const scoreGrid = document.createElement("div");
  scoreGrid.className = "resolution-score-grid";

  [
    ["Type de résolution", result.resolutionType || "Non renseigné"],
    ["Qualité", formatScore(result.qualityScore)],
    ["Confiance", formatScore(result.confidenceScore)],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "resolution-score-card";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement("strong");
    valueElement.textContent = value;

    item.appendChild(labelElement);
    item.appendChild(valueElement);
    scoreGrid.appendChild(item);
  });

  resolutionInsights.appendChild(scoreGrid);

  if (Array.isArray(result.missingElements) && result.missingElements.length) {
    const missingBlock = document.createElement("div");
    missingBlock.className = "resolution-detail-block warning";
    const title = document.createElement("strong");
    title.textContent = "Éléments manquants";
    const list = document.createElement("ul");

    result.missingElements.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.appendChild(listItem);
    });

    missingBlock.appendChild(title);
    missingBlock.appendChild(list);
    resolutionInsights.appendChild(missingBlock);
  }

  if (Array.isArray(result.similarCases) && result.similarCases.length) {
    const similarBlock = document.createElement("div");
    similarBlock.className = "resolution-detail-block";
    const title = document.createElement("strong");
    title.textContent = "Cas similaires";
    const list = document.createElement("ol");

    result.similarCases.slice(0, 3).forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item.ticketTitle || "Titre non renseigné";
      list.appendChild(listItem);
    });

    similarBlock.appendChild(title);
    similarBlock.appendChild(list);
    resolutionInsights.appendChild(similarBlock);
  }
}

function renderActionList() {
  actionList.innerHTML = "";

  ticketActions.forEach((action, index) => {
    const item = document.createElement("li");
    item.className = "action-item";

    const row = document.createElement("div");
    row.className = "action-row";

    const text = document.createElement("span");
    text.className = "action-text";
    text.textContent = action;

    const editButton = document.createElement("button");
    editButton.className = "action-control";
    editButton.type = "button";
    editButton.textContent = "Modifier";

    const deleteButton = document.createElement("button");
    deleteButton.className = "action-control";
    deleteButton.type = "button";
    deleteButton.textContent = "Supprimer";

    editButton.addEventListener("click", () => {
      startActionEdit(index, row);
    });

    deleteButton.addEventListener("click", () => {
      ticketActions.splice(index, 1);
      renderActionList();
    });

    row.appendChild(text);
    row.appendChild(editButton);
    row.appendChild(deleteButton);
    item.appendChild(row);
    actionList.appendChild(item);
  });

  actionsFeedback.textContent = ticketActions.length ? "" : "Ajouter au moins une action realisee.";
}

function addAction() {
  const action = actionInput.value.trim();

  if (!action) {
    actionsFeedback.textContent = "Saisir une action avant de l'ajouter.";
    actionInput.focus();
    return;
  }

  ticketActions.push(action);
  actionInput.value = "";
  actionsFeedback.textContent = "";
  renderActionList();
  actionInput.focus();
}

function startActionEdit(index, row) {
  row.innerHTML = "";

  const editInput = document.createElement("input");
  editInput.className = "action-edit-input";
  editInput.type = "text";
  editInput.value = ticketActions[index];

  const saveButton = document.createElement("button");
  saveButton.className = "action-control";
  saveButton.type = "button";
  saveButton.textContent = "Valider";

  const cancelButton = document.createElement("button");
  cancelButton.className = "action-control";
  cancelButton.type = "button";
  cancelButton.textContent = "Annuler";

  function saveEdit() {
    const editedAction = editInput.value.trim();

    if (!editedAction) {
      actionsFeedback.textContent = "Une action modifiee ne peut pas etre vide.";
      editInput.focus();
      return;
    }

    ticketActions[index] = editedAction;
    actionsFeedback.textContent = "";
    renderActionList();
  }

  saveButton.addEventListener("click", saveEdit);
  cancelButton.addEventListener("click", renderActionList);
  editInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEdit();
    }

    if (event.key === "Escape") {
      renderActionList();
    }
  });

  row.appendChild(editInput);
  row.appendChild(saveButton);
  row.appendChild(cancelButton);
  editInput.focus();
}

function setView(viewName) {
  const isSupervisor = currentRole === "Supervisor";
  const nextView = !isSupervisor && viewName !== "agent" ? "agent" : viewName;
  const views = {
    agent: agentView,
    supervisor: supervisorView,
    metrics: metricsView,
  };

  Object.entries(views).forEach(([name, view]) => {
    view.classList.toggle("is-hidden", name !== nextView);
  });

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === nextView);
  });

  if (nextView === "supervisor") {
    loadTicketsFromApi().finally(() => {
      renderSolutionSelector();
      renderSupervisorTickets();
    });
  }

  if (nextView === "metrics") {
    renderMetricsDashboard();
  }

  scrollWorkspaceToTop();
}

function detailBlock(label, value, isFull = false) {
  const block = document.createElement("div");
  block.className = `detail-block${isFull ? " full" : ""}`;

  const title = document.createElement("strong");
  title.textContent = label;

  const content = document.createElement(isFull ? "p" : "span");
  content.textContent = value || "Non renseigne";

  block.appendChild(title);
  block.appendChild(content);
  return block;
}

function getSelectedTicket() {
  return generatedTickets.find((ticket) => ticket.id === solutionSelector.value);
}

function renderSolutionSelector() {
  solutionSelector.innerHTML = "";

  if (!generatedTickets.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Aucune solution disponible";
    solutionSelector.appendChild(option);
    selectedSolutionOutput.textContent = "Aucune solution Consultant a evaluer.";
    evaluateSolutionButton.disabled = true;
    return;
  }

  generatedTickets.forEach((ticket) => {
    const option = document.createElement("option");
    option.value = ticket.id;
    option.textContent = `${ticket.id} - ${ticket.department} - ${ticket.title}`;
    solutionSelector.appendChild(option);
  });

  evaluateSolutionButton.disabled = false;
  renderSelectedSolution();
}

function renderSelectedSolution() {
  const ticket = getSelectedTicket();
  selectedSolutionOutput.textContent = ticket ? ticket.resolutionFrame : "Selectionner une solution a evaluer.";
  evaluationFeedback.textContent = "";
  evaluationResultGrid.innerHTML = "";
}

function renderEvaluationResult(evaluation) {
  const cards = [
    {
      label: "Trame de resolution",
      status: evaluation.trameResolution,
      comment: evaluation.trameComment,
    },
    {
      label: "Type de resolution",
      status: evaluation.typeResolution,
      comment: evaluation.typeComment,
    },
  ];

  evaluationResultGrid.innerHTML = "";
  cards.forEach((card) => {
    const article = document.createElement("article");
    article.className = `evaluation-card ${card.status === "OK" ? "ok" : "ko"}`;
    article.innerHTML = `
      <span>${card.label}</span>
      <strong>${card.status}</strong>
      <p>${card.comment}</p>
    `;
    evaluationResultGrid.appendChild(article);
  });
}

async function evaluateSelectedSolution() {
  const ticket = getSelectedTicket();

  if (!ticket) {
    evaluationFeedback.textContent = "Selectionner une solution Consultant.";
    return;
  }

  evaluationFeedback.textContent = "Evaluation IA en cours...";
  evaluateSolutionButton.disabled = true;

  try {
    const response = await fetch("/ai/evaluate-solution", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticket_id: ticket.id,
        title: ticket.title,
        bannette: ticket.department,
        synthese: ticket.summary,
        actions: ticket.actions,
        outils: ticket.tools,
        resolution_frame: ticket.resolutionFrame,
      }),
    });

    if (!response.ok) {
      throw new Error("Evaluation unavailable");
    }

    const result = await response.json();
    const evaluatedAt = new Date();
    const evaluation = {
      id: `EV-${String(Date.now()).slice(-6)}`,
      ticket,
      trameResolution: result.trame_resolution.status,
      trameComment: result.trame_resolution.comment,
      typeResolution: result.type_resolution.status,
      typeComment: result.type_resolution.comment,
      evaluatedAt,
      evaluatedAtLabel: evaluatedAt.toLocaleString("fr-FR"),
    };

    savedEvaluations.unshift(evaluation);
    evaluationFeedback.textContent = `Evaluation sauvegardee le ${evaluation.evaluatedAtLabel}.`;
    exportFeedback.textContent = "";
    renderEvaluationResult(evaluation);
    renderSupervisorTickets();
    renderMetricsDashboard();
  } catch (error) {
    evaluationFeedback.textContent = "Evaluation impossible pour le moment.";
  } finally {
    evaluateSolutionButton.disabled = false;
  }
}

function latestEvaluationForTicket(ticketId) {
  return savedEvaluations.find((evaluation) => evaluation.ticket.id === ticketId);
}

function createTicketCard(ticket) {
  const card = document.createElement("article");
  card.className = "ticket-card";

  const header = document.createElement("div");
  header.className = "ticket-card-header";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = ticket.title;

  const meta = document.createElement("div");
  meta.className = "ticket-meta";
  [ticket.id, ticket.department].forEach((item) => {
    const pill = document.createElement("span");
    pill.className = "meta-pill";
    pill.textContent = item;
    meta.appendChild(pill);
  });

  titleWrap.appendChild(title);
  titleWrap.appendChild(meta);
  header.appendChild(titleWrap);
  card.appendChild(header);

  const details = document.createElement("div");
  details.className = "ticket-detail-grid";
  details.appendChild(detailBlock("ID ticket", ticket.id));
  details.appendChild(detailBlock("Bannette", ticket.department));
  details.appendChild(detailBlock("Synthese de la demande", ticket.summary, true));
  details.appendChild(detailBlock("Actions realisees", formatActionsForDisplay(ticket.actions), true));
  details.appendChild(detailBlock("Outils utilises", ticket.tools));
  details.appendChild(detailBlock("Trame de resolution generee", ticket.resolutionFrame, true));
  card.appendChild(details);

  const evaluation = latestEvaluationForTicket(ticket.id);
  if (evaluation) {
    const result = document.createElement("div");
    result.className = "ticket-evaluation-summary";
    result.innerHTML = `
      <span>Trame de resolution: <strong>${evaluation.trameResolution}</strong></span>
      <span>Type de resolution: <strong>${evaluation.typeResolution}</strong></span>
      <span>${evaluation.evaluatedAtLabel}</span>
    `;
    card.appendChild(result);
  }

  return card;
}

function renderSupervisorTickets() {
  ticketReviewList.innerHTML = "";

  if (!generatedTickets.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucun ticket disponible pour analyse.";
    ticketReviewList.appendChild(empty);
    return;
  }

  generatedTickets.forEach((ticket) => {
    ticketReviewList.appendChild(createTicketCard(ticket));
  });
}

function isSameWeek(date, now) {
  const current = new Date(now);
  const target = new Date(date);
  const day = (current.getDay() + 6) % 7;
  const weekStart = new Date(current);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(current.getDate() - day);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return target >= weekStart && target < weekEnd;
}

function isSameMonth(date, now) {
  const target = new Date(date);
  return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
}

function emptyMetrics() {
  return BANNETTES.map((bannette) => ({
    bannette,
    tickets: 0,
    trameOk: 0,
    trameKo: 0,
    typeOk: 0,
    typeKo: 0,
  }));
}

function buildMetrics(filterPredicate) {
  const metrics = emptyMetrics();
  const byBannette = Object.fromEntries(metrics.map((item) => [item.bannette, item]));

  savedEvaluations.filter((evaluation) => filterPredicate(evaluation.evaluatedAt)).forEach((evaluation) => {
    const row = byBannette[evaluation.ticket.department];
    if (!row) {
      return;
    }

    row.tickets += 1;
    row.trameOk += evaluation.trameResolution === "OK" ? 1 : 0;
    row.trameKo += evaluation.trameResolution === "KO" ? 1 : 0;
    row.typeOk += evaluation.typeResolution === "OK" ? 1 : 0;
    row.typeKo += evaluation.typeResolution === "KO" ? 1 : 0;
  });

  return metrics;
}

function renderMetricsTable(container, rows) {
  const table = document.createElement("table");
  table.className = "metrics-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th rowspan="2">Bannettes</th>
        <th rowspan="2">Nr ticket</th>
        <th colspan="2">Trame de resolution</th>
        <th colspan="2">Type de resolution</th>
      </tr>
      <tr>
        <th class="ok-cell">OK</th>
        <th class="ko-cell">KO</th>
        <th class="ok-cell">OK</th>
        <th class="ko-cell">KO</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `
        <tr>
          <th>${row.bannette}</th>
          <td>${row.tickets}</td>
          <td>${row.trameOk}</td>
          <td>${row.trameKo}</td>
          <td>${row.typeOk}</td>
          <td>${row.typeKo}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  `;

  container.innerHTML = "";
  container.appendChild(table);
}

function percent(ok, ko) {
  const total = ok + ko;
  return total ? Math.round((ok / total) * 100) : 0;
}

function renderChart(title, rows, okKey, koKey) {
  const chart = document.createElement("article");
  chart.className = "metric-chart";
  chart.innerHTML = `<h3>${title}</h3>`;

  rows.forEach((row) => {
    const total = row[okKey] + row[koKey];
    const okPercent = percent(row[okKey], row[koKey]);
    const koPercent = total ? 100 - okPercent : 0;
    const line = document.createElement("div");
    line.className = "chart-row";
    line.innerHTML = `
      <span>${row.bannette}</span>
      <div class="stacked-bar" aria-label="${row.bannette} ${okPercent}% OK ${koPercent}% KO">
        <span class="bar-ok" style="width: ${okPercent}%"></span>
        <span class="bar-ko" style="width: ${koPercent}%"></span>
      </div>
      <strong>${okPercent}% OK</strong>
    `;
    chart.appendChild(line);
  });

  return chart;
}

function renderMetricsDashboard() {
  const now = new Date();
  const weekly = buildMetrics((date) => isSameWeek(date, now));
  const monthly = buildMetrics((date) => isSameMonth(date, now));

  renderMetricsTable(weeklyMetricsTable, weekly);
  renderMetricsTable(monthlyMetricsTable, monthly);

  metricsCharts.innerHTML = "";
  metricsCharts.appendChild(renderChart("Weekly - Trame de resolution", weekly, "trameOk", "trameKo"));
  metricsCharts.appendChild(renderChart("Weekly - Type de resolution", weekly, "typeOk", "typeKo"));
  metricsCharts.appendChild(renderChart("Monthly - Trame de resolution", monthly, "trameOk", "trameKo"));
  metricsCharts.appendChild(renderChart("Monthly - Type de resolution", monthly, "typeOk", "typeKo"));
}

function scrollToResultPanel() {
  resolutionOutput.closest(".result-panel").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function scrollWorkspaceToTop() {
  workspace.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function updateScrollTopButton() {
  backToTopButton.classList.toggle("is-hidden", workspace.scrollTop < 160);
}

function resetAgentForm() {
  agentForm.reset();
  ticketActions = [];
  renderActionList();
  lastGeneratedFrame = "";
  resolutionOutput.textContent = "La trame générée apparaîtra ici.";
  resolutionInsights.innerHTML = "";
  resolutionInsights.classList.add("is-hidden");
}

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    authMode = tab.dataset.authMode;

    authTabs.forEach((item) => item.classList.toggle("active", item === tab));
    signupOnlyFields.forEach((field) => {
      field.hidden = authMode !== "signup";
    });
  });
});

["email", "password"].forEach((fieldName) => {
  authForm.elements[fieldName].addEventListener("input", () => {
    authForm.elements[fieldName].setCustomValidity("");
    setAuthError("");
  });
});

roleCards.forEach((card) => {
  card.addEventListener("click", () => {
    roleCards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");
  });
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(authForm);
  const emailInput = authForm.elements.email;
  const passwordInput = authForm.elements.password;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email.endsWith("@cgi.com")) {
    setAuthError("Email incorrect.");
    emailInput.setCustomValidity("Email incorrect.");
    emailInput.reportValidity();
    return;
  }

  emailInput.setCustomValidity("");

  if (password.length < 6) {
    setAuthError("Mot de passe incorrect.");
    passwordInput.setCustomValidity("Mot de passe incorrect.");
    passwordInput.reportValidity();
    return;
  }

  passwordInput.setCustomValidity("");
  setAuthError("");

  try {
    const data = await submitAuthRequest(formData);
    applyAuthenticatedUser(data.user, data.token);
  } catch (error) {
    setAuthError(error.message);
  }
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    setView(item.dataset.view);
  });
});

newTicketButton.addEventListener("click", () => {
  resetAgentForm();
  copyFeedback.textContent = "";
  setView("agent");
});

agentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!agentForm.reportValidity()) {
    return;
  }

  const formData = new FormData(agentForm);
  const actions = collectActionsForGeneration();
  const tools = splitToolsForGeneration(formData.get("tools"));
  const submitButton = agentForm.querySelector('button[type="submit"]');

  try {
    submitButton.disabled = true;
    copyFeedback.textContent = "Génération de la trame IA...";
    actionsFeedback.textContent = "";

    const result = await generateResolutionFrame({
      ticketTitle: formValue(formData, "title", ""),
      bannette: formValue(formData, "department", ""),
      requestSummary: formValue(formData, "summary", ""),
      actionsDone: actions,
      toolsUsed: tools,
    });

    lastGeneratedFrame = result.resolutionFrame;
    resolutionOutput.textContent = lastGeneratedFrame;
    renderResolutionInsights(result);

    if (actions.length) {
      let ticket = createTicketFromGenerator(formData, actions, lastGeneratedFrame);
      ticket = (await saveTicketToApi(ticket)) || ticket;
      generatedTickets = [ticket, ...generatedTickets.filter((item) => item.id !== ticket.id)];
      renderSolutionSelector();
      renderSupervisorTickets();
      copyFeedback.textContent = "Trame générée et sauvegardée pour le superviseur.";
    } else {
      copyFeedback.textContent = "Trame générée. Ajoutez au moins une action réalisée pour la sauvegarder.";
    }

    scrollToResultPanel();
  } catch (error) {
    copyFeedback.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

copyResolutionButton.addEventListener("click", async () => {
  if (!lastGeneratedFrame) {
    copyFeedback.textContent = "Aucune trame a copier.";
    return;
  }

  try {
    await navigator.clipboard.writeText(lastGeneratedFrame);
    resetAgentForm();
    copyFeedback.textContent = "Trame copiee. Le formulaire a ete vide.";
  } catch (error) {
    copyFeedback.textContent = "Copie impossible depuis ce navigateur.";
  }
});

backToTopButton.addEventListener("click", scrollWorkspaceToTop);

workspace.addEventListener("scroll", updateScrollTopButton);
exportCsvButton.addEventListener("click", exportEvaluationsCsv);
solutionSelector.addEventListener("change", renderSelectedSolution);
evaluateSolutionButton.addEventListener("click", evaluateSelectedSolution);

addActionButton.addEventListener("click", addAction);

actionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addAction();
  }
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
  applyTheme(nextTheme);
});

sidebarToggle.addEventListener("click", () => {
  applySidebarState(!appScreen.classList.contains("sidebar-collapsed"));
});

roleMenuButton.addEventListener("click", () => {
  const isOpen = roleMenu.classList.toggle("is-hidden") === false;
  roleMenuButton.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", (event) => {
  if (!roleMenu.contains(event.target) && !roleMenuButton.contains(event.target)) {
    roleMenu.classList.add("is-hidden");
    roleMenuButton.setAttribute("aria-expanded", "false");
  }
});

logoutButton.addEventListener("click", () => {
  authForm.reset();
  authToken = "";
  localStorage.removeItem("quality-lab-auth-token");
  setAuthError("");
  roleCards.forEach((item, index) => {
    item.classList.toggle("active", index === 0);
  });
  currentRole = "Consultant";
  rolePill.textContent = "Prototype";
  roleContext.textContent = "Module fonctionnel de generation et revue des trames de resolution.";
  roleMenu.classList.add("is-hidden");
  roleMenuButton.setAttribute("aria-expanded", "false");
  appScreen.classList.add("is-hidden");
  authScreen.classList.remove("is-hidden");
  applyRoleAccess();
});

applyTheme(localStorage.getItem("quality-lab-theme") || "light");
applySidebarState(localStorage.getItem("quality-lab-sidebar-collapsed") === "true");
applyRoleAccess();
renderActionList();
renderSolutionSelector();
renderSupervisorTickets();
renderMetricsDashboard();
updateScrollTopButton();
