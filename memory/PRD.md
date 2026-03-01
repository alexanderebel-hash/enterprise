# PRD: Nummer Eins - LCARS Wissensdatenbank

## Original Problem Statement
Star Trek TNG LCARS-themed knowledge database and dashboard for IT knowledge capture. Captain P (senior IT admin) creates IT process documentation, Nummer Eins/Ralf (junior IT assistant) consumes it. AI-powered "Computer" chat answers questions from the knowledge base. German language interface.

## Architecture
- **Frontend:** React + Tailwind CSS (LCARS Star Trek TNG theme)
- **Backend:** FastAPI (Python)
- **Database:** MongoDB (collections: users, articles, categories, chat_history)
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
- [x] 100% test pass rate across all iterations

## Login Credentials
- Captain P: username `captain`, password `engage`
- Nummer Eins: username `nummer1`, password `makeitso`

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (High)
- Article editing from article detail view
- Article deletion confirmation dialog
- File/image upload for articles
- Chat session history and session switching

### P2 (Medium)
- Full-text search with highlighting
- Article bookmarking for Nummer Eins
- Export articles as PDF
- User profile/settings page
- Dark/light theme toggle
- Sound effects (TNG beeps on button clicks)

### Next Tasks
1. Add edit/delete buttons to article detail view
2. Implement chat session persistence and history browsing
3. Add file upload capability for articles
4. Implement notification system for new articles
