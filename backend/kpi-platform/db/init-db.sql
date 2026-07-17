-- ============================================================
-- KPI PLATFORM DS MAGASIN — SCRIPT SQL FINAL DEFINITIF
-- Basé sur l'analyse réelle des 4 fichiers sources
-- ============================================================
-- SOURCES ANALYSÉES :
--   CSV NPS       : 6786 lignes, 27 colonnes, agent=login_grafana
--   CSV Prod.     : 7180 lignes, 19 colonnes, agent=code_gdi (FR685920)
--   KPI Excel     : 19 agents nommés, 13 feuilles
--   Suivi KPI     : Feuille Dic = table de correspondance centrale
-- ============================================================

-- ─── Création des bases ───────────────────────────────────
SELECT 'CREATE DATABASE auth_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db')\gexec
SELECT 'CREATE DATABASE agent_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agent_db')\gexec
SELECT 'CREATE DATABASE kpi_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kpi_db')\gexec
SELECT 'CREATE DATABASE nps_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nps_db')\gexec
SELECT 'CREATE DATABASE import_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'import_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE auth_db   TO kpi_user;
GRANT ALL PRIVILEGES ON DATABASE agent_db  TO kpi_user;
GRANT ALL PRIVILEGES ON DATABASE kpi_db    TO kpi_user;
GRANT ALL PRIVILEGES ON DATABASE nps_db    TO kpi_user;
GRANT ALL PRIVILEGES ON DATABASE import_db TO kpi_user;


-- ============================================================
-- BASE : auth_db
-- ============================================================
\connect auth_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TABLE 1 : utilisateurs
CREATE TABLE utilisateurs (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    login         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nom           VARCHAR(100) NOT NULL,
    prenom        VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('SUPERVISOR','AGENT')),
    agent_ref_id  UUID,        -- référence à agent_db.agents.id (non FK cross-db)
    actif         BOOLEAN      NOT NULL DEFAULT true,
    derniere_connexion TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_util_login ON utilisateurs(login);
CREATE INDEX idx_util_role  ON utilisateurs(role);

-- Données initiales
-- Development users are seeded by kpi-platform-auth-service only when
-- KPI_PLATFORM_SEED_DEMO_USERS=true. No password is inserted by this script.


-- ============================================================
-- BASE : agent_db
-- ============================================================
\connect agent_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TABLE 2 : equipes_ds (les sous-équipes DS Magasin)
-- FO / BO / Promocash / Proximité / SCO
CREATE TABLE equipes_ds (
    id     SMALLSERIAL  PRIMARY KEY,
    code   VARCHAR(20)  UNIQUE NOT NULL,  -- FO, BO, Promocash, Proximite, SCO
    libelle VARCHAR(100) NOT NULL
);

INSERT INTO equipes_ds (code, libelle) VALUES
  ('FO',        'Front Office'),
  ('BO',        'Back Office'),
  ('Promocash', 'Promocash'),
  ('Proximite', 'Proximité'),
  ('SCO',       'SCO / Libre-Service');

-- TABLE 3 : superviseurs
CREATE TABLE superviseurs (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nom        VARCHAR(100) NOT NULL,
    prenom     VARCHAR(100) NOT NULL,
    email      VARCHAR(200),
    actif      BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO superviseurs (nom, prenom, email) VALUES
  ('EDEROUICH', 'Malika',  'malika.ederouich@cgi.com'),
  ('SADIKI',    'Zouhair', 'zouhair.sadiki@cgi.com');

-- TABLE 4 : agents  ← SOURCE : Feuille "Dic" de Suivi_KPI_NPS.xlsx
-- Unifie les 3 formats d'identifiants
CREATE TABLE agents (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifiants (source : feuille Dic)
    code_gdi        VARCHAR(20)  UNIQUE,       -- CSV Productivité  ex: FR685920
    login_grafana   VARCHAR(120) UNIQUE,       -- CSV NPS           ex: ghizlane_moutakabil_1
    log_care        VARCHAR(20)  UNIQUE,       -- Suivi KPI Dic     ex: 86410831
    empl_id         VARCHAR(20),               -- EmplID Suivi KPI  ex: 548729

    -- Identité
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    nom_complet     VARCHAR(200) GENERATED ALWAYS AS (prenom || ' ' || nom) STORED,

    -- FIX ERREUR 3 : normalisation du nom pour éviter les collisions Prénom/Nom vs Nom/Prénom
    -- Ex: 'ANAS FAID' (Daily-Prod.) vs 'Faid ANAS' (W&M) → même agent
    -- Le champ nom_normalise est calculé en UPPERCASE trié alphabétiquement par le parser Python
    -- et utilisé comme clé de déduplication avant INSERT
    nom_normalise   VARCHAR(200),  -- Ex: 'FAID ANAS' (uppercase, alphanum trié) – géré côté Python

    -- Rattachement
    equipe_ds_id    SMALLINT     REFERENCES equipes_ds(id),
    superviseur_id  UUID         REFERENCES superviseurs(id),
    perimetre       VARCHAR(20), -- BO, FO, VUS, etc. (tel que dans Dic)

    -- Télécommunications (Dic-2)
    svi_group       VARCHAR(50), -- SVI BO / SVI FO
    location        VARCHAR(50), -- Casa
    lot             SMALLINT,
    licence_rainbow VARCHAR(20),

    -- Statut
    statut          VARCHAR(20)  NOT NULL DEFAULT 'ACTIF'
                    CHECK (statut IN ('ACTIF','INACTIF','CONGE')),
    date_entree     DATE,

    -- Audit
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index sur nom_normalise pour déduplication rapide à l'import
CREATE UNIQUE INDEX idx_agents_nom_normalise ON agents(nom_normalise) WHERE nom_normalise IS NOT NULL;

CREATE INDEX idx_agents_code_gdi      ON agents(code_gdi);
CREATE INDEX idx_agents_login_grafana ON agents(login_grafana);
CREATE INDEX idx_agents_log_care      ON agents(log_care);
CREATE INDEX idx_agents_equipe        ON agents(equipe_ds_id);

-- TABLE 5 : action_plans (Plans d'action superviseur)
-- Sources : PA-NPS, PA-Qualité, PA-TDC, PA-Autonomie, PA-Transverse
CREATE TABLE action_plans (
    id              SERIAL       PRIMARY KEY,
    type_pa         VARCHAR(20)  NOT NULL
                    CHECK (type_pa IN ('PA-NPS','PA-Qualite','PA-TDC','PA-Autonomie','PA-Transverse')),

    -- Champs communs à toutes les feuilles PA-*
    action_principale VARCHAR(500),
    sous_actions      TEXT,
    details           TEXT,
    porteur_action    VARCHAR(200),

    -- FIX ERREUR 1 : les valeurs réelles dans les fichiers Excel sont :
    -- 'Terminé' (accent), 'Continue', 'Lancé', 'En Standby', 'Abandonné', 'A faire'
    -- Le CHECK est élargi pour couvrir TOUTES les valeurs trouvées dans les fichiers
    statut            VARCHAR(30)  NOT NULL DEFAULT 'EN_COURS'
                      CHECK (statut IN (
                          'EN_COURS',     -- valeur applicative par défaut
                          'Terminé',      -- trouvé dans PA-NPS Excel
                          'Terminer',     -- variante sans accent (robustesse)
                          'Continue',     -- trouvé dans PA-NPS Excel
                          'Lancé',        -- trouvé dans PA-TDC Excel
                          'Lance',        -- variante sans accent
                          'En Standby',   -- trouvé dans PA-Autonomie Excel
                          'Stand-by',     -- variante avec tiret
                          'Abandonné',    -- trouvé dans PA-NPS Excel
                          'Abandonne',    -- variante sans accent
                          'A faire',      -- trouvé dans PA-NPS Excel
                          'Non concerné', -- trouvé dans CSV NPS
                          'Non concerne'  -- variante sans accent
                      )),
    deadline          DATE,
    action_copil      BOOLEAN      DEFAULT false,
    commentaires      TEXT,

    -- FIX ERREUR 4 : colonnes spécifiques aux feuilles PA-TDC, PA-Autonomie, PA-Transverse
    -- PA-TDC : chantier (thème du plan)
    chantier          VARCHAR(200),
    -- PA-Autonomie : niveau_service visé
    niveau_service    VARCHAR(100),
    -- PA-Transverse : identifiant interne de l'action
    id_action_externe VARCHAR(50),
    -- Colonne générique pour toute métadonnée PA-spécifique non modélisée
    metadonnees_pa    JSONB,

    -- Rattachement optionnel à un agent
    agent_id        UUID         REFERENCES agents(id) ON DELETE SET NULL,
    superviseur_id  UUID         REFERENCES superviseurs(id),

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ap_type   ON action_plans(type_pa);
CREATE INDEX idx_ap_statut ON action_plans(statut);
CREATE INDEX idx_ap_agent  ON action_plans(agent_id);

-- TABLE 6 : km_articles (Base de connaissance — feuille KM)
CREATE TABLE km_articles (
    id               SERIAL       PRIMARY KEY,
    km_id            BIGINT       UNIQUE NOT NULL, -- ID KM ex: 118139
    titre            TEXT         NOT NULL,         -- Article
    mots_clefs       TEXT,
    service          VARCHAR(200),
    nb_tickets_lies  INT          DEFAULT 0,        -- N° Tickets rattachés (5ans)
    date_creation    DATE,
    date_modification DATE,
    statut_km        VARCHAR(20),                   -- MAJ / Création
    no_km_seq        INT,                           -- N° KM séquentiel
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
-- BASE : kpi_db
-- ============================================================
\connect kpi_db

-- TABLE 7 : tickets  ← SOURCE : CSV Productivité (5113 tickets uniques)
-- + Ext. Grafana (Suivi KPI)
CREATE TABLE tickets (
    id              SERIAL       PRIMARY KEY,

    -- Identifiant Grafana/ITSM
    ticket_id       BIGINT       UNIQUE NOT NULL,  -- ID TICKET ex: 94149366

    -- Colonnes CSV Productivité
    type_ticket     VARCHAR(30)  NOT NULL
                    CHECK (type_ticket IN ('Request','Incident')),
    type_categorie  VARCHAR(20)  CHECK (type_categorie IN ('Request','Incident')),
    digital_support VARCHAR(100),                  -- DS Magasin / DS Supply / etc.
    bannette_grafana VARCHAR(200),                 -- BANNETTE brute CSV ex: FR IT SIC N1_N2 SUPER-HYPER FRONT OFFICE
    equipe_ds       VARCHAR(20),                   -- FO/BO/Promocash calculé par import
    domaine         VARCHAR(30),                   -- IT / MAINTENEUR / PROJET / METIER / EDITEUR
    priorite_initiale VARCHAR(5),                  -- P1..P6
    priorite        VARCHAR(5),
    equipe_traitante VARCHAR(100),                 -- CGI - Encaissement / ESDI - Réseau / etc.

    -- Dates
    date_creation   DATE,                          -- JOUR ACTION
    date_heure_action TIMESTAMPTZ,                 -- DATE HEURE

    -- Agent (lien via code_gdi, résolu en import)
    agent_code_gdi  VARCHAR(20),                   -- ID AGENT du CSV

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_agent  ON tickets(agent_code_gdi);
CREATE INDEX idx_tickets_date   ON tickets(date_creation);
CREATE INDEX idx_tickets_equipe ON tickets(equipe_ds);
CREATE INDEX idx_tickets_type   ON tickets(type_ticket);

-- TABLE 8 : actions_tickets  ← SOURCE : CSV Productivité (7180 lignes = actions)
-- Chaque ligne = 1 action sur 1 ticket par 1 agent
CREATE TABLE actions_tickets (
    id              BIGSERIAL    PRIMARY KEY,

    ticket_id       BIGINT       REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    agent_code_gdi  VARCHAR(20)  NOT NULL,
    date_action     DATE         NOT NULL,
    date_heure      TIMESTAMPTZ,

    -- Indicateurs CSV (0 ou 1)
    resol           SMALLINT     NOT NULL DEFAULT 0 CHECK (resol   IN (0,1)),
    esc             SMALLINT     NOT NULL DEFAULT 0 CHECK (esc     IN (0,1)),
    trf_int         SMALLINT     NOT NULL DEFAULT 0 CHECK (trf_int IN (0,1)),
    trf_ext         SMALLINT     NOT NULL DEFAULT 0 CHECK (trf_ext IN (0,1)),
    aff_inc         SMALLINT     NOT NULL DEFAULT 0 CHECK (aff_inc IN (0,1)),
    eat             SMALLINT     NOT NULL DEFAULT 0 CHECK (eat     IN (0,1)),  -- Escalade A Tort

    bannette_grafana VARCHAR(200),
    equipe_ds        VARCHAR(20),

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_act_agent ON actions_tickets(agent_code_gdi);
CREATE INDEX idx_act_date  ON actions_tickets(date_action);
CREATE INDEX idx_act_eat   ON actions_tickets(eat) WHERE eat = 1;
CREATE INDEX idx_act_esc   ON actions_tickets(esc) WHERE esc = 1;

-- TABLE 9 : kpi_daily  ← SOURCE : Feuille Daily-Prod. de KPI_DS_Magasin.xlsx
-- Agrégats par agent et par jour (colonnes = dates dans l'Excel)
CREATE TABLE kpi_daily (
    id                      BIGSERIAL   PRIMARY KEY,

    -- FIX ERREUR 3 : agent_nom_complet n'est plus la clé unique
    -- Un agent peut avoir 2 graphies différentes selon la feuille ('ANAS FAID' vs 'Faid ANAS')
    -- → On utilise agent_nom_normalise (calculé par Python) comme clé de déduplication
    agent_nom_complet       VARCHAR(200) NOT NULL, -- valeur brute depuis Excel
    agent_nom_normalise     VARCHAR(200),           -- version normalisée uppercase (ex: 'FAID ANAS')
    agent_code_gdi          VARCHAR(20),            -- résolu après import via agents.nom_normalise
    date_kpi                DATE         NOT NULL,
    semaine                 VARCHAR(10),             -- S17, S18...

    -- Tickets (colonnes réelles Excel : Résolus, Escaladés, T. Traités, Tr. internes, Tr. Externes, Total Tickets)
    tickets_resolus             INT  DEFAULT 0,
    tickets_escalades           INT  DEFAULT 0,
    tickets_traites             INT  DEFAULT 0,
    tickets_transferts_internes INT  DEFAULT 0,
    tickets_transferts_externes INT  DEFAULT 0,
    total_tickets               INT  DEFAULT 0,

    -- Appels (Appels Reçus, Appels Répondus, QS)
    appels_recus            INT  DEFAULT 0,
    appels_repondus         INT  DEFAULT 0,

    -- FIX ERREUR 2 : QS peut être "" (chaîne vide) dans Excel quand pas de données
    -- → Colonne nullable sans DEFAULT, le parser Python convertit "" et '\xa0' en NULL
    -- → Pas de CHECK ici : la validation se fait en amont dans data_validator.py
    qs                      NUMERIC(5,2),           -- NULL accepté (pas de données ce jour)
    qs_source_brute         VARCHAR(20),            -- valeur brute Excel pour debug ('', 0, 6...)

    -- Taux calculés par Python (NULL si total_tickets = 0)
    taux_resolution         NUMERIC(6,3),
    taux_escalade           NUMERIC(6,3),
    taux_transfert          NUMERIC(6,3),

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Clé d'unicité sur nom_normalise + date (résistante aux variantes graphiques)
    UNIQUE (agent_nom_normalise, date_kpi)
);

CREATE INDEX idx_kpid_agent ON kpi_daily(agent_code_gdi);
CREATE INDEX idx_kpid_date  ON kpi_daily(date_kpi);

-- TABLE 10 : kpi_appels_daily  ← SOURCE : Feuilles Daily-DS.M-QS, Ext.Inwi, Ext.Rainbow
-- Données appels téléphoniques brutes
CREATE TABLE kpi_appels_daily (
    id                    BIGSERIAL   PRIMARY KEY,

    -- FO ou BO (tel que dans Daily-DS.M-QS : Magasin FO / Magasin BO)
    equipe_ds             VARCHAR(20) NOT NULL,
    source_appels         VARCHAR(20) NOT NULL DEFAULT 'INWI'
                          CHECK (source_appels IN ('INWI','RAINBOW','TOTAL')),
    date_kpi              DATE        NOT NULL,
    semaine               VARCHAR(10),

    -- Colonnes réelles Daily-DS.M-QS
    appels_comptabilises  INT  DEFAULT 0,    -- Appels comptabilisés
    appels_repondus       INT  DEFAULT 0,    -- Appels Répondus
    appels_perdus         INT  DEFAULT 0,    -- Appels Perdus
    appels_abandonnes     INT  DEFAULT 0,    -- Appels Abandonnés
    taux_decroche         NUMERIC(5,4),      -- Taux de décroché (ex: 0.97)
    taux_perdus           NUMERIC(5,4),

    -- Données détaillées Inwi/Rainbow (Ext. Inwi, Ext. Rainbow)
    duree_attente_moy_sec INT  DEFAULT 0,
    duree_traitement_moy_sec INT DEFAULT 0,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (equipe_ds, source_appels, date_kpi)
);

-- TABLE 11 : kpi_wm_prod  ← SOURCE : Feuille W&M-DS.M-Prod.
-- Agrégats mensuels par agent
CREATE TABLE kpi_wm_prod (
    id                   SERIAL      PRIMARY KEY,
    agent_nom_complet    VARCHAR(200) NOT NULL,
    agent_code_gdi       VARCHAR(20),
    mois                 VARCHAR(30)  NOT NULL, -- ex: "Avril 2026"
    annee                SMALLINT,
    mois_num             SMALLINT,

    -- Colonnes W&M : % Résol., %Escalade, % Transfert, Tickets, Appels Reçus, Appels répondus, QS
    pct_resolution       NUMERIC(6,4),
    pct_escalade         NUMERIC(6,4),
    pct_transfert        NUMERIC(6,4),
    total_tickets        INT  DEFAULT 0,
    appels_recus         NUMERIC(8,2), -- peut être décimal (moyenne)
    appels_repondus      NUMERIC(8,2),
    qs_mensuel           NUMERIC(6,4),

    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_nom_complet, mois)
);

-- TABLE 12 : agent_scores  ← Calculé par python-analytics-service
CREATE TABLE agent_scores (
    id                  SERIAL       PRIMARY KEY,
    agent_code_gdi      VARCHAR(20)  NOT NULL,
    agent_nom_complet   VARCHAR(200),
    equipe_ds           VARCHAR(20),

    periode_debut       DATE         NOT NULL,
    periode_fin         DATE         NOT NULL,
    type_periode        VARCHAR(15)  NOT NULL DEFAULT 'WEEKLY'
                        CHECK (type_periode IN ('DAILY','WEEKLY','MONTHLY')),

    -- Formule : score_global = (taux_resol * 0.40) + (QS * 0.30) + (NPS * 0.20) + (volume * 0.10)
    score_resolution    NUMERIC(6,2),  -- taux_resolution * 0.40
    score_qs            NUMERIC(6,2),  -- QS_appels * 0.30
    score_nps           NUMERIC(6,2),  -- NPS_agent * 0.20
    score_volume        NUMERIC(6,2),  -- min(100, tickets/objectif*100) * 0.10
    score_global        NUMERIC(6,2),

    -- Classement calculé dans la même période
    classement_equipe   INT,
    classement_global   INT,

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (agent_code_gdi, periode_debut, type_periode)
);

CREATE INDEX idx_scores_agent  ON agent_scores(agent_code_gdi);
CREATE INDEX idx_scores_global ON agent_scores(score_global DESC);

-- TABLE 13 : alertes  ← Calculé par scoring-service
CREATE TABLE alertes (
    id              BIGSERIAL    PRIMARY KEY,
    type_alerte     VARCHAR(30)  NOT NULL
                    CHECK (type_alerte IN ('TAUX_ESCALADE','QS','NPS','VOLUME','EAT')),
    agent_code_gdi  VARCHAR(20),
    equipe_ds       VARCHAR(20),
    valeur_actuelle NUMERIC(8,3),
    seuil_alerte    NUMERIC(8,3),
    niveau          VARCHAR(15)  NOT NULL
                    CHECK (niveau IN ('CRITIQUE','ALERTE','ATTENTION')),
    message         TEXT,
    date_alerte     DATE         NOT NULL DEFAULT CURRENT_DATE,
    resolue         BOOLEAN      NOT NULL DEFAULT false,
    date_resolution DATE,
    resolue_par     UUID,        -- user_id
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alertes_resolue ON alertes(resolue) WHERE resolue = false;
CREATE INDEX idx_alertes_niveau  ON alertes(niveau);


-- ============================================================
-- BASE : nps_db
-- ============================================================
\connect nps_db

-- TABLE 14 : nps_retours  ← SOURCE : CSV NPS à chaud (6786 lignes, 27 colonnes)
CREATE TABLE nps_retours (
    id                     BIGSERIAL    PRIMARY KEY,

    -- Colonnes directes du CSV
    date_retour_nps        DATE,                          -- DATE RETOUR NPS
    ticket_id              BIGINT       UNIQUE NOT NULL,  -- ID TICKET
    type_ticket            VARCHAR(5)   CHECK (type_ticket IN ('DA','DS')), -- TYPE (DA/DS)
    service_impactant      VARCHAR(200),                 -- SERVICE IMPACTANT
    service_impacte        VARCHAR(200),                 -- SERVICE IMPACTE
    digital_support        VARCHAR(100),                 -- DIGITAL SUPPORT (DS Magasin, DS Supply...)
    categorisation         TEXT,                         -- CATEGORISATION (chemin arborescent)
    partenaire             VARCHAR(50),                  -- PARTENAIRE (CGI, ESDI...)
    bannette_grafana       VARCHAR(200),                 -- BANNETTE (nom technique complet)
    equipe_ds              VARCHAR(20),                  -- calculé à l'import (FO/BO/...)
    domaine                VARCHAR(30),                  -- DOMAINE (IT/MAINTENEUR/PROJET...)

    -- Agent (RESOLU PAR = login_grafana)
    resolu_par_grafana     VARCHAR(120) NOT NULL,        -- ex: ghizlane_moutakabil_1
    agent_code_gdi         VARCHAR(20),                  -- résolu après import

    -- NPS
    nps                    SMALLINT     NOT NULL CHECK (nps BETWEEN 0 AND 10),  -- NPS
    categorie_nps          VARCHAR(15)  GENERATED ALWAYS AS (
                               CASE WHEN nps >= 9 THEN 'Promoteur'
                                    WHEN nps >= 7 THEN 'Neutre'
                                    ELSE 'Détracteur' END
                           ) STORED,
    commentaire            TEXT,                         -- COMMENTAIRE

    -- Répondant
    repondant              VARCHAR(150),                 -- REPONDANT
    emplacement_repondant  VARCHAR(200),                 -- EMPLACEMENT REPONDANT

    -- Suivi
    reponse_commentaire    TEXT,                         -- REPONSE COMMENTAIRE
    etat_ciblage_ttr       VARCHAR(20),                  -- ETAT CIBLAGE TTR (OK / Aucune donnée)
    etat_ttr               VARCHAR(20),                  -- ETAT TTR (OK / KO / Aucune donnée)
    reaffectations         SMALLINT     DEFAULT 0,       -- REAFFECTATIONS
    relances               SMALLINT     DEFAULT 0,       -- RELANCES
    reouvertures           SMALLINT     DEFAULT 0,       -- REOUVERTURES
    id_odm                 BIGINT,                       -- ID ODM

    -- Plan d'action NPS (colonnes du CSV)
    etat_plan_action       VARCHAR(30),                  -- ETAT DU PLAN D'ACTION (Terminé/A faire/En cours/Abandonné/Stand-by/Non concerné)
    categorisation_nps     VARCHAR(100),                 -- CATEGORISATION NPS
    suivi_run_manager      VARCHAR(100),                 -- SUIVI DU RUN MANAGER
    plan_action_detail     TEXT,                         -- PLAN D'ACTION

    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nps_grafana  ON nps_retours(resolu_par_grafana);
CREATE INDEX idx_nps_gdi      ON nps_retours(agent_code_gdi);
CREATE INDEX idx_nps_date     ON nps_retours(date_retour_nps);
CREATE INDEX idx_nps_cat      ON nps_retours(categorie_nps);
CREATE INDEX idx_nps_equipe   ON nps_retours(equipe_ds);
CREATE INDEX idx_nps_ttr      ON nps_retours(etat_ttr);

-- TABLE 15 : nps_wm  ← SOURCE : Feuille W&M-DS.M-NPS de KPI_DS_Magasin.xlsx
-- NPS agrégé mensuel par équipe DS (FRONT OFFICE / BACK OFFICE / PROMOCASH / PROXIMITE)
CREATE TABLE nps_wm (
    id              SERIAL      PRIMARY KEY,
    equipe_ds_label VARCHAR(50) NOT NULL, -- FRONT OFFICE / BACK OFFICE / PROMOCASH / PROXIMITE / TOTAL
    equipe_ds_code  VARCHAR(20),           -- FO / BO / Promocash / Proximite
    mois            VARCHAR(20) NOT NULL,  -- Mai / Avril / Mars...
    annee           SMALLINT,
    mois_num        SMALLINT,

    -- Colonnes réelles W&M-DS.M-NPS : Promoteur / Neutre / Détracteur / NPS
    nb_promoteurs   INT  DEFAULT 0,
    nb_neutres      INT  DEFAULT 0,
    nb_detracteurs  INT  DEFAULT 0,
    nps_net         NUMERIC(7,3),          -- ((P - D) / total) * 100

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (equipe_ds_label, mois, annee)
);

-- TABLE 16 : nps_banette_hebdo  ← SOURCE : Feuille NPS-Banette de Suivi_KPI_NPS.xlsx
-- NPS hebdomadaire par bannette technique Grafana
CREATE TABLE nps_banette_hebdo (
    id              SERIAL       PRIMARY KEY,
    bannette_grafana VARCHAR(200) NOT NULL, -- ex: FR IT SIC N1_N2 SUPER-HYPER FRONT OFFICE
    equipe_ds       VARCHAR(20),
    semaine         VARCHAR(10)  NOT NULL,  -- S11, S17...
    mois_num        SMALLINT,
    annee           SMALLINT,

    nb_promoteurs   INT  DEFAULT 0,
    nb_neutres      INT  DEFAULT 0,
    nb_detracteurs  INT  DEFAULT 0,
    nps_banette     NUMERIC(7,3),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bannette_grafana, semaine, annee)
);


-- ============================================================
-- BASE : import_db
-- ============================================================
\connect import_db

-- TABLE 17 : import_history
CREATE TABLE import_history (
    id                    BIGSERIAL    PRIMARY KEY,
    nom_fichier           VARCHAR(500) NOT NULL,
    type_source           VARCHAR(30)  NOT NULL
                          CHECK (type_source IN (
                              'CSV_NPS',
                              'CSV_PRODUCTIVITE',
                              'EXCEL_KPI_DS_MAGASIN',
                              'EXCEL_SUIVI_KPI_NPS',
                              'FEUILLE_DIC',
                              'GRAFANA_AUTO',
                              'AGENTS_DICTIONARY'
                          )),
    type_import           VARCHAR(15)  NOT NULL DEFAULT 'MANUEL'
                          CHECK (type_import IN ('MANUEL','AUTOMATIQUE')),
    taille_octets         BIGINT,
    statut                VARCHAR(15)  NOT NULL DEFAULT 'EN_COURS'
                          CHECK (statut IN ('EN_COURS','SUCCES','ERREUR','PARTIEL')),

    -- Compteurs de traitement
    nb_lignes_lues        INT  DEFAULT 0,
    nb_lignes_inserees    INT  DEFAULT 0,
    nb_lignes_mises_a_jour INT DEFAULT 0,
    nb_lignes_ignorees    INT  DEFAULT 0,
    nb_erreurs            INT  DEFAULT 0,

    -- Stockage fichier
    minio_bucket          VARCHAR(100) DEFAULT 'kpi-imports',
    minio_object_key      VARCHAR(500),

    -- Détails erreurs et log
    erreur_detail         TEXT,
    log_traitement        JSONB,

    -- Traçabilité
    importe_par_user_id   UUID,
    date_debut            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    date_fin              TIMESTAMPTZ
);

CREATE INDEX idx_import_type   ON import_history(type_source);
CREATE INDEX idx_import_statut ON import_history(statut);
CREATE INDEX idx_import_date   ON import_history(date_debut DESC);
