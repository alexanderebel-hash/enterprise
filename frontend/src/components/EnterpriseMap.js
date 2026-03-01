import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useLCARSSound } from '../hooks/useLCARSSound';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Plus, X, Loader2 } from 'lucide-react';

const PRIORITY_COLORS = {
  critical: '#FF3333', high: '#CC6666', normal: '#FF9900', low: '#9999FF',
};
const STATUS_LABELS = { offen: 'OFFEN', in_bearbeitung: 'IN BEARBEITUNG', erledigt: 'ERLEDIGT' };

export default function EnterpriseMap({ onNavigate }) {
  const { token, user } = useAuth();
  const { play } = useLCARSSound();
  const isCaptain = user?.role === 'captain';
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationDetail, setLocationDetail] = useState(null);
  const [viewMode, setViewMode] = useState('exterior'); // exterior, crosssection
  const [loading, setLoading] = useState(true);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'normal' });
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [hoverLocation, setHoverLocation] = useState(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const locs = await api.getLocations();
      setLocations(locs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const selectLocation = async (loc) => {
    play('panelOpen');
    setSelectedLocation(loc);
    try {
      const detail = await api.getLocation(loc.location_id);
      setLocationDetail(detail);
    } catch (e) { console.error(e); }
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

  // Animated starfield canvas
  useEffect(() => {
    if (viewMode !== 'exterior') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    const resize = () => { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; };
    resize();
    for (let i = 0; i < 120; i++) {
      stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 1.5 + 0.3, a: Math.random() });
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(st => {
        st.a += 0.005 + Math.random() * 0.005;
        const alpha = 0.3 + Math.sin(st.a) * 0.4;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,200,255,${Math.max(0.1, alpha)})`;
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [viewMode]);

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

        {/* Create ticket */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lcars-orange font-lcars text-lg tracking-[0.2em]">OFFENE ANLIEGEN ({openTickets.length})</h2>
          <button data-testid="create-ticket-btn" onClick={() => { play('buttonPress'); setShowCreateTicket(!showCreateTicket); }}
            className="flex items-center gap-2 bg-lcars-orange text-black rounded-full px-5 py-2 font-lcars text-xs tracking-wider font-bold hover:bg-lcars-tan transition-all">
            {showCreateTicket ? <X size={14} /> : <Plus size={14} />} {showCreateTicket ? 'ABBRECHEN' : 'NEUES ANLIEGEN'}
          </button>
        </div>

        {showCreateTicket && (
          <div className="border-2 border-lcars-orange/40 rounded-2xl p-4 mb-4 space-y-3 animate-fade-in" data-testid="create-ticket-form">
            <input data-testid="ticket-title-input" type="text" placeholder="Titel des Anliegens..." value={newTicket.title}
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

        {/* Open tickets */}
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.3em] text-lcars-orange uppercase font-lcars" data-testid="map-title">
          ENTERPRISE
        </h1>
        <div className="flex gap-2">
          <button data-testid="view-exterior" onClick={() => { play('buttonPress'); setViewMode('exterior'); }}
            className={`rounded-full px-5 py-1.5 font-lcars text-xs tracking-[0.2em] transition-all ${viewMode === 'exterior' ? 'bg-lcars-orange text-black' : 'bg-lcars-orange/10 text-lcars-orange'}`}>
            AUSSENANSICHT
          </button>
          <button data-testid="view-crosssection" onClick={() => { play('buttonPress'); setViewMode('crosssection'); }}
            className={`rounded-full px-5 py-1.5 font-lcars text-xs tracking-[0.2em] transition-all ${viewMode === 'crosssection' ? 'bg-lcars-orange text-black' : 'bg-lcars-orange/10 text-lcars-orange'}`}>
            QUERSCHNITT
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden rounded-2xl border-2 border-lcars-orange/30 bg-black" data-testid="ship-viewport">
        {viewMode === 'exterior' && <canvas ref={canvasRef} className="absolute inset-0" />}

        {/* Enterprise SVG Ship */}
        <svg viewBox="0 0 960 480" className="w-full h-full relative z-10" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="strongGlow">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="hullGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#334" />
              <stop offset="100%" stopColor="#112" />
            </linearGradient>
            <linearGradient id="nacGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#226" />
              <stop offset="50%" stopColor="#33a" />
              <stop offset="100%" stopColor="#226" />
            </linearGradient>
          </defs>

          {viewMode === 'crosssection' && (
            <>
              {/* Grid lines for cross-section */}
              {Array.from({ length: 48 }, (_, i) => (
                <line key={`gx${i}`} x1={i * 20} y1="0" x2={i * 20} y2="480" stroke="#FF990008" strokeWidth="0.5" />
              ))}
              {Array.from({ length: 24 }, (_, i) => (
                <line key={`gy${i}`} x1="0" y1={i * 20} x2="960" y2={i * 20} stroke="#FF990008" strokeWidth="0.5" />
              ))}
            </>
          )}

          {/* === SAUCER SECTION === */}
          <ellipse cx="680" cy="140" rx="220" ry="70" fill="url(#hullGrad)" stroke="#FF990040" strokeWidth="1.5" />
          {viewMode === 'crosssection' && (
            <>
              {/* Inner deck lines */}
              {[100, 120, 140, 160, 180].map((y, i) => (
                <ellipse key={`deck${i}`} cx="680" cy="140" rx={200 - i * 15} ry={Math.max(10, 60 - i * 12)} fill="none" stroke="#FF990015" strokeWidth="0.5" style={{ transform: `translateY(${(y - 140) * 0.3}px)` }} />
              ))}
            </>
          )}
          {/* Bridge dome */}
          <ellipse cx="680" cy="78" rx="30" ry="10" fill="#223" stroke="#FF990050" strokeWidth="1" />
          <ellipse cx="680" cy="75" rx="12" ry="4" fill="#FF990030" stroke="#FF9900" strokeWidth="0.5" />

          {/* === NECK/DORSAL === */}
          <path d="M640,200 L640,260 Q640,280 620,290 L500,290 L500,260 L620,260 Q630,260 630,250 L630,200 Z"
            fill="url(#hullGrad)" stroke="#FF990030" strokeWidth="1" />

          {/* === ENGINEERING HULL === */}
          <path d="M180,240 Q180,200 280,200 L500,200 L500,380 L280,380 Q180,380 180,340 Z"
            fill="url(#hullGrad)" stroke="#FF990030" strokeWidth="1" />
          {viewMode === 'crosssection' && (
            <>
              {/* Internal engineering lines */}
              <line x1="280" y1="220" x2="480" y2="220" stroke="#FF990010" strokeWidth="0.5" />
              <line x1="280" y1="260" x2="480" y2="260" stroke="#FF990010" strokeWidth="0.5" />
              <line x1="280" y1="300" x2="480" y2="300" stroke="#FF990010" strokeWidth="0.5" />
              <line x1="280" y1="340" x2="480" y2="340" stroke="#FF990010" strokeWidth="0.5" />
              <line x1="350" y1="210" x2="350" y2="370" stroke="#FF990010" strokeWidth="0.5" />
              <line x1="420" y1="210" x2="420" y2="370" stroke="#FF990010" strokeWidth="0.5" />
              {/* Warp core */}
              <rect x="385" y="230" width="10" height="120" rx="5" fill="#CC666630" stroke="#CC6666" strokeWidth="0.5" />
              <circle cx="390" cy="290" r="6" fill="#CC666660" stroke="#CC6666" strokeWidth="1">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
            </>
          )}

          {/* === DEFLECTOR DISH === */}
          <ellipse cx="180" cy="290" rx="12" ry="35" fill="#4455FF20" stroke="#4455FF" strokeWidth="1.5">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
          </ellipse>

          {/* === NACELLE PYLONS === */}
          <path d="M360,210 L300,60 L310,60 L380,210" fill="url(#hullGrad)" stroke="#FF990020" strokeWidth="0.5" />
          <path d="M360,370 L300,430 L310,430 L380,370" fill="url(#hullGrad)" stroke="#FF990020" strokeWidth="0.5" />

          {/* === UPPER NACELLE === */}
          <rect x="80" y="35" width="280" height="35" rx="17" fill="url(#nacGrad)" stroke="#9999FF40" strokeWidth="1" />
          <rect x="90" y="42" width="260" height="20" rx="10" fill="#9999FF15" />
          {/* Bussard collector */}
          <circle cx="370" cy="52" r="14" fill="#CC666640" stroke="#CC6666" strokeWidth="1">
            <animate attributeName="fill" values="#CC666620;#CC666660;#CC666620" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* === LOWER NACELLE === */}
          <rect x="80" y="415" width="280" height="35" rx="17" fill="url(#nacGrad)" stroke="#9999FF40" strokeWidth="1" />
          <rect x="90" y="422" width="260" height="20" rx="10" fill="#9999FF15" />
          <circle cx="370" cy="432" r="14" fill="#CC666640" stroke="#CC6666" strokeWidth="1">
            <animate attributeName="fill" values="#CC666620;#CC666660;#CC666620" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* === SHUTTLE BAY (rear of saucer) === */}
          {viewMode === 'crosssection' && (
            <rect x="460" y="130" width="8" height="20" fill="#FF990030" stroke="#FF9900" strokeWidth="0.5" />
          )}

          {/* === LOCATION HOTSPOTS === */}
          {locations.map((loc) => {
            const hasIssues = loc.open_tickets > 0;
            const isCritical = loc.critical_tickets > 0;
            const isHovered = hoverLocation === loc.location_id;
            const pulseColor = isCritical ? '#FF3333' : hasIssues ? '#FF9900' : loc.color;

            return (
              <g key={loc.location_id} className="cursor-pointer" data-testid={`location-hotspot-${loc.location_id}`}
                onClick={() => selectLocation(loc)}
                onMouseEnter={() => setHoverLocation(loc.location_id)}
                onMouseLeave={() => setHoverLocation(null)}>

                {/* Glow behind for active locations */}
                {hasIssues && (
                  <circle cx={loc.x} cy={loc.y} r={isHovered ? 28 : 22} fill={`${pulseColor}15`} filter="url(#strongGlow)">
                    <animate attributeName="r" values={isHovered ? "26;30;26" : "18;24;18"} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Main circle */}
                <circle cx={loc.x} cy={loc.y} r={isHovered ? 16 : 12} fill={`${loc.color}40`}
                  stroke={isHovered ? '#fff' : loc.color} strokeWidth={isHovered ? 2 : 1.5}
                  style={{ transition: 'all 0.2s ease' }} />

                {/* Inner dot */}
                <circle cx={loc.x} cy={loc.y} r={4} fill={loc.color}>
                  {hasIssues && <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />}
                </circle>

                {/* Ticket count badge */}
                {hasIssues && (
                  <>
                    <circle cx={loc.x + 14} cy={loc.y - 14} r={8} fill={isCritical ? '#FF3333' : '#FF9900'} />
                    <text x={loc.x + 14} y={loc.y - 10} textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold" fontFamily="Antonio">
                      {loc.open_tickets}
                    </text>
                  </>
                )}

                {/* Label */}
                <text x={loc.x} y={loc.y + (loc.y < 200 ? -22 : 28)} textAnchor="middle" fill={isHovered ? '#fff' : loc.color}
                  fontSize="9" fontFamily="Antonio" letterSpacing="2" style={{ transition: 'fill 0.2s', textTransform: 'uppercase' }}>
                  {loc.ship_section}
                </text>
                <text x={loc.x} y={loc.y + (loc.y < 200 ? -12 : 38)} textAnchor="middle" fill={isHovered ? loc.color : '#666'}
                  fontSize="7" fontFamily="Roboto Condensed" letterSpacing="1">
                  {loc.name}
                </text>
              </g>
            );
          })}

          {/* Ship label */}
          <text x="680" y="240" textAnchor="middle" fill="#FF990040" fontSize="10" fontFamily="Antonio" letterSpacing="4">
            USS ENTERPRISE NCC-1701-D
          </text>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex gap-3 bg-black/80 rounded-full px-4 py-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-lcars-red animate-pulse" />
            <span className="font-lcars text-[8px] text-lcars-red tracking-wider">KRITISCH</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-lcars-orange animate-pulse" />
            <span className="font-lcars text-[8px] text-lcars-orange tracking-wider">OFFEN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-lcars-tan" />
            <span className="font-lcars text-[8px] text-lcars-tan tracking-wider">OK</span>
          </div>
        </div>

        {/* Hover tooltip */}
        {hoverLocation && (() => {
          const loc = locations.find(l => l.location_id === hoverLocation);
          if (!loc) return null;
          return (
            <div className="absolute top-3 right-3 bg-black/90 border border-lcars-orange/40 rounded-xl px-4 py-3 min-w-[200px]" data-testid="hover-tooltip">
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
