import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useLCARSSound } from '../hooks/useLCARSSound';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Plus, X, Shield, Monitor, Navigation, Settings, Cpu, Compass, Star } from 'lucide-react';

const PRIORITY_COLORS = {
  critical: '#FF3333', high: '#CC6666', normal: '#FF9900', low: '#9999FF',
};
const STATUS_LABELS = { offen: 'OFFEN', in_bearbeitung: 'IN BEARBEITUNG', erledigt: 'ERLEDIGT' };

// Hotspot positions on the cross-section image (% from top-left)
const HOTSPOT_POSITIONS = {
  bruecke:       { x: 66, y: 10, label: 'HAUPTBRUECKE' },
  sterndamm:     { x: 58, y: 28, label: 'QUARTIERE' },
  kupfer_gross:  { x: 34, y: 48, label: 'MASCHINENRAUM' },
  kupfer_klein:  { x: 18, y: 38, label: 'SHUTTLEHANGAR' },
  drachenwiese:  { x: 62, y: 36, label: 'KRANKENSTATION' },
  drachenblick:  { x: 80, y: 28, label: 'ZEHN VORNE' },
  hebron:        { x: 28, y: 62, label: 'FRACHTRAUM' },
  aussentour:    { x: 8, y: 72, label: 'AUSSENMISSION' },
};

// Bridge station hotspots (% positions on bruecke_normal.jpg)
const BRIDGE_STATIONS = {
  viewscreen: {
    x: 50, y: 25, w: 28, h: 25,
    name: 'HAUPTBILDSCHIRM',
    officer: 'System / Automatisch',
    description: 'Externe Ansicht, Kommunikationsverbindungen, taktische Darstellungen und Sternenkarten.',
    color: '#66FF66',
    icon: Monitor,
    shape: 'rect',
  },
  conn: {
    x: 32, y: 62, w: 10, h: 16,
    name: 'CONN',
    officer: 'Lt. Cmdr. Data / Faehnrich Crusher',
    description: 'Flugkontrolle - Navigation und Steuerung der Enterprise. Kursberechnungen, Warp-Geschwindigkeiten und Orbitalmanoever.',
    color: '#9999FF',
    icon: Navigation,
    shape: 'rect',
  },
  ops: {
    x: 58, y: 62, w: 10, h: 16,
    name: 'OPS',
    officer: 'Lt. Cmdr. Data',
    description: 'Operationen - Systemverwaltung, Kommunikation und Sensorensteuerung. Koordination aller Schiffssysteme.',
    color: '#9999FF',
    icon: Settings,
    shape: 'rect',
  },
  captain: {
    x: 50, y: 66, w: 10, h: 12,
    name: 'KOMMANDOSESSEL',
    officer: 'Captain Jean-Luc Picard',
    description: 'Kommandozentrale - Zentrale Befehlsgewalt ueber alle Systeme. Zugriff auf alle Stationen und Logbuch.',
    color: '#FF3333',
    icon: Star,
    shape: 'circle',
  },
  tactical: {
    x: 50, y: 82, w: 14, h: 14,
    name: 'TAKTIK',
    officer: 'Lt. Worf',
    description: 'Taktik und Sicherheit - Phaserbatterien, Photonentorpedos, Schildmodulation und interne Sicherheit.',
    color: '#FF9900',
    icon: Shield,
    shape: 'arc',
  },
  engineering: {
    x: 14, y: 52, w: 14, h: 22,
    name: 'TECHNIK',
    officer: 'Lt. Cmdr. Geordi La Forge',
    description: 'Technik-Station - Echtzeit-Systemdiagnose, Energieverteilung, Warpkern-Ueberwachung.',
    color: '#FFCC99',
    icon: Cpu,
    shape: 'rect',
  },
  science: {
    x: 86, y: 52, w: 14, h: 22,
    name: 'WISSENSCHAFT',
    officer: 'Counselor Deanna Troi',
    description: 'Wissenschafts-Station - Langstreckensensoren, Analyse extraterrestrischer Phaenomene, empathische Beratung.',
    color: '#CC99CC',
    icon: Compass,
    shape: 'rect',
  },
};

export default function EnterpriseMap({ onNavigate }) {
  const { token, user } = useAuth();
  const { play } = useLCARSSound();
  const isCaptain = user?.role === 'captain';
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationDetail, setLocationDetail] = useState(null);
  const [viewMode, setViewMode] = useState('exterior');
  const [loading, setLoading] = useState(true);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'normal' });
  const [hoverLocation, setHoverLocation] = useState(null);
  const [warpPhase, setWarpPhase] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [hoverStation, setHoverStation] = useState(null);
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => { loadLocations(); }, []);

  const loadLocations = async () => {
    try { const locs = await api.getLocations(); setLocations(locs); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const selectLocation = async (loc) => {
    play('panelOpen');
    setSelectedLocation(loc);
    try { const detail = await api.getLocation(loc.location_id); setLocationDetail(detail); }
    catch (e) { console.error(e); }
  };

  const createTicket = async () => {
    if (!newTicket.title.trim() || !selectedLocation) return;
    play('dataTransmit');
    try {
      await api.createTicket(token, { ...newTicket, location_id: selectedLocation.location_id });
      play('computerAck');
      setShowCreateTicket(false);
      setNewTicket({ title: '', description: '', priority: 'normal' });
      const detail = await api.getLocation(selectedLocation.location_id);
      setLocationDetail(detail);
      loadLocations();
    } catch (e) { play('alert'); }
  };

  const updateTicketStatus = async (ticketId, status) => {
    play('buttonPress');
    try {
      await api.updateTicket(token, ticketId, { status });
      const detail = await api.getLocation(selectedLocation.location_id);
      setLocationDetail(detail);
      loadLocations();
    } catch (e) { play('alert'); }
  };

  // Warp transition animation
  const doWarpTransition = (targetMode) => {
    if (transitioning) return;
    play('scan');
    setTransitioning(true);
    setWarpPhase(1);
    setTimeout(() => setWarpPhase(2), 400);
    setTimeout(() => { setWarpPhase(3); setViewMode(targetMode); }, 800);
    setTimeout(() => setWarpPhase(4), 1200);
    setTimeout(() => { setWarpPhase(0); setTransitioning(false); }, 1600);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-lcars-orange font-lcars tracking-[0.3em] text-2xl animate-pulse">SCHIFFSSYSTEME LADEN...</div></div>;
  }

  // Location detail panel
  if (selectedLocation && locationDetail) {
    const openTickets = locationDetail.tickets?.filter(t => t.status !== 'erledigt') || [];
    const doneTickets = locationDetail.tickets?.filter(t => t.status === 'erledigt') || [];
    return (
      <div className="animate-fade-in h-full overflow-y-auto" data-testid="location-detail">
        <button data-testid="back-to-map-btn" onClick={() => { play('navigate'); setSelectedLocation(null); setLocationDetail(null); }}
          className="flex items-center gap-2 text-lcars-blue font-lcars text-sm tracking-wider mb-4 hover:text-lcars-orange transition-colors">
          <ArrowLeft size={16} /> ZURUECK ZUR ENTERPRISE
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-4 h-16 rounded-full" style={{ background: selectedLocation.color }} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase font-lcars" style={{ color: selectedLocation.color }} data-testid="location-name">
              {selectedLocation.name}
            </h1>
            <p className="text-lcars-gray font-lcars text-xs tracking-[0.2em]">{selectedLocation.ship_section} - {selectedLocation.deck}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lcars-orange font-lcars text-lg tracking-[0.2em]">OFFENE ANLIEGEN ({openTickets.length})</h2>
          <button data-testid="create-ticket-btn" onClick={() => { play('buttonPress'); setShowCreateTicket(!showCreateTicket); }}
            className="flex items-center gap-2 bg-lcars-orange text-black rounded-full px-5 py-2 font-lcars text-xs tracking-wider font-bold hover:bg-lcars-tan transition-all">
            {showCreateTicket ? <X size={14} /> : <Plus size={14} />} {showCreateTicket ? 'ABBRECHEN' : 'NEUES ANLIEGEN'}
          </button>
        </div>
        {showCreateTicket && (
          <div className="border-2 border-lcars-orange/40 rounded-2xl p-4 mb-4 space-y-3 animate-fade-in" data-testid="create-ticket-form">
            <input data-testid="ticket-title-input" type="text" placeholder="Titel..." value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              className="w-full bg-black border border-lcars-orange/30 rounded-lg px-4 py-2 text-white font-lcars text-sm tracking-wider focus:border-lcars-orange focus:outline-none" />
            <textarea data-testid="ticket-desc-input" placeholder="Beschreibung..." value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} rows={3}
              className="w-full bg-black border border-lcars-orange/30 rounded-lg px-4 py-2 text-white font-lcars-body text-sm focus:border-lcars-orange focus:outline-none resize-none" />
            <div className="flex gap-2">
              {['low', 'normal', 'high', 'critical'].map(p => (
                <button key={p} data-testid={`priority-${p}`} onClick={() => setNewTicket({ ...newTicket, priority: p })}
                  className={`rounded-full px-4 py-1 font-lcars text-[10px] tracking-wider transition-all ${newTicket.priority === p ? 'text-black' : 'text-white/60 border border-white/20'}`}
                  style={newTicket.priority === p ? { background: PRIORITY_COLORS[p] } : {}}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <button data-testid="submit-ticket-btn" onClick={createTicket} disabled={!newTicket.title.trim()}
              className="bg-lcars-orange text-black rounded-full px-6 py-2 font-lcars text-xs tracking-wider font-bold hover:bg-lcars-tan transition-all disabled:opacity-50">
              ANLIEGEN ERSTELLEN
            </button>
          </div>
        )}
        <div className="space-y-2 mb-6">
          {openTickets.length === 0 ? (
            <div className="text-center py-8 border border-lcars-gray/20 rounded-xl">
              <CheckCircle className="mx-auto text-lcars-tan mb-2" size={32} />
              <p className="text-lcars-tan font-lcars text-sm tracking-wider">KEINE OFFENEN ANLIEGEN</p>
            </div>
          ) : openTickets.map(ticket => (
            <div key={ticket.ticket_id} className="border border-white/10 rounded-xl px-4 py-3 hover:bg-white/5 transition-all" data-testid={`ticket-${ticket.ticket_id}`}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 rounded-full" style={{ background: PRIORITY_COLORS[ticket.priority] }} />
                <div className="flex-1">
                  <h3 className="text-white font-lcars text-sm tracking-wider">{ticket.title}</h3>
                  {ticket.description && <p className="text-lcars-gray font-lcars-body text-xs mt-1">{ticket.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-lcars tracking-wider" style={{ color: PRIORITY_COLORS[ticket.priority] }}>{ticket.priority.toUpperCase()}</span>
                    <span className="text-[9px] font-lcars tracking-wider text-lcars-blue">{STATUS_LABELS[ticket.status]}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {ticket.status === 'offen' && (
                    <button data-testid={`start-ticket-${ticket.ticket_id}`} onClick={() => updateTicketStatus(ticket.ticket_id, 'in_bearbeitung')}
                      className="rounded-full px-3 py-1 bg-lcars-blue/20 text-lcars-blue font-lcars text-[9px] tracking-wider hover:bg-lcars-blue hover:text-black transition-all">
                      <Clock size={10} className="inline mr-1" />START
                    </button>
                  )}
                  <button data-testid={`done-ticket-${ticket.ticket_id}`} onClick={() => updateTicketStatus(ticket.ticket_id, 'erledigt')}
                    className="rounded-full px-3 py-1 bg-lcars-tan/20 text-lcars-tan font-lcars text-[9px] tracking-wider hover:bg-lcars-tan hover:text-black transition-all">
                    <CheckCircle size={10} className="inline mr-1" />ERLEDIGT
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {doneTickets.length > 0 && (
          <>
            <h2 className="text-lcars-gray font-lcars text-sm tracking-[0.2em] mb-2">ERLEDIGT ({doneTickets.length})</h2>
            <div className="space-y-1 opacity-50">
              {doneTickets.slice(0, 5).map(ticket => (
                <div key={ticket.ticket_id} className="flex items-center gap-3 rounded-lg px-4 py-2 border border-white/5">
                  <CheckCircle size={12} className="text-lcars-tan" />
                  <span className="text-lcars-gray font-lcars text-xs tracking-wider line-through">{ticket.title}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in" data-testid="enterprise-map-page">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.3em] text-lcars-orange uppercase font-lcars" data-testid="map-title">
          ENTERPRISE
        </h1>
        <div className="flex gap-2">
          {['exterior', 'crosssection', 'bridge'].map((mode) => {
            const labels = { exterior: 'AUSSENANSICHT', crosssection: 'QUERSCHNITT', bridge: 'BRUECKENANSICHT' };
            return (
              <button key={mode} data-testid={`view-${mode}`}
                onClick={() => doWarpTransition(mode)}
                className={`rounded-full px-4 py-1.5 font-lcars text-[10px] tracking-[0.15em] transition-all ${viewMode === mode ? 'bg-lcars-orange text-black' : 'bg-lcars-orange/10 text-lcars-orange hover:bg-lcars-orange/20'}`}>
                {labels[mode]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ship viewport */}
      <div className="flex-1 relative overflow-hidden rounded-2xl border-2 border-lcars-orange/30" data-testid="ship-viewport"
        style={{ minHeight: '400px' }}>

        {/* Warp transition overlay */}
        {warpPhase > 0 && (
          <div className="absolute inset-0 z-30 pointer-events-none" style={{
            background: warpPhase === 2 ? 'radial-gradient(ellipse at center, rgba(153,153,255,0.4) 0%, rgba(0,0,0,0.9) 70%)' :
                         warpPhase === 3 ? 'radial-gradient(ellipse at center, rgba(255,255,255,0.6) 0%, rgba(0,0,0,0.8) 60%)' :
                         'rgba(0,0,0,0)',
            transition: 'all 0.4s ease',
          }}>
            {/* Warp streaks */}
            {warpPhase >= 2 && warpPhase <= 3 && (
              <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 30 }, (_, i) => (
                  <div key={i} className="absolute h-[1px] bg-gradient-to-r from-transparent via-blue-300/60 to-transparent"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: '-10%',
                      width: `${40 + Math.random() * 60}%`,
                      transform: `translateX(${warpPhase === 3 ? '120%' : '0'})`,
                      transition: `transform ${0.3 + Math.random() * 0.2}s ease-in`,
                      transitionDelay: `${Math.random() * 0.1}s`,
                    }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* === EXTERIOR VIEW === */}
        {viewMode === 'exterior' && (
          <div className="absolute inset-0">
            <img src="/assets/enterprise/seitenansicht.jpg" alt="USS Enterprise NCC-1701-D"
              className="w-full h-full object-contain" style={{ background: '#000' }} />
            {/* Scan overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-lcars-orange/[0.02] to-transparent"
                style={{ animation: 'scan 4s linear infinite' }} />
            </div>
            {/* Ship info overlay */}
            <div className="absolute bottom-4 left-4 bg-black/70 border border-lcars-orange/30 rounded-xl px-4 py-3">
              <p className="font-lcars text-lcars-orange text-sm tracking-[0.2em]">USS ENTERPRISE NCC-1701-D</p>
              <p className="font-lcars text-lcars-gray text-[9px] tracking-[0.15em]">GALAXY-KLASSE - VEREINIGTE FOEDERATION DER PLANETEN</p>
            </div>
            <div className="absolute top-4 right-4 bg-black/70 border border-lcars-blue/30 rounded-xl px-4 py-2">
              <p className="font-lcars text-lcars-blue text-[10px] tracking-[0.2em]">KLICKEN SIE QUERSCHNITT</p>
              <p className="font-lcars text-lcars-blue text-[10px] tracking-[0.2em]">FUER STANDORT-DETAILS</p>
            </div>
          </div>
        )}

        {/* === CROSS-SECTION VIEW === */}
        {viewMode === 'crosssection' && (
          <div className="absolute inset-0">
            <img src="/assets/enterprise/querschnitt.jpg" alt="Enterprise Querschnitt"
              className="w-full h-full object-contain" style={{ background: '#000' }} />
            {/* Hotspots overlay */}
            <div className="absolute inset-0">
              {locations.map((loc) => {
                const pos = HOTSPOT_POSITIONS[loc.location_id];
                if (!pos) return null;
                const hasIssues = loc.open_tickets > 0;
                const isCritical = loc.critical_tickets > 0;
                const isHovered = hoverLocation === loc.location_id;

                return (
                  <div key={loc.location_id} className="absolute cursor-pointer group"
                    data-testid={`location-hotspot-${loc.location_id}`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                    onClick={() => selectLocation(loc)}
                    onMouseEnter={() => { setHoverLocation(loc.location_id); play('buttonPress'); }}
                    onMouseLeave={() => setHoverLocation(null)}>

                    {/* Pulse ring for active locations */}
                    {hasIssues && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="absolute rounded-full animate-ping"
                          style={{
                            width: '48px', height: '48px',
                            background: `${isCritical ? '#FF333330' : '#FF990020'}`,
                            border: `1px solid ${isCritical ? '#FF333350' : '#FF990040'}`,
                          }} />
                      </div>
                    )}

                    {/* Main dot */}
                    <div className={`relative z-10 rounded-full flex items-center justify-center transition-all duration-200 ${isHovered ? 'scale-150' : ''}`}
                      style={{
                        width: hasIssues ? '28px' : '20px',
                        height: hasIssues ? '28px' : '20px',
                        background: `${loc.color}40`,
                        border: `2px solid ${isHovered ? '#fff' : loc.color}`,
                        boxShadow: isHovered ? `0 0 20px ${loc.color}80, 0 0 40px ${loc.color}40` : hasIssues ? `0 0 12px ${loc.color}50` : 'none',
                      }}>
                      <div className="rounded-full" style={{
                        width: '8px', height: '8px', background: loc.color,
                        animation: hasIssues ? 'pulse 1.5s ease-in-out infinite' : 'none',
                      }} />
                    </div>

                    {/* Ticket badge */}
                    {hasIssues && (
                      <div className="absolute -top-1 -right-1 z-20 rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold font-lcars"
                        style={{ background: isCritical ? '#FF3333' : '#FF9900', color: '#000' }}>
                        {loc.open_tickets}
                      </div>
                    )}

                    {/* Label tooltip */}
                    <div className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-200 pointer-events-none z-20 ${isHovered ? 'opacity-100 scale-100' : 'opacity-70 scale-90'}`}
                      style={{ top: '-32px' }}>
                      <div className="bg-black/90 border rounded-lg px-3 py-1.5"
                        style={{ borderColor: `${loc.color}60` }}>
                        <p className="font-lcars text-[9px] tracking-[0.2em] text-center" style={{ color: loc.color }}>
                          {pos.label}
                        </p>
                        <p className="font-lcars text-[8px] tracking-[0.1em] text-center text-white/80">
                          {loc.name}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === BRIDGE VIEW === */}
        {viewMode === 'bridge' && (
          <div className="absolute inset-0">
            <img src="/assets/enterprise/bruecke_normal.jpg" alt="Enterprise Bruecke"
              className="w-full h-full object-cover" style={{ background: '#000' }} />

            {/* Interactive station hotspots */}
            <div className="absolute inset-0">
              {Object.entries(BRIDGE_STATIONS).map(([id, station]) => {
                const isHovered = hoverStation === id;
                const StationIcon = station.icon;
                return (
                  <div key={id}
                    data-testid={`bridge-station-${id}`}
                    className="absolute cursor-pointer transition-all duration-300"
                    style={{
                      left: `${station.x - station.w / 2}%`,
                      top: `${station.y - station.h / 2}%`,
                      width: `${station.w}%`,
                      height: `${station.h}%`,
                      border: `2px solid ${isHovered || showLabels ? station.color + '90' : station.color + '30'}`,
                      background: isHovered ? `${station.color}25` : `${station.color}08`,
                      borderRadius: station.shape === 'circle' ? '50%' : station.shape === 'arc' ? '50% 50% 0 0' : '4px',
                      boxShadow: isHovered ? `0 0 25px ${station.color}70, inset 0 0 15px ${station.color}15` : 'none',
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      zIndex: isHovered ? 15 : 10,
                    }}
                    onClick={() => { play('scan'); setSelectedStation(id); }}
                    onMouseEnter={() => { setHoverStation(id); play('buttonPress'); }}
                    onMouseLeave={() => setHoverStation(null)}
                  >
                    {/* Station label on hover or showLabels */}
                    <div className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-200 pointer-events-none ${isHovered || showLabels ? 'opacity-100' : 'opacity-0'}`}
                      style={{ bottom: '-24px' }}>
                      <span className="font-lcars text-[9px] tracking-[0.15em] px-2 py-0.5 rounded bg-black/80"
                        style={{ color: station.color, border: `1px solid ${station.color}40` }}>
                        {station.name}
                      </span>
                    </div>

                    {/* Corner icon indicator */}
                    {(isHovered || showLabels) && (
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 pointer-events-none">
                        <StationIcon size={14} style={{ color: station.color }} className="drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Station detail modal */}
            {selectedStation && (() => {
              const station = BRIDGE_STATIONS[selectedStation];
              const StationIcon = station.icon;
              return (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 animate-fade-in"
                  data-testid="bridge-station-modal"
                  onClick={(e) => { if (e.target === e.currentTarget) { play('navigate'); setSelectedStation(null); } }}>
                  <div className="w-[420px] max-w-[90%] rounded-2xl overflow-hidden border-2 animate-fade-in"
                    style={{ borderColor: station.color, boxShadow: `0 0 40px ${station.color}40` }}>
                    {/* Modal header */}
                    <div className="flex items-center gap-3 px-5 py-3" style={{ background: station.color }}>
                      <StationIcon size={22} className="text-black" />
                      <span className="font-lcars text-black text-lg tracking-[0.2em] font-bold">{station.name}</span>
                    </div>
                    {/* Modal body */}
                    <div className="bg-black/95 px-5 py-4 space-y-3" style={{ borderTop: `3px solid ${station.color}` }}>
                      <div>
                        <p className="font-lcars text-[10px] tracking-[0.2em] text-lcars-gray mb-1">FUNKTION</p>
                        <p className="font-lcars-body text-sm text-white/90 leading-relaxed">{station.description}</p>
                      </div>
                      <div>
                        <p className="font-lcars text-[10px] tracking-[0.2em] text-lcars-gray mb-1">OFFIZIER</p>
                        <p className="font-lcars text-sm tracking-wider" style={{ color: station.color }}>{station.officer}</p>
                      </div>
                    </div>
                    {/* Modal close */}
                    <button data-testid="close-station-modal"
                      onClick={() => { play('navigate'); setSelectedStation(null); }}
                      className="w-full py-3 font-lcars text-sm tracking-[0.2em] text-black font-bold transition-all hover:brightness-110"
                      style={{ background: station.color }}>
                      SCHLIESSEN
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Bridge controls bar */}
            <div className="absolute bottom-4 left-4 flex items-center gap-3 z-20">
              <div className="bg-black/70 border border-lcars-orange/30 rounded-xl px-4 py-3">
                <p className="font-lcars text-lcars-orange text-sm tracking-[0.2em]">HAUPTBRUECKE - DECK 1</p>
                <p className="font-lcars text-lcars-gray text-[9px] tracking-[0.15em]">BAUMSCHULENSTRASSE 24 - ZENTRALE</p>
              </div>
              <button data-testid="toggle-labels-btn"
                onClick={() => { play('buttonPress'); setShowLabels(!showLabels); }}
                className={`rounded-full px-4 py-2 font-lcars text-[10px] tracking-[0.15em] transition-all ${showLabels ? 'bg-lcars-blue text-black' : 'bg-lcars-blue/20 text-lcars-blue hover:bg-lcars-blue/30'}`}>
                {showLabels ? 'LABELS AUSBLENDEN' : 'STATIONEN ANZEIGEN'}
              </button>
            </div>

            {/* Station info on hover */}
            {hoverStation && !selectedStation && (() => {
              const station = BRIDGE_STATIONS[hoverStation];
              return (
                <div className="absolute top-4 right-4 bg-black/90 border rounded-xl px-4 py-3 min-w-[220px] z-20 animate-fade-in"
                  data-testid="bridge-hover-tooltip"
                  style={{ borderColor: `${station.color}60` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-6 rounded-full" style={{ background: station.color }} />
                    <span className="font-lcars text-sm tracking-wider" style={{ color: station.color }}>{station.name}</span>
                  </div>
                  <p className="text-lcars-gray font-lcars text-[9px] tracking-wider">{station.officer}</p>
                  <p className="text-white/60 font-lcars-body text-[10px] mt-1 line-clamp-2">{station.description}</p>
                </div>
              );
            })()}

            {/* Quick ticket summary - repositioned */}
            {!selectedStation && !hoverStation && (
              <div className="absolute top-4 right-4 bg-black/80 border border-lcars-orange/30 rounded-xl px-4 py-3 max-w-xs z-20">
                <p className="font-lcars text-lcars-orange text-[10px] tracking-[0.2em] mb-2">AKTUELLE ANLIEGEN</p>
                {locations.filter(l => l.open_tickets > 0).slice(0, 4).map(loc => (
                  <button key={loc.location_id} onClick={() => selectLocation(loc)}
                    data-testid={`bridge-loc-${loc.location_id}`}
                    className="flex items-center gap-2 w-full text-left py-1 hover:bg-white/10 rounded px-2 transition-all">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: loc.critical_tickets > 0 ? '#FF3333' : loc.color }} />
                    <span className="font-lcars text-[9px] tracking-wider text-white/80 flex-1">{loc.name}</span>
                    <span className="font-lcars text-[9px]" style={{ color: loc.critical_tickets > 0 ? '#FF3333' : '#FF9900' }}>{loc.open_tickets}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legend bar (cross-section only) */}
        {viewMode === 'crosssection' && (
          <div className="absolute bottom-3 left-3 flex gap-3 bg-black/80 rounded-full px-4 py-2 z-20">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-lcars text-[8px] text-red-400 tracking-wider">KRITISCH</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-lcars-orange animate-pulse" />
              <span className="font-lcars text-[8px] text-lcars-orange tracking-wider">OFFEN</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-lcars-gray" />
              <span className="font-lcars text-[8px] text-lcars-gray tracking-wider">OK</span>
            </div>
          </div>
        )}

        {/* Hover tooltip (cross-section) */}
        {hoverLocation && viewMode === 'crosssection' && (() => {
          const loc = locations.find(l => l.location_id === hoverLocation);
          if (!loc) return null;
          return (
            <div className="absolute top-3 right-3 bg-black/90 border border-lcars-orange/40 rounded-xl px-4 py-3 min-w-[200px] z-20" data-testid="hover-tooltip">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-6 rounded-full" style={{ background: loc.color }} />
                <span className="font-lcars text-sm tracking-wider" style={{ color: loc.color }}>{loc.name}</span>
              </div>
              <p className="text-lcars-gray font-lcars text-[9px] tracking-wider">{loc.ship_section} - {loc.deck}</p>
              <div className="flex items-center gap-2 mt-2">
                {loc.open_tickets > 0 ? (
                  <span className="text-lcars-orange font-lcars text-[10px] tracking-wider">
                    <AlertTriangle size={10} className="inline mr-1" />{loc.open_tickets} OFFENE ANLIEGEN
                  </span>
                ) : (
                  <span className="text-lcars-tan font-lcars text-[10px] tracking-wider">
                    <CheckCircle size={10} className="inline mr-1" />ALLES OK
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
