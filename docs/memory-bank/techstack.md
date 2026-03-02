# Enterprise LCARS — Tech Stack

## Frontend
- **React 19** + **Vite 6** (migriert von CRA)
- **Tailwind CSS 3** (LCARS Custom-Design)
- **react-router-dom 6** (SPA Routing)
- **react-markdown** (Artikel-Rendering)
- **lucide-react** (Icons)
- **Build:** `vite build` → `build/` Ordner
- **ENV:** `VITE_BACKEND_URL` (Build-Zeit, nicht Runtime!)

## Backend
- **Python 3.11** + **FastAPI 0.110+**
- **Motor** (async MongoDB Driver)
- **Anthropic SDK** (Claude Chat — ersetzt emergentintegrations)
- **OpenAI SDK** (Whisper Transkription — ersetzt emergentintegrations)
- **passlib + python-jose** (JWT Auth, bcrypt Hashing)
- **slowapi** (Rate Limiting: 60/min global, 5/min login)
- **python-json-logger** (Structured Logging)
- **PyMuPDF** (PDF-Parsing fuer Scribe-Import)
- **Runtime:** `uvicorn server:app --host 0.0.0.0 --port 8000`

## Datenbank
- **Cosmos DB for MongoDB vCore** (Free Tier)
- Cluster: `enterprise-lcars-db`
- MongoDB 7.0 kompatibel
- DB-Name: `lcars`
- Admin: `lcarsadmin`
- Collections: users, articles, categories, chat_history, chat_sessions, locations, tickets

## Container / Deployment
- **Backend Dockerfile:** `python:3.11-slim`, non-root (`appuser`), Port 8000
- **Frontend Dockerfile:** Multi-Stage (node:20-alpine builder → nginx:alpine), Port 80
- **nginx.conf:** 7 Security-Headers, SPA-Fallback, .map-Blocking, /health Endpoint
- **ACR:** `domusvitacontrollingprodacr.azurecr.io`
- **Images:** `enterprise-backend:v2`, `enterprise-frontend:v1`

## Auth-Modell
- JWT-basiert (kein Entra ID — eigenstaendige Auth)
- 2 Rollen: `captain` (Admin), `nummer-eins` (Standard)
- Seed-User werden beim ersten Start aus ENV-Variablen erstellt
- Token-Lifetime: 24h (konfigurierbar)

## Abhaengigkeiten (requirements.txt — 14 Direktabhaengigkeiten)
```
fastapi>=0.110.0, uvicorn>=0.25.0, motor>=3.3.0, pydantic>=2.0.0,
PyJWT>=2.8.0, passlib[bcrypt]>=1.7.4, python-jose>=3.3.0,
python-multipart>=0.0.22, python-dotenv>=1.0.0, anthropic>=0.52.0,
openai>=1.50.0, PyMuPDF>=1.25.0, slowapi>=0.1.9, python-json-logger>=2.0.7
```
KRITISCH: `bcrypt` muss auf `==4.0.1` gepinnt werden (passlib Inkompatibilitaet mit >=4.1.0)
