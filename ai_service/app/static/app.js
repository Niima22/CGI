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
const newTicketButton = document.querySelector("#new-chat");
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleLabel = document.querySelector("#theme-toggle-label");
const logoutButton = document.querySelector("#logout-button");
const roleMenuButton = document.querySelector("#role-menu-button");
const roleMenu = document.querySelector("#role-menu");

const agentView = document.querySelector("#agent-view");
const supervisorView = document.querySelector("#supervisor-view");
const savedView = document.querySelector("#saved-view");
const agentForm = document.querySelector("#agent-ticket-form");
const resolutionOutput = document.querySelector("#resolution-output");
const copyResolutionButton = document.querySelector("#copy-resolution");
const backToTopButton = document.querySelector("#back-to-top");
const copyFeedback = document.querySelector("#copy-feedback");
const workspace = document.querySelector("#workspace");
const ticketReviewList = document.querySelector("#ticket-review-list");
const savedAnalysisList = document.querySelector("#saved-analysis-list");
const supervisorDashboard = document.querySelector("#supervisor-dashboard");
const savedDashboard = document.querySelector("#saved-dashboard");
const exportCsvButton = document.querySelector("#export-csv");
const exportFeedback = document.querySelector("#export-feedback");
const actionInput = document.querySelector("#action-input");
const addActionButton = document.querySelector("#add-action");
const actionList = document.querySelector("#action-list");
const actionsFeedback = document.querySelector("#actions-feedback");

let authMode = "login";
let currentRole = "Employee";
let lastGeneratedFrame = "";
let ticketActions = [];
let generatedTickets = [
  {
    id: "MOCK-001",
    title: "VPN inaccessible après changement de mot de passe",
    department: "Réseau",
    summary: "L'utilisateur ne parvient plus à se connecter au VPN après modification de son mot de passe.",
    actions: [
      "Vérification du compte",
      "Suppression des identifiants enregistrés",
      "Synchronisation du profil",
      "Test de connexion",
    ],
    tools: "Active Directory, Console VPN",
    concernedParty: "Utilisateur / Utilisatrice",
    result: "Connexion VPN rétablie et test validé avec l'utilisateur.",
    finalStatus: "Résolu",
    resolutionFrame:
      "ID du ticket :\nMOCK-001\n\nAprès analyse du ticket intitulé \"VPN inaccessible après changement de mot de passe\", la problématique signalée concerne : L'utilisateur ne parvient plus à se connecter au VPN après modification de son mot de passe.\n\nLe ticket appartient à la bannette / département : Réseau.\n\nLes actions suivantes ont été réalisées :\n- Vérification du compte\n- Suppression des identifiants enregistrés\n- Synchronisation du profil\n- Test de connexion\n\nLes outils utilisés pendant le traitement sont :\nActive Directory, Console VPN\n\nLa partie concernée par le ticket est :\nUtilisateur / Utilisatrice\n\nRésultat obtenu :\nConnexion VPN rétablie et test validé avec l'utilisateur.\n\nStatut final du ticket :\nRésolu",
  },
  {
    id: "MOCK-002",
    title: "Imprimante magasin indisponible",
    department: "DS Magasin",
    summary: "Le magasin signale une impossibilité d'imprimer les documents de caisse.",
    actions: [
      "Contrôle de la connectivité",
      "Vidage de la file d'attente",
      "Redémarrage du service d'impression",
    ],
    tools: "Console impression, outil réseau",
    concernedParty: "Équipement",
    result: "Impression de test réussie après redémarrage du service.",
    finalStatus: "Résolu",
    resolutionFrame:
      "ID du ticket :\nMOCK-002\n\nAprès analyse du ticket intitulé \"Imprimante magasin indisponible\", la problématique signalée concerne : Le magasin signale une impossibilité d'imprimer les documents de caisse.\n\nLe ticket appartient à la bannette / département : DS Magasin.\n\nLes actions suivantes ont été réalisées :\n- Contrôle de la connectivité\n- Vidage de la file d'attente\n- Redémarrage du service d'impression\n\nLes outils utilisés pendant le traitement sont :\nConsole impression, outil réseau\n\nLa partie concernée par le ticket est :\nÉquipement\n\nRésultat obtenu :\nImpression de test réussie après redémarrage du service.\n\nStatut final du ticket :\nRésolu",
  },
];
let savedAnalyses = [];

function setAuthError(message) {
  authError.textContent = message;
}

function applySidebarState(isCollapsed) {
  appScreen.classList.toggle("sidebar-collapsed", isCollapsed);
  sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
  sidebarToggle.setAttribute("aria-label", isCollapsed ? "Ouvrir le menu" : "Réduire le menu");
  localStorage.setItem("quality-lab-sidebar-collapsed", String(isCollapsed));
}

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark-mode", isDark);
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggleLabel.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem("quality-lab-theme", theme);
}

function formValue(formData, key, fallback = "Non renseigné") {
  const value = String(formData.get(key) || "").trim();
  return value || fallback;
}

function buildResolutionFrame(ticket) {
  const actionLines = ticket.actions.map((action) => `- ${action}`).join("\n");

  return `ID du ticket :
${ticket.id}

Après analyse du ticket intitulé "${ticket.title}", la problématique signalée concerne : ${ticket.summary}.

Le ticket appartient à la bannette / département : ${ticket.department}.

Les actions suivantes ont été réalisées :
${actionLines}

Les outils utilisés pendant le traitement sont :
${ticket.tools || "Non renseigné"}

La partie concernée par le ticket est :
${ticket.concernedParty || "Non renseigné"}

Résultat obtenu :
${ticket.result}

Statut final du ticket :
${ticket.finalStatus}`;
}

function createTicketFromForm(formData) {
  const ticket = {
    id: `TCK-${String(Date.now()).slice(-6)}`,
    title: formValue(formData, "title"),
    department: formValue(formData, "department"),
    summary: formValue(formData, "summary"),
    actions: [...ticketActions],
    tools: formValue(formData, "tools", ""),
    concernedParty: formValue(formData, "concerned_party", ""),
    result: formValue(formData, "result"),
    finalStatus: formValue(formData, "final_status"),
  };

  ticket.resolutionFrame = buildResolutionFrame(ticket);
  return ticket;
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

function exportAnalysesCsv() {
  if (!savedAnalyses.length) {
    exportFeedback.textContent = "Aucune analyse validée à exporter.";
    return;
  }

  const rows = [
    [
      "ID ticket",
      "Ticket",
      "Bannette",
      "Synthèse du problème",
      "Actions réalisées",
      "Outils utilisés",
      "Partie concernée",
      "Résultat obtenu",
      "Statut final",
      "Trame de résolution",
      "Type de résolution",
      "Statut OK / KO",
      "Commentaire superviseur",
      "Date de validation",
    ],
    ...savedAnalyses.map((analysis) => [
      analysis.ticket.id,
      analysis.ticket.title,
      analysis.ticket.department,
      analysis.ticket.summary,
      formatActionsForDisplay(analysis.ticket.actions),
      analysis.ticket.tools,
      analysis.ticket.concernedParty,
      analysis.ticket.result,
      analysis.ticket.finalStatus,
      analysis.resolutionFrame,
      analysis.resolutionType,
      analysis.analysisStatus,
      analysis.supervisorComment,
      analysis.validatedAt,
    ]),
  ];

  downloadCsv("quality-lab-validations.csv", rows);
  exportFeedback.textContent = "Export CSV généré.";
}

function countBy(items, getKey) {
  return items.reduce((accumulator, item) => {
    const key = getKey(item) || "Non renseigné";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function formatBreakdown(counts) {
  const entries = Object.entries(counts);

  if (!entries.length) {
    return "Aucune donnée";
  }

  return entries.map(([key, count]) => `${key}: ${count}`).join(" · ");
}

function renderDashboardCards(container) {
  const totalTickets = generatedTickets.length;
  const totalAnalyses = savedAnalyses.length;
  const okCount = savedAnalyses.filter((analysis) => analysis.analysisStatus === "OK").length;
  const koCount = savedAnalyses.filter((analysis) => analysis.analysisStatus === "KO").length;
  const incompleteCount = savedAnalyses.filter((analysis) =>
    ["Résolution incomplète", "Résolution non justifiée", "Traitement à revoir"].includes(analysis.resolutionType)
  ).length;
  const incompleteRate = totalAnalyses ? Math.round((incompleteCount / totalAnalyses) * 100) : 0;
  const departments = countBy(generatedTickets, (ticket) => ticket.department);

  const cards = [
    {
      value: totalTickets,
      label: "Tickets disponibles",
      helper: "Tickets mockés + trames générées",
    },
    {
      value: totalAnalyses,
      label: "Tickets analysés",
      helper: `${okCount} OK · ${koCount} KO`,
    },
    {
      value: `${incompleteRate}%`,
      label: "Traitements à risque",
      helper: `${incompleteCount} analyse(s) incomplète(s) ou à revoir`,
    },
    {
      value: Object.keys(departments).length,
      label: "Bannettes",
      helper: formatBreakdown(departments),
    },
  ];

  container.innerHTML = "";
  cards.forEach((card) => {
    const article = document.createElement("article");
    article.className = "dashboard-card";
    article.innerHTML = `
      <strong>${card.value}</strong>
      <span>${card.label}</span>
      <small>${card.helper}</small>
    `;
    container.appendChild(article);
  });
}

function renderDashboard() {
  renderDashboardCards(supervisorDashboard);
  renderDashboardCards(savedDashboard);
}

function formatActionsForDisplay(actions) {
  if (!Array.isArray(actions) || !actions.length) {
    return "Non renseigné";
  }

  return actions.map((action, index) => `${index + 1}. ${action}`).join("\n");
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

  actionsFeedback.textContent = ticketActions.length ? "" : "Ajouter au moins une action réalisée.";
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
      actionsFeedback.textContent = "Une action modifiée ne peut pas être vide.";
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
  const views = {
    agent: agentView,
    supervisor: supervisorView,
    saved: savedView,
  };

  Object.entries(views).forEach(([name, view]) => {
    view.classList.toggle("is-hidden", name !== viewName);
  });

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  if (viewName === "supervisor") {
    renderDashboard();
    renderSupervisorTickets();
  }

  if (viewName === "saved") {
    renderDashboard();
    renderSavedAnalyses();
  }
}

function detailBlock(label, value, isFull = false) {
  const block = document.createElement("div");
  block.className = `detail-block${isFull ? " full" : ""}`;

  const title = document.createElement("strong");
  title.textContent = label;

  const content = document.createElement(isFull ? "p" : "span");
  content.textContent = value || "Non renseigné";

  block.appendChild(title);
  block.appendChild(content);
  return block;
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
  [ticket.id, ticket.department, ticket.finalStatus, ticket.concernedParty || "Partie non renseignée"].forEach((item) => {
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
  details.appendChild(detailBlock("Bannette / département", ticket.department));
  details.appendChild(detailBlock("Statut final du ticket", ticket.finalStatus));
  details.appendChild(detailBlock("Synthèse du problème", ticket.summary, true));
  details.appendChild(detailBlock("Actions réalisées", formatActionsForDisplay(ticket.actions), true));
  details.appendChild(detailBlock("Outils utilisés", ticket.tools));
  details.appendChild(detailBlock("Partie concernée", ticket.concernedParty));
  details.appendChild(detailBlock("Résultat obtenu", ticket.result, true));
  details.appendChild(detailBlock("Trame de résolution générée", ticket.resolutionFrame, true));
  card.appendChild(details);

  const analysisForm = document.createElement("form");
  analysisForm.className = "analysis-form";
  analysisForm.dataset.ticketId = ticket.id;
  analysisForm.innerHTML = `
    <label class="field">
      <span class="form-label">Statut d'analyse</span>
      <select name="analysis_status" required>
        <option value="">Sélectionner</option>
        <option>OK</option>
        <option>KO</option>
      </select>
    </label>
    <label class="field">
      <span class="form-label">Type de résolution</span>
      <select name="resolution_type" required>
        <option value="">Sélectionner</option>
        <option>Résolution correcte</option>
        <option>Résolution incomplète</option>
        <option>Résolution non justifiée</option>
        <option>Ticket transféré</option>
        <option>Ticket escaladé</option>
        <option>Problème non reproduit</option>
        <option>Traitement à revoir</option>
      </select>
    </label>
    <label class="field field-wide">
      <span class="form-label">Commentaire superviseur</span>
      <textarea name="supervisor_comment" rows="3" placeholder="Expliquer pourquoi le ticket est OK ou KO."></textarea>
    </label>
    <div class="form-actions field-wide">
      <button class="send-button" type="submit">Valider l'analyse</button>
    </div>
    <p class="validation-feedback" aria-live="polite"></p>
  `;

  analysisForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(analysisForm);
    const feedback = analysisForm.querySelector(".validation-feedback");
    const analysis = {
      id: `AN-${String(Date.now()).slice(-6)}`,
      ticket,
      resolutionFrame: ticket.resolutionFrame,
      resolutionType: formValue(formData, "resolution_type"),
      analysisStatus: formValue(formData, "analysis_status"),
      supervisorComment: formValue(formData, "supervisor_comment", ""),
      validatedAt: new Date().toLocaleString("fr-FR"),
    };

    savedAnalyses.unshift(analysis);
    feedback.textContent = `Analyse sauvegardée le ${analysis.validatedAt}.`;
    exportFeedback.textContent = "";
    renderDashboard();
    renderSavedAnalyses();
  });

  card.appendChild(analysisForm);
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

function renderSavedAnalyses() {
  savedAnalysisList.innerHTML = "";

  if (!savedAnalyses.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune analyse validée pour le moment.";
    savedAnalysisList.appendChild(empty);
    return;
  }

  savedAnalyses.forEach((analysis) => {
    const card = document.createElement("article");
    card.className = "ticket-card";
    card.appendChild(detailBlock("ID ticket", analysis.ticket.id));
    card.appendChild(detailBlock("Ticket", analysis.ticket.title));
    card.appendChild(detailBlock("Statut OK / KO", analysis.analysisStatus));
    card.appendChild(detailBlock("Type de résolution", analysis.resolutionType));
    card.appendChild(detailBlock("Commentaire superviseur", analysis.supervisorComment || "Non renseigné", true));
    card.appendChild(detailBlock("Date de validation", analysis.validatedAt));
    card.appendChild(detailBlock("Trame de résolution générée", analysis.resolutionFrame, true));
    savedAnalysisList.appendChild(card);
  });
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

authForm.addEventListener("submit", (event) => {
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
  currentRole = formData.get("role") || "Employee";
  const isSupervisor = currentRole === "Supervisor";

  rolePill.textContent = isSupervisor ? "Superviseur" : "Agent";
  roleContext.textContent = isSupervisor
    ? "Espace superviseur pour analyser la qualité et la cohérence des traitements."
    : "Espace agent pour générer une trame de résolution avant clôture.";

  authScreen.classList.add("is-hidden");
  appScreen.classList.remove("is-hidden");
  setView(isSupervisor ? "supervisor" : "agent");
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

agentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!ticketActions.length) {
    actionsFeedback.textContent = "Ajouter au moins une action réalisée.";
    actionInput.focus();
    return;
  }

  if (!agentForm.reportValidity()) {
    return;
  }

  const ticket = createTicketFromForm(new FormData(agentForm));
  generatedTickets.unshift(ticket);
  lastGeneratedFrame = ticket.resolutionFrame;
  resolutionOutput.textContent = lastGeneratedFrame;
  copyFeedback.textContent = "Trame générée et ajoutée à la liste superviseur.";
  renderDashboard();
  renderSupervisorTickets();
  scrollToResultPanel();
});

copyResolutionButton.addEventListener("click", async () => {
  if (!lastGeneratedFrame) {
    copyFeedback.textContent = "Aucune trame à copier.";
    return;
  }

  try {
    await navigator.clipboard.writeText(lastGeneratedFrame);
    resetAgentForm();
    copyFeedback.textContent = "Trame copiée. Le formulaire a été vidé.";
  } catch (error) {
    copyFeedback.textContent = "Copie impossible depuis ce navigateur.";
  }
});

backToTopButton.addEventListener("click", scrollWorkspaceToTop);

workspace.addEventListener("scroll", updateScrollTopButton);
exportCsvButton.addEventListener("click", exportAnalysesCsv);

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
  setAuthError("");
  roleCards.forEach((item, index) => {
    item.classList.toggle("active", index === 0);
  });
  currentRole = "Employee";
  rolePill.textContent = "Prototype";
  roleContext.textContent = "Module fonctionnel de génération et revue des trames de résolution.";
  roleMenu.classList.add("is-hidden");
  roleMenuButton.setAttribute("aria-expanded", "false");
  appScreen.classList.add("is-hidden");
  authScreen.classList.remove("is-hidden");
});

applyTheme(localStorage.getItem("quality-lab-theme") || "light");
applySidebarState(localStorage.getItem("quality-lab-sidebar-collapsed") === "true");
renderActionList();
renderDashboard();
renderSupervisorTickets();
renderSavedAnalyses();
updateScrollTopButton();
