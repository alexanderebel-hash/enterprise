# PRD: Nummer Eins - LCARS Wissensdatenbank

## Original Problem Statement
Star Trek TNG LCARS-themed knowledge database and dashboard for IT knowledge capture. Captain P (senior IT admin) creates IT process documentation, Nummer Eins/Ralf (junior IT assistant) consumes it. AI-powered "Computer" chat answers questions from the knowledge base. German language interface.

## Architecture
- **Frontend:** React + Tailwind CSS + Vite 6 (LCARS Star Trek TNG theme)
- **Backend:** FastAPI (Python)
- **Database:** MongoDB (collections: users, articles, categories, chat_history, locations, tickets)
- **AI:** Claude Sonnet 4.5 via Emergent LLM Key (emergentintegrations library)

## User Personas
1. **Captain P** (Kommandant) - Senior IT admin, creates/edits knowledge articles
2. **Nummer Eins / Ralf** (Erster Offizier) - Junior IT assistant, reads articles, uses AI chat

## Core Requirements (Static)
- LCARS Star Trek TNG design system
- Role-based access (Captain = CRUD, Nummer Eins = Read)
- Knowledge base with categories, search, markdown articles
- AI-powered Computer Chat (RAG from knowledge base)
- Dashboard with statistics
- German language
- Mobile/tablet responsive

## What's Been Implemented (2026-03-01)
- [x] LCARS-themed login page with Captain P / Nummer Eins role selection
- [x] Full LCARS layout (sidebar with elbow connectors, header bar, footer)
- [x] Dashboard (BRUECKE) with stats, categories, recent articles
- [x] Knowledge Base (DATENBANK) with category filters, search, article detail view
- [x] Computer Chat (COMPUTER) with Claude Sonnet 4.5 AI integration
- [x] Article Editor (LOGBUCH) for Captain P only
- [x] Role-based access control (frontend + backend)
- [x] Seeded 6 articles about process recording tools (Scribe, Tango, FlowShare, etc.)
- [x] 5 categories: Troubleshooting, Anleitung, Prozess, Konfiguration, Aufzeichnung
- [x] **High-end Trikorder-Scan Splash Animation** with canvas-based radar sweep, particles, and scan readouts
- [x] **25 Star Trek TNG Zitate auf Deutsch** - rotating on login, dashboard, and splash screen
- [x] **TNG Sound Effects** - Web Audio API synthesized sounds: button press, navigation, computer ack, alert, data transmit, scan, logbuch fanfare, recording start/stop, startup
- [x] **Persoenlicher Logbucheintrag** - Voice recording with OpenAI Whisper transcription, auto-generates article with "Persoenlicher Logbucheintrag, [Name], Sternzeit [X]"
- [x] **Article Edit/Delete** from detail view (Captain only, with confirmation dialog)
- [x] **Chat Session History** - VERLAUF panel to browse and load previous chat sessions
- [x] **Stardate** calculation and display throughout the app
- [x] **Interactive Enterprise Map** - HD images for 3 views (Exterior, Cross-section, Bridge) with 8 real-world locations as ship sections
- [x] **Location Ticket System** - Create/manage technical issues per location, ticket priorities & statuses
- [x] **HD Enterprise Assets** - Seitenansicht, Querschnitt, Bruecke (normal/hotspot/red alert), Warp-Phasen images
- [x] **Blinking Hotspots** - Locations with open tickets pulse/glow, critical issues in red
- [x] **ROTER ALARM System** - Animated red alert banner on dashboard for critical tickets, with BESTAETIGT dismiss
- [x] **Taktische Anzeige (Tactical Radar)** - Animated canvas radar sweep showing all locations as dots (red=critical, orange=open, gray=ok)
- [x] **Standort-Status Live Feed** - Real-time overview of all locations with open tickets, auto-refresh every 30s
- [x] **Enhanced Dashboard Stats** - Shows total open tickets, alarm status (ROT/GRUEN), location count
- [x] **Interaktive Bruecken-Stationen** (2026-03-01) - 7 klickbare Hotspots auf der Bruecke: CONN, OPS, TAKTIK, TECHNIK, WISSENSCHAFT, KOMMANDOSESSEL, HAUPTBILDSCHIRM. Mit Hover-Effekten, LCARS-Glow, Labels-Toggle, und Detail-Modals (Funktion, Offizier, Beschreibung)
- [x] 100% test pass rate across all iterations (8 iterations)

## Production Changes (2026-03-01)
- [x] **CRA → Vite 6 Migration** - react-scripts entfernt, Vite 6 + @vitejs/plugin-react, alle .js → .jsx, REACT_APP_* → VITE_*, ~10x schnellerer Dev-Server
- [x] **Hardcoded Credentials → ENV** - SEED_CAPTAIN_PASSWORD und SEED_NUMMER_EINS_PASSWORD als Environment-Variablen
- [x] **Scribe-Import Feature** - POST /api/articles/import: Akzeptiert Markdown/PDF/HTML, Auto-Kategorisierung aus Dateiname [KATEGORIE]-Titel.ext, Claude-Summary, Auto-Tags. Frontend: Drag-and-Drop Upload-Zone im LOGBUCH

## Login Credentials
- Captain P: username `captain`, password `engage`
- Nummer Eins: username `nummer1`, password `makeitso`

## Prioritized Backlog
### P0 (Critical)
- emergentintegrations → direkte anthropic/openai SDKs (wartet auf API-Keys)

### P1 (High)
- Datei-/Bild-Upload fuer bestehende Artikel
- "Roter Alarm" Benachrichtigung bei neuen Artikeln

### P2 (Medium)
- Volltextsuche mit Hervorhebung
- Artikel-Lesezeichen fuer Nummer Eins
- Export Artikel als PDF

### Next Tasks
1. SDK-Migration (wenn API-Keys vorhanden)
2. Datei-Upload fuer Artikel
3. Artikel-Export als PDF
