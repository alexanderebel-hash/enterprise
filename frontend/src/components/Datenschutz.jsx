import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

export default function Datenschutz({ onNavigate }) {
  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-lcars-blue hover:text-lcars-orange transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft size={20} />
        </button>
        <Shield className="text-lcars-blue" size={24} />
        <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] text-lcars-orange uppercase font-lcars">
          DATENSCHUTZERKLAERUNG
        </h1>
      </div>

      <div className="space-y-6 font-lcars-body text-sm text-white/90 leading-relaxed border-2 border-lcars-blue/30 rounded-2xl p-6 bg-black/50">
        <section>
          <h2 className="text-lcars-orange font-lcars tracking-[0.15em] text-base mb-2">1. VERANTWORTLICHER</h2>
          <p>
            DomusVita gGmbH<br />
            Baumschulenstr. 24, 12437 Berlin<br />
            E-Mail: datenschutz@domusvita.de
          </p>
        </section>

        <section>
          <h2 className="text-lcars-orange font-lcars tracking-[0.15em] text-base mb-2">2. ZWECK DER DATENVERARBEITUNG</h2>
          <p>
            Diese Anwendung dient als interne IT-Wissensdatenbank fuer Mitarbeitende der DomusVita gGmbH.
            Folgende Daten werden verarbeitet:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-white/80">
            <li>Benutzername und Anzeigename (Authentifizierung)</li>
            <li>Chat-Verlaeufe mit dem KI-Assistenten (Wissensabfrage)</li>
            <li>Erstellte Artikel und Tickets (IT-Dokumentation)</li>
            <li>Spracheingaben bei Logbuch-Diktat (temporaere Verarbeitung)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lcars-orange font-lcars tracking-[0.15em] text-base mb-2">3. RECHTSGRUNDLAGE</h2>
          <p>
            Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Erfuellung des
            Arbeitsvertrages) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an effizienter
            IT-Dokumentation und Wissensmanagement).
          </p>
        </section>

        <section>
          <h2 className="text-lcars-orange font-lcars tracking-[0.15em] text-base mb-2">4. KI-GESTEUERTE VERARBEITUNG</h2>
          <div className="bg-lcars-pink/10 border border-lcars-pink/30 rounded-xl p-4 mt-2">
            <p className="text-lcars-pink font-lcars text-xs tracking-wider mb-2">TRANSPARENZHINWEIS</p>
            <ul className="list-disc list-inside space-y-1 text-white/80">
              <li><strong>Chat-Funktion:</strong> Anfragen werden von Claude (Anthropic, USA) verarbeitet.
                Es werden nur die Wissensdatenbank-Inhalte und Ihre Chat-Nachricht uebermittelt.</li>
              <li><strong>Spracheingabe:</strong> Audio-Aufnahmen werden von Whisper (OpenAI, USA) transkribiert
                und danach sofort geloescht.</li>
              <li><strong>Zusammenfassungen:</strong> Artikel-Zusammenfassungen werden automatisch von Claude generiert.</li>
            </ul>
            <p className="mt-2 text-lcars-pink/80 text-xs">
              Drittlandtransfer USA: Abgesichert durch EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lcars-orange font-lcars tracking-[0.15em] text-base mb-2">5. SPEICHERDAUER</h2>
          <ul className="list-disc list-inside space-y-1 text-white/80">
            <li>Benutzerkonten: Fuer die Dauer des Beschaeftigungsverhaeltnisses</li>
            <li>Chat-Verlaeufe: Automatische Loeschung nach 90 Tagen</li>
            <li>Artikel und Tickets: Bis zur manuellen Loeschung durch Administratoren</li>
            <li>Spracheingaben: Sofortige Loeschung nach Transkription</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lcars-orange font-lcars tracking-[0.15em] text-base mb-2">6. IHRE RECHTE (ART. 15-21 DSGVO)</h2>
          <p>Sie haben folgende Rechte bezueglich Ihrer personenbezogenen Daten:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-white/80">
            <li><strong>Auskunft (Art. 15):</strong> Ueber die Funktion &quot;Daten exportieren&quot; koennen
              Sie alle gespeicherten Daten einsehen und herunterladen.</li>
            <li><strong>Loeschung (Art. 17):</strong> Chat-Verlaeufe koennen Sie selbst loeschen.
              Fuer die Loeschung Ihres Kontos wenden Sie sich an den Administrator.</li>
            <li><strong>Berichtigung (Art. 16):</strong> Wenden Sie sich an den Administrator.</li>
            <li><strong>Einschraenkung (Art. 18) &amp; Widerspruch (Art. 21):</strong> Wenden Sie sich
              an datenschutz@domusvita.de</li>
            <li><strong>Datenportabilitaet (Art. 20):</strong> Ueber die Export-Funktion im JSON-Format.</li>
            <li><strong>Beschwerderecht:</strong> Bei der Berliner Beauftragten fuer Datenschutz und
              Informationsfreiheit (datenschutz-berlin.de)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lcars-orange font-lcars tracking-[0.15em] text-base mb-2">7. TECHNISCHE SICHERHEIT</h2>
          <ul className="list-disc list-inside space-y-1 text-white/80">
            <li>Verschluesselte Uebertragung (TLS/HTTPS)</li>
            <li>JWT-basierte Authentifizierung mit 24h Ablaufzeit</li>
            <li>Rate Limiting gegen Brute-Force-Angriffe</li>
            <li>Bcrypt-Passwort-Hashing</li>
            <li>Content Security Policy und Security Headers</li>
          </ul>
        </section>

        <div className="text-lcars-gray font-lcars text-[10px] tracking-wider pt-4 border-t border-lcars-gray/20">
          Stand: Maerz 2026 | Version 1.0
        </div>
      </div>
    </div>
  );
}
