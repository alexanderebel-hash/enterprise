# Enterprise LCARS — Architekturentscheidungen

## [2026-03-02] Emergent.ai Code als Basis uebernommen
**Kontext:** Enterprise LCARS wurde mit Emergent.ai (Code-Generator-Plattform) erstellt. Der Output musste production-ready gemacht werden.
**Entscheidung:** Emergent-Code als Basis uebernehmen, aber alle Production-kritischen Aspekte ueberarbeiten (Auth, SDK, Build, Security).
**Begruendung:** Schnellerer Start als kompletter Neubau. Core-Features (LCARS-UI, Chat, Knowledge Base) waren bereits funktional.

## [2026-03-02] Eigene JWT-Auth statt Entra ID
**Kontext:** Alle anderen DomusVita-Module nutzen Entra ID (Azure AD). Enterprise hat eigenes JWT-System mit 2 Rollen (captain, nummer-eins).
**Entscheidung:** JWT-Auth beibehalten, kein Entra ID.
**Begruendung:** Enterprise ist ein internes IT-Tool nur fuer 2 Personen. Entra-ID-Migration waere Overengineering. Eigene Auth gibt volle Kontrolle ueber Rollen und ist unabhaengig von Azure AD-Konfiguration.

## [2026-03-02] Cosmos DB for MongoDB vCore (Free Tier)
**Kontext:** Datenbank-Wahl fuer Enterprise. Optionen: Shared PostgreSQL (wie andere Module), eigene Cosmos DB, oder bestehende MongoDB.
**Entscheidung:** Eigene Cosmos DB for MongoDB vCore im Free Tier.
**Begruendung:** (1) Emergent-Code nutzt bereits Motor/MongoDB-Syntax, kein Rewrite noetig. (2) Free Tier = keine Kosten. (3) Unabhaengig von anderen Modulen. (4) MongoDB passt gut fuer unstrukturierte Wissensdaten.

## [2026-03-02] CRA → Vite 6 Migration
**Kontext:** Emergent generierte CRA-basiertes Frontend. CRA ist deprecated.
**Entscheidung:** Migration zu Vite 6 mit @vitejs/plugin-react.
**Begruendung:** CRA ist unmaintained und langsam. Alle anderen DomusVita-Module wurden bereits auf Vite migriert (L-01 Audit Finding). Einheitlicher Tech-Stack.

## [2026-03-02] emergentintegrations → Anthropic SDK + OpenAI SDK direkt
**Kontext:** Emergent nutzte eigenes `emergentintegrations` Package als Wrapper um Claude und Whisper.
**Entscheidung:** Direkte Nutzung von `anthropic` und `openai` SDKs.
**Begruendung:** emergentintegrations ist ein proprietaeres Emergent-Package, nicht production-ready, nicht maintained. Direkte SDKs sind stabiler, besser dokumentiert, und erlauben volle Kontrolle ueber Timeouts/Retries.

## [2026-03-02] bcrypt==4.0.1 Pin
**Kontext:** passlib (JWT-Auth) ist inkompatibel mit bcrypt>=4.1.0 wegen geaenderter API.
**Entscheidung:** bcrypt auf 4.0.1 gepinnt in requirements.txt.
**Begruendung:** Bekanntes Problem (auch bei QM-Modul). Ohne Pin schlaegt Password-Hashing fehl. Alternative waere passlib-Replacement, aber das waere ein groesserer Umbau.

## [2026-03-02] Eigene Subdomain statt Gateway-Integration
**Kontext:** Andere Module laufen unter www.domusvita-portal.de/[modul]/. Enterprise koennte als Pfad oder eigene Subdomain laufen.
**Entscheidung:** Eigene Subdomain (enterprise.domusvita-portal.de + enterprise-api.domusvita-portal.de).
**Begruendung:** (1) Enterprise hat eigenes Auth-System (nicht Entra ID wie Gateway). (2) Eigene Subdomain vermeidet Cookie/Auth-Konflikte. (3) Einfacheres Setup ohne Gateway-nginx-Aenderungen. (4) Konsistent mit QM und Terminmanagement (eigene Subdomains).

## [2026-03-02] Cosmos DB Password ohne Sonderzeichen
**Kontext:** Erstes Passwort enthielt `\!` was MongoDB-URI-Encoding-Probleme verursachte.
**Entscheidung:** Password auf alphanumerisch+Grossbuchstaben beschraenkt (Uq15wCvDrk4649tYSPijAa1X).
**Begruendung:** Cosmos DB MongoDB-Verbindung nutzt mongodb+srv:// URI. Sonderzeichen muessen URL-encoded werden, was in ENV-Variablen fehleranfaellig ist. Langes alphanumerisches Passwort ist genauso sicher.

## [2026-03-02] Scale-to-Zero (Min 0 / Max 1)
**Kontext:** Container App Skalierung fuer Enterprise.
**Entscheidung:** Minimum 0 Replicas, Maximum 1 (Scale-to-Zero).
**Begruendung:** Enterprise wird nur von 2 Personen genutzt. Scale-to-Zero spart Kosten bei Inaktivitaet. Cold-Start-Latenz (~10-15s) ist akzeptabel fuer ein internes Tool.
