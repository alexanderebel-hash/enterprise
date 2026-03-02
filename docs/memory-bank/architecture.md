# Enterprise LCARS — Architektur

## Azure Infrastruktur

```
                    ┌─────────────────────────────────────┐
                    │  Ionos DNS (domusvita-portal.de)     │
                    │  enterprise → Frontend FQDN (CNAME)  │
                    │  enterprise-api → Backend FQDN       │
                    └──────────┬──────────┬────────────────┘
                               │          │
            ┌──────────────────▼──┐  ┌────▼─────────────────┐
            │ enterprise-frontend │  │ enterprise-backend    │
            │ -prod               │  │ -prod                 │
            │ (nginx:alpine)      │  │ (python:3.11-slim)    │
            │ Port 80             │  │ Port 8000             │
            │ 0.25 CPU / 0.5Gi   │  │ 0.5 CPU / 1Gi        │
            └─────────────────────┘  └──────────┬────────────┘
                                                │
                    ┌───────────────────────────▼──────────┐
                    │  Cosmos DB for MongoDB vCore          │
                    │  enterprise-lcars-db (Free Tier)      │
                    │  DB: lcars                            │
                    │  mongodb+srv://lcarsadmin@...         │
                    └─────────────────────────────────────┘
```

## Container App Environment
- **Environment:** `domusvita-controlling-prod-env` (greenrock-550f42b4, West Europe)
- **Resource Group:** `domusvita-controlling-prod`
- **Scale:** Min 0 / Max 1 (Scale-to-Zero)
- **Managed Identity:** System-Assigned auf beiden Apps (Key Vault + ACR Access)

## Key Vault Integration
- Vault: `domusvita-controlling-prod-kv`
- Secrets: enterprise-jwt-secret, enterprise-mongo-url, enterprise-captain-pw, enterprise-nummer-eins-pw
- RBAC: Key Vault Secrets User auf beiden Managed Identities

## Backend Architektur (server.py)

```
server.py (~3000 Zeilen, Monolith)
├── Lifespan Manager (DB-Connect, Seed Users, Graceful Shutdown)
├── Auth (JWT, passlib, 2 Rollen)
├── /api/auth/* (login, me)
├── /api/categories/* (CRUD)
├── /api/articles/* (CRUD + Import)
├── /api/chat (Claude AI Chat)
├── /api/chat/history, /api/chat/sessions
├── /api/transcribe (Whisper)
├── /api/locations/* (CRUD)
├── /api/tickets/* (CRUD)
├── /api/dashboard/stats
├── /api/stardate
├── /api/health
└── /api/articles/import (Scribe PDF/MD/HTML)
```

## Frontend Architektur

```
src/
├── index.jsx (Entry Point)
├── App.jsx (Router, AuthProvider)
├── AuthContext.jsx (JWT Token Management)
├── api.js (API Client, VITE_BACKEND_URL)
├── components/
│   ├── LCARSLayout.jsx (Haupt-Layout mit LCARS-Sidebar)
│   ├── Dashboard.jsx (Stardate, Stats)
│   ├── KnowledgeBase.jsx (Artikel-Liste + Editor)
│   ├── ArticleEditor.jsx (Markdown Editor)
│   ├── ComputerChat.jsx (KI-Chat Interface)
│   ├── EnterpriseMap.jsx (Schiff-Visualisierung)
│   ├── LoginPage.jsx (LCARS-Login)
│   └── SplashScreen.jsx (Boot-Animation)
├── pages/Welcome/index.jsx
└── routes/index.jsx
```

## API-Endpunkte

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| POST | /api/auth/login | Nein | Login (username+password → JWT) |
| GET | /api/auth/me | Ja | Aktueller User |
| GET | /api/categories | Nein | Kategorien auflisten |
| POST | /api/categories | Ja | Kategorie erstellen |
| GET | /api/articles | Nein | Artikel suchen (category, search) |
| GET | /api/articles/:id | Nein | Artikel Detail |
| POST | /api/articles | Ja | Artikel erstellen |
| PUT | /api/articles/:id | Ja | Artikel bearbeiten |
| DELETE | /api/articles/:id | Ja | Artikel loeschen |
| POST | /api/articles/import | Ja | Scribe PDF/MD/HTML Import |
| POST | /api/chat | Ja | Claude Chat (message + session_id) |
| GET | /api/chat/history | Ja | Chat-Verlauf |
| GET | /api/chat/sessions | Ja | Chat-Sessions |
| POST | /api/transcribe | Ja | Whisper Audio-Transkription |
| GET | /api/locations | Nein | Standorte |
| GET | /api/locations/:id | Nein | Standort Detail |
| GET | /api/tickets | Nein | Tickets (location_id, status) |
| POST | /api/tickets | Ja | Ticket erstellen |
| PUT | /api/tickets/:id | Ja | Ticket bearbeiten |
| DELETE | /api/tickets/:id | Ja | Ticket loeschen |
| GET | /api/dashboard/stats | Nein | Dashboard-Statistiken |
| GET | /api/stardate | Nein | Aktuelle Stardate |
| GET | /api/health | Nein | Health Check (inkl. DB Ping) |
