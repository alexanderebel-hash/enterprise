# Enterprise LCARS — Fortschritt

## Status: LIVE (Stand: 2026-03-02)

### Erledigt
- [x] Emergent.ai Code-Generator Output uebernommen
- [x] CRA → Vite 6 Migration (index.jsx, vite.config.js, ENV-Prefix)
- [x] emergentintegrations SDK → Anthropic SDK + OpenAI SDK direkt
- [x] Security-Hardening (slowapi Rate Limiting, structured logging, non-root Docker)
- [x] passlib/bcrypt Fix (bcrypt==4.0.1 gepinnt)
- [x] Git Rebase-Konflikte geloest (7 Dateien, Emergent hatte parallel eigene Vite-Migration)
- [x] ACR Build: enterprise-backend:v2 + enterprise-frontend:v1
- [x] Cosmos DB for MongoDB vCore (Free Tier) erstellt + konfiguriert
- [x] Key Vault Secrets erstellt (JWT, Mongo URL, Captain PW, Nummer-Eins PW)
- [x] Container Apps deployed (enterprise-backend-prod + enterprise-frontend-prod)
- [x] Managed Identity + AcrPull + Key Vault RBAC konfiguriert
- [x] Health Endpoints verifiziert (Backend + Frontend)
- [x] Memory Bank erstellt

### Offen
- [ ] DNS-Eintraege bei Ionos (enterprise.domusvita-portal.de + enterprise-api.domusvita-portal.de)
- [ ] Custom Domain Binding auf Container Apps + Managed TLS
- [ ] Frontend Rebuild mit Custom Domain Backend-URL (VITE_BACKEND_URL)
- [ ] Gateway-Integration evaluieren (eigene Subdomain vs. Gateway-Pfad)
- [ ] server.py Modularisierung (~3000 Zeilen Monolith → Router-Module)
- [ ] Sentry Integration (Frontend + Backend)
- [ ] CI/CD Pipeline (GitHub Actions)
- [ ] Trivy Image Scanning
- [ ] DSGVO: Datenschutzerklaerung-Seite im Frontend
- [ ] DSGVO: Betroffenenrechte-Endpoints
- [ ] DSGVO: Cleanup/Retention Policy fuer Chat-History

### Bekannte Probleme
- DNS-Propagierung ausstehend (Ionos DNS-Records muessen geprueft werden)
- Interim-Zugriff ueber Container App FQDNs (greenrock-550f42b4)
- Cosmos DB Password darf KEINE Sonderzeichen enthalten (URI-Encoding Problem)

## Container App Status

| App | Image | CPU/Mem | Health |
|-----|-------|---------|--------|
| enterprise-backend-prod | enterprise-backend:v2 | 0.5 CPU / 1Gi | /api/health OK |
| enterprise-frontend-prod | enterprise-frontend:v1 | 0.25 CPU / 0.5Gi | /health OK |

## Deployment-Historie

| Datum | Image | Aenderung |
|-------|-------|-----------|
| 2026-03-02 | enterprise-backend:v1 | Erster Deploy (MongoDB Auth Fehler) |
| 2026-03-02 | enterprise-backend:v2 | bcrypt==4.0.1 Fix + PW Reset |
| 2026-03-02 | enterprise-frontend:v1 | Erster Deploy (LIVE) |
