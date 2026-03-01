import os
import uuid
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt, JWTError
from passlib.context import CryptContext
from emergentintegrations.llm.chat import LlmChat, UserMessage

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
JWT_SECRET = os.environ.get("JWT_SECRET")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Models ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    user: dict

class ArticleCreate(BaseModel):
    title: str
    content: str
    category_id: str
    tags: List[str] = []
    summary: str = ""

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None
    summary: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "folder"
    color: str = "lcars-orange"

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

# --- DB ---
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def seed_data():
    """Seed initial users, categories, and articles if empty."""
    user_count = await db.users.count_documents({})
    if user_count == 0:
        captain_hash = pwd_context.hash("engage")
        nummer_eins_hash = pwd_context.hash("makeitso")
        await db.users.insert_many([
            {
                "user_id": "captain-p",
                "username": "captain",
                "password_hash": captain_hash,
                "display_name": "Captain P",
                "role": "captain",
                "avatar": "captain",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "user_id": "nummer-eins",
                "username": "nummer1",
                "password_hash": nummer_eins_hash,
                "display_name": "Nummer Eins",
                "role": "nummer_eins",
                "avatar": "nummer_eins",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ])

    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        categories = [
            {"category_id": "troubleshooting", "name": "TROUBLESHOOTING", "description": "Fehlerbehebung und Problemloesung", "icon": "wrench", "color": "lcars-red"},
            {"category_id": "anleitung", "name": "ANLEITUNG", "description": "Schritt-fuer-Schritt Anleitungen", "icon": "book-open", "color": "lcars-orange"},
            {"category_id": "prozess", "name": "PROZESS", "description": "Standardprozesse und Workflows", "icon": "workflow", "color": "lcars-blue"},
            {"category_id": "konfiguration", "name": "KONFIGURATION", "description": "System- und Geraetekonfiguration", "icon": "settings", "color": "lcars-pink"},
            {"category_id": "aufzeichnung", "name": "AUFZEICHNUNG", "description": "Prozess-Aufzeichnung und Dokumentation", "icon": "video", "color": "lcars-tan"},
        ]
        await db.categories.insert_many(categories)

    art_count = await db.articles.count_documents({})
    if art_count == 0:
        now = datetime.now(timezone.utc).isoformat()
        articles = [
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
                "updated_at": now
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
                "updated_at": now
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
                "updated_at": now
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
                "updated_at": now
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
                "updated_at": now
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
                "updated_at": now
            }
        ]
        await db.articles.insert_many(articles)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_data()
    yield

app = FastAPI(title="Nummer Eins - LCARS Wissensdatenbank", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth Helpers ---
def create_token(user_id: str, role: str):
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Nicht autorisiert")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Ungueltiger Token")

def require_captain(user: dict):
    if user.get("role") != "captain":
        raise HTTPException(status_code=403, detail="Nur Captain P hat Zugriff")

# --- Auth Endpoints ---
@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"username": req.username}, {"_id": 0})
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Ungueltige Anmeldedaten")
    token = create_token(user["user_id"], user["role"])
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

# --- Categories ---
@app.get("/api/categories")
async def get_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return cats

@app.post("/api/categories")
async def create_category(cat: CategoryCreate, user: dict = Depends(get_current_user)):
    require_captain(user)
    doc = {
        "category_id": str(uuid.uuid4()),
        "name": cat.name,
        "description": cat.description,
        "icon": cat.icon,
        "color": cat.color,
    }
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc

# --- Articles ---
@app.get("/api/articles")
async def get_articles(category: Optional[str] = None, search: Optional[str] = None, limit: int = 50):
    query = {}
    if category:
        query["category_id"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
            {"summary": {"$regex": search, "$options": "i"}},
        ]
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return articles

@app.get("/api/articles/{article_id}")
async def get_article(article_id: str):
    article = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    return article

@app.post("/api/articles")
async def create_article(art: ArticleCreate, user: dict = Depends(get_current_user)):
    require_captain(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "article_id": str(uuid.uuid4()),
        "title": art.title,
        "content": art.content,
        "summary": art.summary,
        "category_id": art.category_id,
        "tags": art.tags,
        "created_by": user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.articles.insert_one(doc)
    doc.pop("_id", None)
    return doc

@app.put("/api/articles/{article_id}")
async def update_article(article_id: str, art: ArticleUpdate, user: dict = Depends(get_current_user)):
    require_captain(user)
    existing = await db.articles.find_one({"article_id": article_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    updates = {k: v for k, v in art.dict().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.articles.update_one({"article_id": article_id}, {"$set": updates})
    updated = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    return updated

@app.delete("/api/articles/{article_id}")
async def delete_article(article_id: str, user: dict = Depends(get_current_user)):
    require_captain(user)
    result = await db.articles.delete_one({"article_id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    return {"message": "Artikel geloescht"}

# --- Dashboard ---
@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    total_articles = await db.articles.count_documents({})
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    cat_stats = []
    for cat in categories:
        count = await db.articles.count_documents({"category_id": cat["category_id"]})
        cat_stats.append({"category_id": cat["category_id"], "name": cat["name"], "count": count, "color": cat.get("color", "lcars-orange")})
    recent = await db.articles.find({}, {"_id": 0, "content": 0}).sort("created_at", -1).to_list(5)
    return {
        "total_articles": total_articles,
        "total_categories": len(categories),
        "category_stats": cat_stats,
        "recent_articles": recent,
    }

# --- AI Computer Chat ---
@app.post("/api/chat")
async def chat_with_computer(msg: ChatMessage, user: dict = Depends(get_current_user)):
    # Gather knowledge base context
    articles = await db.articles.find({}, {"_id": 0, "title": 1, "content": 1, "summary": 1, "category_id": 1, "tags": 1}).to_list(100)
    knowledge_context = "\n\n---\n\n".join([
        f"TITEL: {a['title']}\nKATEGORIE: {a.get('category_id','')}\nTAGS: {', '.join(a.get('tags',[]))}\nZUSAMMENFASSUNG: {a.get('summary','')}\nINHALT:\n{a['content']}"
        for a in articles
    ])

    system_message = f"""Du bist der Bordcomputer der USS Enterprise NCC-1701-D.
Du antwortest auf Deutsch in einem professionellen aber freundlichen Starfleet-Stil.
Du hast Zugriff auf die Wissensdatenbank des Schiffes mit IT-Anleitungen und Prozessen.
Beantworte Fragen basierend auf dem folgenden Wissen. Wenn du keine passende Information findest, sage das ehrlich.
Beginne deine Antworten NICHT mit 'Computer hier' oder aehnlichem - antworte direkt und hilfreich.

=== WISSENSDATENBANK ===
{knowledge_context}
=== ENDE WISSENSDATENBANK ==="""

    session_id = msg.session_id or f"chat-{user['user_id']}-{str(uuid.uuid4())[:8]}"

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"lcars-{session_id}-{str(uuid.uuid4())[:8]}",
            system_message=system_message,
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")

        # Load previous messages for context
        history = await db.chat_history.find(
            {"session_id": session_id, "user_id": user["user_id"]}
        ).sort("created_at", 1).to_list(20)

        for h in history:
            if h.get("role") == "user":
                await chat.send_message(UserMessage(text=h["content"]))

        user_message = UserMessage(text=msg.message)
        response = await chat.send_message(user_message)

        now = datetime.now(timezone.utc).isoformat()
        await db.chat_history.insert_many([
            {"session_id": session_id, "user_id": user["user_id"], "role": "user", "content": msg.message, "created_at": now},
            {"session_id": session_id, "user_id": user["user_id"], "role": "computer", "content": response, "created_at": now},
        ])

        return {"response": response, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computer-Fehler: {str(e)}")

@app.get("/api/chat/history")
async def get_chat_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["user_id"]}
    if session_id:
        query["session_id"] = session_id
    messages = await db.chat_history.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
    return messages

@app.get("/api/chat/sessions")
async def get_chat_sessions(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user["user_id"]}},
        {"$group": {"_id": "$session_id", "last_message": {"$last": "$content"}, "created_at": {"$first": "$created_at"}, "count": {"$sum": 1}}},
        {"$sort": {"created_at": -1}},
        {"$limit": 20}
    ]
    sessions = await db.chat_history.aggregate(pipeline).to_list(20)
    return [{"session_id": s["_id"], "last_message": s["last_message"], "created_at": s["created_at"], "message_count": s["count"]} for s in sessions]

@app.get("/api/health")
async def health():
    return {"status": "online", "stardate": datetime.now(timezone.utc).isoformat(), "ship": "USS Enterprise NCC-1701-D"}
