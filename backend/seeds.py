"""Seed data for initial database population."""
import os
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger("nummer-eins")

SEED_CATEGORIES = [
    {"category_id": "troubleshooting", "name": "TROUBLESHOOTING", "description": "Fehlerbehebung und Problemloesung", "icon": "wrench", "color": "lcars-red"},
    {"category_id": "anleitung", "name": "ANLEITUNG", "description": "Schritt-fuer-Schritt Anleitungen", "icon": "book-open", "color": "lcars-orange"},
    {"category_id": "prozess", "name": "PROZESS", "description": "Standardprozesse und Workflows", "icon": "workflow", "color": "lcars-blue"},
    {"category_id": "konfiguration", "name": "KONFIGURATION", "description": "System- und Geraetekonfiguration", "icon": "settings", "color": "lcars-pink"},
    {"category_id": "aufzeichnung", "name": "AUFZEICHNUNG", "description": "Prozess-Aufzeichnung und Dokumentation", "icon": "video", "color": "lcars-tan"},
]

SEED_LOCATIONS = [
    {"location_id": "bruecke", "name": "Baumschulenstr. 24", "ship_section": "HAUPTBRUECKE", "deck": "Deck 1", "description": "Zentrale / Hauptstandort", "color": "#FF9900", "x": 680, "y": 72},
    {"location_id": "sterndamm", "name": "WG Sterndamm", "ship_section": "MANNSCHAFTSQUARTIERE", "deck": "Deck 4-8", "description": "Wohngruppe Sterndamm", "color": "#9999FF", "x": 560, "y": 140},
    {"location_id": "kupfer_gross", "name": "WG Kupferkessel gross", "ship_section": "MASCHINENRAUM", "deck": "Deck 36", "description": "Wohngruppe Kupferkessel gross", "color": "#CC6666", "x": 400, "y": 280},
    {"location_id": "kupfer_klein", "name": "WG Kupferkessel klein", "ship_section": "SHUTTLEHANGAR", "deck": "Deck 4", "description": "Wohngruppe Kupferkessel klein", "color": "#CC99CC", "x": 280, "y": 240},
    {"location_id": "drachenwiese", "name": "WG Drachenwiese", "ship_section": "KRANKENSTATION", "deck": "Deck 12", "description": "Wohngruppe Drachenwiese", "color": "#FFCC99", "x": 620, "y": 180},
    {"location_id": "drachenblick", "name": "WG Drachenblick", "ship_section": "ZEHN VORNE", "deck": "Deck 10", "description": "Wohngruppe Drachenblick", "color": "#FFFF99", "x": 780, "y": 150},
    {"location_id": "hebron", "name": "Haus Hebron", "ship_section": "FRACHTRAUM", "deck": "Deck 33", "description": "Haus Hebron", "color": "#9977AA", "x": 340, "y": 340},
    {"location_id": "aussentour", "name": "Aussentour", "ship_section": "AUSSENMISSION", "deck": "Shuttle", "description": "Aussentour / Mobiler Einsatz", "color": "#4455FF", "x": 120, "y": 350},
]


def _make_seed_articles():
    """Generate seed articles with unique IDs."""
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "article_id": str(uuid.uuid4()),
            "title": "Tool-Empfehlung: Step-Recorder-Tools",
            "summary": "Vergleich der besten Step-Recorder-Tools fuer automatische Prozess-Aufzeichnung",
            "content": """## Vergleich der besten Step-Recorder-Tools

### Scribe (Empfohlen)
- **Mac-Support:** Ja (Desktop App)
- **Windows-Support:** Ja
- **Desktop-Apps aufzeichnen:** Pro-Plan
- **Auto-Screenshots:** Ja
- **Auto-Textbeschreibung:** Inkl. Texteingaben
- **Export-Formate:** PDF, Markdown, HTML, Link
- **Preis:** 29 Euro/Monat

### Tango
- **Mac-Support:** Ja (Desktop App)
- **Windows-Support:** Ja
- **Auto-Screenshots:** Ja
- **Auto-Textbeschreibung:** Keine Texteingaben
- **Preis:** 20 Euro/Monat

### FlowShare
- **Mac-Support:** Nein
- **Windows-Support:** Ja
- **Sprache:** Deutsch
- **Preis:** 21 Euro/User

### Folge
- **Mac-Support:** Ja
- **Windows-Support:** Ja
- **Sprache:** Deutsch
- **Preis:** 89 Euro einmalig

### Empfehlung
**Scribe Pro Personal (29 Euro/Monat)** als Haupt-Tool: Funktioniert auf MacBook UND Windows Server, erfasst Texteingaben automatisch, und exportiert als Markdown.

**PLUS: Folge (89 Euro einmalig)** als Backup fuer Offline-Dokumentation und zusaetzliche Export-Formate.""",
            "category_id": "aufzeichnung",
            "tags": ["scribe", "tango", "flowshare", "folge", "tool"],
            "created_by": "captain-p",
            "created_at": now,
            "updated_at": now,
        },
        {
            "article_id": str(uuid.uuid4()),
            "title": "Setup MacBook: Scribe Desktop App",
            "summary": "Installation und Einrichtung von Scribe auf dem MacBook fuer direkte und RDP-Aufzeichnung",
            "content": """## MacBook Setup

### Szenario A: Direkt am Mac arbeiten
1. **Scribe Desktop App fuer Mac installieren** (von scribe.com herunterladen)
2. **Accessibility & Screen Recording Permissions** in macOS Systemeinstellungen freigeben
3. **Aufzeichnung starten:** Klick auf Scribe-Icon in der Menueleiste - Start Capture
4. **Arbeit erledigen:** iPad konfigurieren, Outlook-Problem loesen, etc.
5. **Stop Capture:** Scribe generiert automatisch eine Schritt-fuer-Schritt-Anleitung
6. **Nachbearbeiten:** Titel anpassen, sensible Daten unkenntlich machen, Notizen ergaenzen

### Szenario B: Ueber Windows App (RDP) auf den Server zugreifen
- Scribe Desktop App auf dem Mac erfasst auch den Inhalt der Windows App (RDP-Fenster)
- Qualitaet: Die Screenshots zeigen das RDP-Fenster - ausreichend fuer die meisten Anleitungen
- Limitation: Scribe erkennt innerhalb des RDP-Fensters keine einzelnen Klicks

### Praxis-Tipp fuer RDP-Sitzungen
Maximieren Sie die Windows App auf dem ganzen Bildschirm. Scribe erfasst dann saubere, vollfl aechige Screenshots des Windows-Desktops.""",
            "category_id": "anleitung",
            "tags": ["macbook", "scribe", "rdp", "setup"],
            "created_by": "captain-p",
            "created_at": now,
            "updated_at": now,
        },
        {
            "article_id": str(uuid.uuid4()),
            "title": "Setup Windows Server: Scribe Installation",
            "summary": "Scribe direkt auf dem Windows Server installieren fuer praezise Aufzeichnungen",
            "content": """## Windows Server Setup

### Option A: Scribe auf dem Windows Server installieren (Empfohlen)
1. **Scribe Desktop App** auf dem Windows Server installieren
2. **Mit Ihrem Scribe-Account anmelden** - alle Aufzeichnungen landen im gleichen Workspace
3. **Aufzeichnung starten:** Scribe-Icon im System-Tray - Start Capture
4. **Vorteil:** Scribe erkennt jetzt einzelne Klicks innerhalb von Medifox, AD etc.

### Option B: FlowShare auf dem Windows Server (Alternative)
- **Vorteil:** Deutschsprachig, laeuft komplett lokal, kein Cloud-Account noetig
- **Nachteil:** Nur Windows, Export als DOCX/PDF (kein Markdown)
- **Preis:** ab 21 Euro/Monat pro User""",
            "category_id": "konfiguration",
            "tags": ["windows", "server", "scribe", "flowshare"],
            "created_by": "captain-p",
            "created_at": now,
            "updated_at": now,
        },
        {
            "article_id": str(uuid.uuid4()),
            "title": "Pipeline: Automatische Uebernahme in Wissensdatenbank",
            "summary": "Workflow von Aufzeichnung bis zur automatischen Indizierung in der KI-Wissensdatenbank",
            "content": """## Automatische Pipeline

### Empfohlener Workflow
1. **Aufzeichnung machen** - Scribe Desktop App auf Mac oder Windows Server
2. **Nachbearbeiten** - In Scribe: Titel, Kategorie, sensible Daten entfernen
3. **Export nach SharePoint** - Scribe Export als PDF/HTML in SharePoint-Bibliothek ablegen
4. **Automatische Indizierung** - Azure AI Search Indexer erkennt neue Dokumente automatisch
5. **In Wissensdatenbank verfuegbar** - Ralf kann ueber KI-Chat sofort darauf zugreifen

### Automatisierung mit Power Automate
1. **Trigger:** Neue Datei wird in SharePoint-Ordner hochgeladen
2. **Aktion 1:** Metadaten aus Dateiname extrahieren (Kategorie, Datum)
3. **Aktion 2:** Datei in richtige Kategorie-Bibliothek verschieben
4. **Aktion 3:** Azure AI Search Indexer triggern
5. **Aktion 4:** Teams/E-Mail Benachrichtigung

### Benennungskonvention fuer Dateien
Schema: [KATEGORIE] - [Titel] - [Datum].pdf
- [TROUBLESHOOTING] - Outlook startet nicht - 2026-03-01.pdf
- [ANLEITUNG] - iPad Neukonfiguration mit Intune - 2026-03-01.pdf
- [PROZESS] - Medifox Benutzer anlegen - 2026-03-01.pdf""",
            "category_id": "prozess",
            "tags": ["pipeline", "sharepoint", "power-automate", "automatisierung"],
            "created_by": "captain-p",
            "created_at": now,
            "updated_at": now,
        },
        {
            "article_id": str(uuid.uuid4()),
            "title": "Kostenueberblick: Prozess-Aufzeichnung",
            "summary": "Monatliche und einmalige Kosten fuer das Aufzeichnungs-Setup",
            "content": """## Kostenueberblick

| Posten | Kosten | Anmerkung |
|--------|--------|-----------|
| **Scribe Pro Personal** | 29 Euro/Monat | Desktop-App fuer Mac + Windows |
| Folge (Optional) | 89 Euro einmalig | Offline, 7 Export-Formate |
| SharePoint Sync | 0 Euro | In M365 enthalten |
| Power Automate | 0 Euro | In M365 enthalten |
| Azure AI Search | Bereits budgetiert | Teil der Wissensdatenbank |
| **GESAMT (laufend)** | **ca. 29 Euro/Monat** | + 89 Euro einmalig optional |""",
            "category_id": "prozess",
            "tags": ["kosten", "budget", "scribe", "folge"],
            "created_by": "captain-p",
            "created_at": now,
            "updated_at": now,
        },
        {
            "article_id": str(uuid.uuid4()),
            "title": "Quick-Start: Heute noch loslegen",
            "summary": "In 30 Minuten startklar - die ersten Schritte zur automatischen Aufzeichnung",
            "content": """## Quick-Start Guide

### In 30 Minuten startklar

1. **Scribe-Account erstellen** unter scribe.com (kostenlos starten, spaeter auf Pro upgraden)
2. **Scribe Desktop App auf MacBook installieren** und Berechtigungen freigeben
3. **Scribe Desktop App auf Windows Server installieren** (gleicher Account)
4. **SharePoint-Bibliothek erstellen** - Wissensdatenbank-Input
5. **OneDrive-Sync aktivieren** auf Mac und Windows Server fuer diese Bibliothek
6. **Erste Test-Aufzeichnung machen** - ein einfacher Prozess (z.B. Passwort zuruecksetzen)
7. **Export in SharePoint-Ordner ablegen** - pruefen ob AI Search es findet

### Beispiel: Outlook-Problem loesen (am MacBook)
- 0:00 - Scribe starten (1 Klick)
- 0:01-10:00 - Problem diagnostizieren und loesen
- 10:00 - Scribe stoppen, Anleitung ist erstellt
- 10:01-12:00 - Titel anpassen, Export als PDF
- 12:01 - In SharePoint-Ordner speichern - FERTIG

**Zeitaufwand fuer Dokumentation: ca. 2 Minuten** statt 20-30 Minuten manuell.""",
            "category_id": "anleitung",
            "tags": ["quickstart", "einstieg", "scribe"],
            "created_by": "captain-p",
            "created_at": now,
            "updated_at": now,
        },
    ]


def _make_seed_tickets():
    """Generate seed tickets with unique IDs."""
    now = datetime.now(timezone.utc).isoformat()
    return [
        {"ticket_id": str(uuid.uuid4()), "title": "Drucker druckt nicht", "description": "HP LaserJet im Buero reagiert nicht auf Druckauftraege", "location_id": "bruecke", "priority": "high", "status": "offen", "created_by": "captain-p", "created_at": now},
        {"ticket_id": str(uuid.uuid4()), "title": "WLAN Verbindungsabbrueche", "description": "Bewohner berichten ueber haeufige WLAN-Abbrueche im 2. OG", "location_id": "sterndamm", "priority": "critical", "status": "offen", "created_by": "captain-p", "created_at": now},
        {"ticket_id": str(uuid.uuid4()), "title": "Medifox Update noetig", "description": "Neues Medifox Update 23.4 muss installiert werden", "location_id": "kupfer_gross", "priority": "normal", "status": "offen", "created_by": "captain-p", "created_at": now},
        {"ticket_id": str(uuid.uuid4()), "title": "iPad Neukonfiguration", "description": "3 neue iPads muessen mit Intune konfiguriert werden", "location_id": "drachenwiese", "priority": "normal", "status": "in_bearbeitung", "created_by": "captain-p", "created_at": now},
        {"ticket_id": str(uuid.uuid4()), "title": "Outlook Kalender sync", "description": "Kalender synchronisiert nicht mit Exchange", "location_id": "drachenblick", "priority": "high", "status": "offen", "created_by": "captain-p", "created_at": now},
    ]


async def seed_data(db, pwd_context):
    """Seed initial users, categories, articles, locations, and tickets if empty."""
    captain_password = os.environ.get("SEED_CAPTAIN_PASSWORD", "")
    nummer_eins_password = os.environ.get("SEED_NUMMER_EINS_PASSWORD", "")
    if not captain_password or not nummer_eins_password:
        raise RuntimeError("SEED_CAPTAIN_PASSWORD and SEED_NUMMER_EINS_PASSWORD must be set")

    user_count = await db.users.count_documents({})
    if user_count == 0:
        captain_hash = pwd_context.hash(captain_password)
        nummer_eins_hash = pwd_context.hash(nummer_eins_password)
        await db.users.insert_many([
            {
                "user_id": "captain-p",
                "username": "captain",
                "password_hash": captain_hash,
                "display_name": "Captain P",
                "role": "captain",
                "avatar": "captain",
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "user_id": "nummer-eins",
                "username": "nummer1",
                "password_hash": nummer_eins_hash,
                "display_name": "Nummer Eins",
                "role": "nummer_eins",
                "avatar": "nummer_eins",
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        ])
        logger.info("Seed users created")

    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many(SEED_CATEGORIES)
        logger.info("Seed categories created")

    if await db.articles.count_documents({}) == 0:
        await db.articles.insert_many(_make_seed_articles())
        logger.info("Seed articles created")

    if await db.locations.count_documents({}) == 0:
        await db.locations.insert_many(SEED_LOCATIONS)
        logger.info("Seed locations created")

    if await db.tickets.count_documents({}) == 0:
        await db.tickets.insert_many(_make_seed_tickets())
        logger.info("Seed tickets created")
