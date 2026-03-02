import os
import re
import uuid
import logging
import tempfile
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from html.parser import HTMLParser

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt, JWTError
from passlib.context import CryptContext
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from pythonjsonlogger import jsonlogger
from seeds import seed_data

# --- Sentry (optional — only if SENTRY_DSN is set) ---
SENTRY_DSN = os.environ.get("SENTRY_DSN")
if SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=os.environ.get("ENVIRONMENT", "production"),
    )

# --- Structured Logging ---
handler = logging.StreamHandler()
handler.setFormatter(jsonlogger.JsonFormatter(
    fmt="%(asctime)s %(name)s %(levelname)s %(message)s"
))
logging.root.handlers = [handler]
logging.root.setLevel(logging.INFO)
logger = logging.getLogger("nummer-eins")

# --- ENV vars ---
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "lcars")
JWT_SECRET = os.environ.get("JWT_SECRET")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# --- Startup Validation ---
if not JWT_SECRET or len(JWT_SECRET) < 16:
    raise RuntimeError("JWT_SECRET must be set (min 16 chars)")
if not MONGO_URL:
    raise RuntimeError("MONGO_URL must be set")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- AI Clients (with timeouts) ---
anthropic_client = AsyncAnthropic(
    api_key=ANTHROPIC_API_KEY,
    timeout=60.0,
    max_retries=2,
)
openai_client = AsyncOpenAI(
    api_key=OPENAI_API_KEY,
    timeout=120.0,
    max_retries=2,
)

# --- Rate Limiter ---
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# --- Models ---
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)

class TokenResponse(BaseModel):
    token: str
    user: dict

class ArticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1, max_length=500_000)
    category_id: str = Field(..., max_length=50)
    tags: List[str] = []
    summary: str = Field(default="", max_length=2000)

class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=500)
    content: Optional[str] = Field(default=None, max_length=500_000)
    category_id: Optional[str] = Field(default=None, max_length=50)
    tags: Optional[List[str]] = None
    summary: Optional[str] = Field(default=None, max_length=2000)

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    icon: str = Field(default="folder", max_length=50)
    color: str = Field(default="lcars-orange", max_length=50)

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=10_000)
    session_id: Optional[str] = Field(default=None, max_length=100)

VALID_PRIORITIES = {"low", "normal", "high", "critical"}
VALID_STATUSES = {"offen", "in_bearbeitung", "erledigt"}

class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    location_id: str = Field(..., max_length=50)
    priority: str = Field(default="normal", max_length=20)
    status: str = Field(default="offen", max_length=20)

class TicketUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    priority: Optional[str] = Field(default=None, max_length=20)
    status: Optional[str] = Field(default=None, max_length=20)

# --- DB ---
mongo_client = AsyncIOMotorClient(
    MONGO_URL,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    retryWrites=True,
    maxPoolSize=10,
    minPoolSize=1,
)
db = mongo_client[DB_NAME]

# --- Lifespan (Graceful Startup + Shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Nummer Eins API starting up")
    # Create indexes for performance
    await db.users.create_index("username", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.articles.create_index("article_id", unique=True)
    await db.articles.create_index("category_id")
    await db.articles.create_index([("created_at", -1)])
    await db.tickets.create_index("ticket_id", unique=True)
    await db.tickets.create_index("location_id")
    await db.chat_history.create_index([("session_id", 1), ("user_id", 1), ("created_at", 1)])
    await db.chat_history.create_index("created_at", expireAfterSeconds=90 * 24 * 3600)  # 90-day TTL
    await db.categories.create_index("category_id", unique=True)
    # Text index for RAG search
    try:
        await db.articles.create_index(
            [("title", "text"), ("summary", "text"), ("content", "text"), ("tags", "text")],
            default_language="german",
            name="articles_text_search",
        )
    except Exception:
        logger.info("Text index already exists or not supported, skipping")
    logger.info("Database indexes ensured")
    await seed_data(db, pwd_context)
    logger.info("Seed data check complete")
    yield
    logger.info("Nummer Eins API shutting down")
    mongo_client.close()
    await anthropic_client.close()
    await openai_client.close()
    logger.info("All clients closed")

app = FastAPI(title="Nummer Eins - LCARS Wissensdatenbank", lifespan=lifespan)

# --- Rate Limiter Middleware ---
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Zu viele Anfragen. Bitte warten Sie einen Moment."}
    )

# --- CORS (restricted to FRONTEND_URL) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# --- Auth Helpers ---
def create_token(user_id: str, role: str):
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
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
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest):
    user = await db.users.find_one({"username": req.username}, {"_id": 0})
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Ungueltige Anmeldedaten")
    token = create_token(user["user_id"], user["role"])
    logger.info("User logged in", extra={"user_id": user["user_id"]})
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
        safe_search = re.escape(search)
        query["$or"] = [
            {"title": {"$regex": safe_search, "$options": "i"}},
            {"content": {"$regex": safe_search, "$options": "i"}},
            {"tags": {"$regex": safe_search, "$options": "i"}},
            {"summary": {"$regex": safe_search, "$options": "i"}},
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
    return JSONResponse(content=doc, status_code=201)

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

# --- Scribe-Import Feature ---
async def generate_summary(content: str, max_chars: int = 500) -> str:
    """Generate a short summary of article content using Claude."""
    try:
        response = await anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": f"Fasse folgenden IT-Artikel in 1-2 Saetzen auf Deutsch zusammen:\n\n{content[:3000]}"
            }]
        )
        return response.content[0].text[:max_chars]
    except Exception as e:
        logger.warning("Summary generation failed", extra={"error": str(e)})
        return ""


class _HTMLTextExtractor(HTMLParser):
    """Simple HTML to plain text extractor."""
    def __init__(self):
        super().__init__()
        self._result = []

    def handle_data(self, data):
        self._result.append(data)

    def get_text(self):
        return "".join(self._result)


@app.post("/api/articles/import")
async def import_article(
    request: Request,
    file: UploadFile = File(...),
    category_id: str = Form("anleitung"),
    tags: str = Form(""),
    user: dict = Depends(get_current_user),
):
    """Import article from Scribe export (Markdown, PDF, or HTML)."""
    require_captain(user)

    filename = file.filename or "upload"
    content_bytes = await file.read()

    # Max 25MB
    if len(content_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Datei zu gross (max 25MB)")

    # Parse based on file type
    if filename.lower().endswith(".md"):
        content = content_bytes.decode("utf-8")
        title = content.split("\n")[0].lstrip("# ").strip() or filename
    elif filename.lower().endswith(".pdf"):
        import fitz  # PyMuPDF
        doc = fitz.open(stream=content_bytes, filetype="pdf")
        pages_text = [page.get_text() for page in doc]
        content = "\n\n---\n\n".join(pages_text)
        title = doc.metadata.get("title") or filename.replace(".pdf", "")
        doc.close()
    elif filename.lower().endswith(".html") or filename.lower().endswith(".htm"):
        raw_html = content_bytes.decode("utf-8")
        extractor = _HTMLTextExtractor()
        extractor.feed(raw_html)
        content = extractor.get_text()
        title = filename.rsplit(".", 1)[0]
    else:
        raise HTTPException(status_code=400, detail="Nur .md, .pdf, .html Dateien erlaubt")

    # Auto-categorize from filename convention: [KATEGORIE] - Titel - Datum.ext
    if filename.startswith("[") and "]" in filename:
        cat = filename.split("]")[0].lstrip("[").strip().lower()
        valid_cats = ["troubleshooting", "anleitung", "prozess", "konfiguration", "aufzeichnung"]
        if cat in valid_cats:
            category_id = cat
        # Extract title from filename
        parts = filename.split("]", 1)[1].rsplit(".", 1)[0]  # Remove extension
        parts = parts.strip(" -")
        if " - " in parts:
            title = parts.rsplit(" - ", 1)[0].strip()  # Remove date suffix

    # Create summary with Claude
    summary = await generate_summary(content)

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else ["scribe-import"]

    article = {
        "article_id": str(uuid.uuid4()),
        "title": title,
        "content": content,
        "summary": summary,
        "category_id": category_id,
        "tags": tag_list,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "import",
        "source_filename": filename,
    }

    await db.articles.insert_one(article)
    article.pop("_id", None)
    logger.info("Article imported", extra={"title": title, "source_filename": filename, "user_id": user["user_id"]})
    return article

# --- Dashboard ---
@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    # Single aggregation instead of N+1 queries
    cat_counts = await db.articles.aggregate([
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
    ]).to_list(100)
    count_map = {c["_id"]: c["count"] for c in cat_counts}
    total_articles = sum(count_map.values())

    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    cat_stats = [
        {
            "category_id": cat["category_id"],
            "name": cat["name"],
            "count": count_map.get(cat["category_id"], 0),
            "color": cat.get("color", "lcars-orange"),
        }
        for cat in categories
    ]
    recent = await db.articles.find({}, {"_id": 0, "content": 0}).sort("created_at", -1).to_list(5)
    return {
        "total_articles": total_articles,
        "total_categories": len(categories),
        "category_stats": cat_stats,
        "recent_articles": recent,
    }

# --- AI Computer Chat (RAG — only relevant articles) ---
async def search_relevant_articles(query: str, max_results: int = 5) -> list:
    """Search for articles relevant to the user query using text search with regex fallback."""
    projection = {"_id": 0, "title": 1, "content": 1, "summary": 1, "category_id": 1, "tags": 1}

    # Try MongoDB text search first
    try:
        articles = await db.articles.find(
            {"$text": {"$search": query}},
            {**projection, "score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"})]).to_list(max_results)
        if articles:
            return articles
    except Exception:
        pass  # Text index may not exist on this DB version

    # Fallback: regex search on key fields
    safe_query = re.escape(query)
    words = [w for w in safe_query.split() if len(w) > 2]
    if not words:
        words = [safe_query]
    regex_pattern = "|".join(words[:5])  # Max 5 terms
    articles = await db.articles.find(
        {"$or": [
            {"title": {"$regex": regex_pattern, "$options": "i"}},
            {"summary": {"$regex": regex_pattern, "$options": "i"}},
            {"tags": {"$regex": regex_pattern, "$options": "i"}},
        ]},
        projection,
    ).to_list(max_results)

    # If still no matches, return most recent articles as general context
    if not articles:
        articles = await db.articles.find({}, projection).sort("created_at", -1).to_list(max_results)

    return articles


@app.post("/api/chat")
async def chat_with_computer(msg: ChatMessage, user: dict = Depends(get_current_user)):
    # RAG: Search only relevant articles instead of loading all
    articles = await search_relevant_articles(msg.message, max_results=5)
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
        # Load previous messages for context
        history = await db.chat_history.find(
            {"session_id": session_id, "user_id": user["user_id"]}
        ).sort("created_at", 1).to_list(20)

        # Build messages array for Anthropic API
        messages = []
        for h in history:
            role = "user" if h.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": h["content"]})

        # Add the new user message
        messages.append({"role": "user", "content": msg.message})

        response = await anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=4096,
            system=system_message,
            messages=messages,
        )
        answer = response.content[0].text

        now = datetime.now(timezone.utc).isoformat()
        await db.chat_history.insert_many([
            {"session_id": session_id, "user_id": user["user_id"], "role": "user", "content": msg.message, "created_at": now},
            {"session_id": session_id, "user_id": user["user_id"], "role": "computer", "content": answer, "created_at": now},
        ])

        return {"response": answer, "session_id": session_id}
    except Exception as e:
        logger.error("Chat error", extra={"error": str(e), "user_id": user["user_id"]})
        raise HTTPException(status_code=500, detail="Interner Serverfehler. Bitte spaeter erneut versuchen.")

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

# --- Betroffenenrechte (DSGVO Art. 15-17, 20) ---
@app.get("/api/user/data-export")
async def export_user_data(user: dict = Depends(get_current_user)):
    """DSGVO Art. 15/20: Auskunft und Datenportabilitaet."""
    user_data = await db.users.find_one(
        {"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0}
    )
    chat_messages = await db.chat_history.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(10000)
    articles_created = await db.articles.find(
        {"created_by": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    tickets_created = await db.tickets.find(
        {"created_by": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)

    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user_profile": user_data,
        "chat_history": chat_messages,
        "articles_created": articles_created,
        "tickets_created": tickets_created,
    }

@app.delete("/api/chat/session/{session_id}")
async def delete_chat_session(session_id: str, user: dict = Depends(get_current_user)):
    """DSGVO Art. 17: Einzelne Chat-Sitzung loeschen."""
    result = await db.chat_history.delete_many(
        {"session_id": session_id, "user_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sitzung nicht gefunden")
    logger.info("Chat session deleted", extra={"session_id": session_id, "user_id": user["user_id"]})
    return {"message": "Sitzung geloescht", "deleted_messages": result.deleted_count}

@app.delete("/api/chat/all")
async def delete_all_chat_history(user: dict = Depends(get_current_user)):
    """DSGVO Art. 17: Alle Chat-Daten des Users loeschen."""
    result = await db.chat_history.delete_many({"user_id": user["user_id"]})
    logger.info("All chat history deleted", extra={"user_id": user["user_id"], "deleted": result.deleted_count})
    return {"message": "Alle Chat-Daten geloescht", "deleted_messages": result.deleted_count}

# --- Health Endpoint (with DB check) ---
@app.get("/api/health")
async def health_check():
    try:
        await db.command("ping")
        db_status = "healthy"
    except Exception as e:
        logger.error("DB health check failed", extra={"error": str(e)})
        db_status = "unhealthy"
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "module": "nummer-eins",
        "stardate": datetime.now(timezone.utc).isoformat(),
        "ship": "USS Enterprise NCC-1701-D",
    }

# --- Locations & Tickets (Enterprise Map) ---
@app.get("/api/locations")
async def get_locations():
    locations = await db.locations.find({}, {"_id": 0}).to_list(50)
    # Single aggregation for ticket counts (instead of N+1 queries)
    ticket_stats = await db.tickets.aggregate([
        {"$match": {"status": {"$in": ["offen", "in_bearbeitung"]}}},
        {"$group": {
            "_id": "$location_id",
            "open_tickets": {"$sum": 1},
            "critical_tickets": {"$sum": {"$cond": [
                {"$and": [
                    {"$eq": ["$status", "offen"]},
                    {"$in": ["$priority", ["high", "critical"]]},
                ]},
                1, 0,
            ]}},
        }},
    ]).to_list(50)
    stats_map = {s["_id"]: s for s in ticket_stats}
    for loc in locations:
        s = stats_map.get(loc["location_id"], {})
        loc["open_tickets"] = s.get("open_tickets", 0)
        loc["critical_tickets"] = s.get("critical_tickets", 0)
    return locations

@app.get("/api/locations/{location_id}")
async def get_location(location_id: str):
    loc = await db.locations.find_one({"location_id": location_id}, {"_id": 0})
    if not loc:
        raise HTTPException(status_code=404, detail="Standort nicht gefunden")
    tickets = await db.tickets.find({"location_id": location_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    loc["tickets"] = tickets
    return loc

@app.get("/api/tickets")
async def get_tickets(location_id: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if location_id:
        query["location_id"] = location_id
    if status:
        query["status"] = status
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tickets

@app.post("/api/tickets")
async def create_ticket(ticket: TicketCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "ticket_id": str(uuid.uuid4()),
        "title": ticket.title,
        "description": ticket.description,
        "location_id": ticket.location_id,
        "priority": ticket.priority,
        "status": ticket.status,
        "created_by": user["user_id"],
        "created_at": now,
    }
    await db.tickets.insert_one(doc)
    doc.pop("_id", None)
    return doc

@app.put("/api/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, ticket: TicketUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in ticket.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Aenderungen")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
    updated = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    return updated

@app.delete("/api/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    require_captain(user)
    result = await db.tickets.delete_one({"ticket_id": ticket_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket nicht gefunden")
    return {"message": "Ticket geloescht"}

# --- Scribe Import ---
VALID_CATEGORIES = ["troubleshooting", "anleitung", "prozess", "konfiguration", "aufzeichnung"]

def parse_filename(filename: str):
    """Parse [KATEGORIE] - Titel - Datum.ext pattern from filename."""
    name = os.path.splitext(filename)[0]
    # Try pattern: [KATEGORIE] - Titel - Datum
    match = re.match(r'\[([^\]]+)\]\s*-\s*(.+?)(?:\s*-\s*(\d{4}[-_.]\d{2}[-_.]\d{2}))?\s*$', name)
    if match:
        raw_cat = match.group(1).strip().lower()
        title = match.group(2).strip()
        category = raw_cat if raw_cat in VALID_CATEGORIES else None
        return {"title": title, "category_id": category}
    # Try pattern: KATEGORIE - Titel
    match = re.match(r'(\w+)\s*-\s*(.+)$', name)
    if match:
        raw_cat = match.group(1).strip().lower()
        title = match.group(2).strip()
        if raw_cat in VALID_CATEGORIES:
            return {"title": title, "category_id": raw_cat}
    return {"title": name, "category_id": None}

def extract_file_content(content: bytes, filename: str) -> str:
    """Extract text content from uploaded file based on extension."""
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.md', '.txt', '.markdown']:
        return content.decode('utf-8', errors='replace')
    elif ext in ['.html', '.htm']:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content.decode('utf-8', errors='replace'), 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'header', 'footer']):
            tag.decompose()
        return soup.get_text(separator='\n', strip=True)
    elif ext == '.pdf':
        import pymupdf
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            doc = pymupdf.open(tmp_path)
            text = '\n\n'.join(page.get_text() for page in doc)
            doc.close()
            return text
        finally:
            os.unlink(tmp_path)
    raise ValueError(f"Nicht unterstuetztes Format: {ext}")

@app.post("/api/articles/import-batch")
async def import_articles_batch(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Import a ZIP file containing multiple documents as knowledge articles."""
    require_captain(user)

    if not file.filename or not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="Nur ZIP-Dateien erlaubt")

    content_bytes = await file.read()
    if len(content_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="ZIP zu gross (max 50MB)")

    import zipfile
    import io

    allowed_ext = {'.md', '.txt', '.markdown', '.html', '.htm', '.pdf'}
    results = {"imported": [], "skipped": [], "errors": []}

    try:
        with zipfile.ZipFile(io.BytesIO(content_bytes)) as zf:
            for entry in zf.namelist():
                # Skip directories and hidden/system files
                if entry.endswith('/') or '/__MACOSX/' in entry or entry.startswith('__MACOSX'):
                    continue
                basename = os.path.basename(entry)
                if not basename or basename.startswith('.'):
                    continue
                ext = os.path.splitext(basename)[1].lower()
                if ext not in allowed_ext:
                    results["skipped"].append({"file": basename, "reason": f"Format nicht unterstuetzt: {ext}"})
                    continue

                try:
                    file_bytes = zf.read(entry)
                    text_content = extract_file_content(file_bytes, basename)
                    if not text_content.strip():
                        results["skipped"].append({"file": basename, "reason": "Kein Textinhalt"})
                        continue

                    parsed = parse_filename(basename)
                    title = parsed["title"]
                    category_id = parsed["category_id"] or "anleitung"

                    # Generate summary via Claude
                    summary = await generate_summary(text_content)
                    if not summary:
                        summary = f"(Auto-Import aus {basename})"

                    # Auto-detect tags
                    tag_keywords = {
                        "windows": "windows", "linux": "linux", "macos": "macos", "mac": "macos",
                        "drucker": "drucker", "netzwerk": "netzwerk", "wlan": "wlan", "wifi": "wlan",
                        "email": "email", "outlook": "outlook", "exchange": "exchange",
                        "vpn": "vpn", "firewall": "firewall", "backup": "backup",
                        "intune": "intune", "medifox": "medifox", "ipad": "ipad",
                    }
                    text_lower = text_content.lower()
                    tags = list(set(v for k, v in tag_keywords.items() if k in text_lower))

                    now = datetime.now(timezone.utc).isoformat()
                    doc = {
                        "article_id": str(uuid.uuid4()),
                        "title": title,
                        "content": text_content,
                        "summary": summary,
                        "category_id": category_id,
                        "tags": tags,
                        "created_by": user["user_id"],
                        "created_at": now,
                        "updated_at": now,
                        "imported_from": basename,
                    }
                    await db.articles.insert_one(doc)
                    doc.pop("_id", None)
                    results["imported"].append({"file": basename, "title": title, "category": category_id, "article_id": doc["article_id"]})
                except Exception as e:
                    logger.warning("Batch import file error", extra={"file": basename, "error": str(e)})
                    results["errors"].append({"file": basename, "error": "Importfehler bei dieser Datei"})

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Ungueltige ZIP-Datei")

    return {
        "total_files": len(results["imported"]) + len(results["skipped"]) + len(results["errors"]),
        "imported_count": len(results["imported"]),
        "skipped_count": len(results["skipped"]),
        "error_count": len(results["errors"]),
        "results": results,
    }

# --- Whisper Speech-to-Text ---
@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Transcribe audio using OpenAI Whisper - for Captain's Log voice entries."""
    if file.content_type and not any(t in file.content_type for t in ["audio", "video/webm"]):
        raise HTTPException(status_code=400, detail=f"Nicht unterstuetztes Audio-Format: {file.content_type}")

    try:
        content = await file.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Datei zu gross (max 25MB)")

        # Write to temp file
        suffix = ".webm"
        if file.filename:
            suffix = "." + file.filename.split(".")[-1] if "." in file.filename else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            with open(tmp_path, "rb") as audio_file:
                response = await openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="json",
                    language="de",
                    prompt="Persoenlicher Logbucheintrag. IT-Dokumentation, Wissensdatenbank, Anleitung, Troubleshooting."
                )
        finally:
            os.unlink(tmp_path)

        return {"text": response.text, "status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Transcription error", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Transkriptionsfehler. Bitte spaeter erneut versuchen.")

# --- Stardate calculator ---
@app.get("/api/stardate")
async def get_stardate():
    """Calculate a TNG-style stardate."""
    now = datetime.now(timezone.utc)
    # TNG stardate formula: based on year
    year_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    year_progress = (now - year_start).total_seconds() / (365.25 * 24 * 3600)
    stardate = 41000 + (now.year - 2023) * 1000 + year_progress * 1000
    return {"stardate": f"{stardate:.1f}", "earth_date": now.isoformat()}
