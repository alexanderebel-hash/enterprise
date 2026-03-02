# Enterprise LCARS — Projektbeschreibung

## Vision
Star Trek TNG-themed IT-Wissensdatenbank fuer DomusVita. Die App dient als zentrales
IT-Wissensmanagement-Tool fuer die IT-Abteilung, mit einem LCARS-Interface im Stil
der USS Enterprise NCC-1701-D.

## Nutzer
- **Captain P** (Alexander Ebel) — IT-Leiter, Administrator
- **Nummer Eins / Ralf** — Junior IT, Hauptnutzer

## Kern-Features
1. **Wissensdatenbank** — Artikel mit Kategorien, Markdown-Editor, Volltextsuche
2. **KI-Chat (Computer)** — Claude-basierter Assistent im Enterprise-Computer-Stil
3. **Sprachnotizen (Logbuch)** — Whisper-Transkription fuer Audio-Eintraege
4. **Scribe-Import** — Automatisierte Prozessdokumentation (PDF/MD/HTML Import)
5. **Dashboard** — Statistiken mit Stardate-Anzeige
6. **Standorte + Tickets** — IT-Standort-Verwaltung + Ticket-System
7. **Enterprise-Map** — Visuelle Uebersicht

## Ursprung
Gebaut mit Emergent.ai (Code-Generator-Plattform), anschliessend Production-Ready
Integration fuer DomusVita Azure-Infrastruktur durch Claude Code (2026-03-02).

## Domain
- Frontend: `enterprise.domusvita-portal.de` (DNS ausstehend)
- Backend API: `enterprise-api.domusvita-portal.de` (DNS ausstehend)
- Interim: Container App FQDNs (greenrock-550f42b4)
