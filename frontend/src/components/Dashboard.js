import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { FileText, FolderOpen, TrendingUp, Clock, Quote, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { getRandomQuote } from '../data/quotes';
import { useLCARSSound } from '../hooks/useLCARSSound';

const COLOR_MAP = {
  'lcars-red': 'bg-lcars-red', 'lcars-orange': 'bg-lcars-orange', 'lcars-blue': 'bg-lcars-blue',
  'lcars-pink': 'bg-lcars-pink', 'lcars-tan': 'bg-lcars-tan',
};
const TEXT_COLOR_MAP = {
  'lcars-red': 'text-lcars-red', 'lcars-orange': 'text-lcars-orange', 'lcars-blue': 'text-lcars-blue',
  'lcars-pink': 'text-lcars-pink', 'lcars-tan': 'text-lcars-tan',
};

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [locations, setLocations] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(getRandomQuote());
  const [quoteFade, setQuoteFade] = useState(true);
  const [redAlert, setRedAlert] = useState(false);
  const [redAlertDismissed, setRedAlertDismissed] = useState(false);
  const [stardate, setStardate] = useState('');
  const { play } = useLCARSSound();
  const radarRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.getDashboardStats(),
      api.getLocations(),
      api.getTickets({ status: 'offen' }),
      api.getStardate(),
    ]).then(([s, l, t, sd]) => {
      setStats(s);
      setLocations(l);
      setAllTickets(t);
      setStardate(sd.stardate);
      // Check for critical tickets -> Red Alert
      const criticals = t.filter(tk => tk.priority === 'critical');
      if (criticals.length > 0) {
        setRedAlert(true);
        play('alert');
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [play]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      api.getLocations().then(setLocations).catch(() => {});
      api.getTickets({ status: 'offen' }).then(setAllTickets).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => { setQuote(getRandomQuote()); setQuoteFade(true); }, 500);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Tactical radar canvas
  useEffect(() => {
    const canvas = radarRef.current;
    if (!canvas || loading) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = 280;
    const h = canvas.height = 280;
    const cx = w / 2, cy = h / 2, maxR = 120;
    let frame = 0;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      frame++;
      const angle = (frame * 0.02) % (Math.PI * 2);

      // Grid rings
      [30, 60, 90, 120].forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 153, 0, ${0.06 + i * 0.02})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
      // Cross lines
      ctx.strokeStyle = 'rgba(255, 153, 0, 0.05)';
      ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.strokeStyle = 'rgba(255, 153, 0, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sweep trail
      const trailGrad = ctx.createConicGradient(angle, cx, cy);
      trailGrad.addColorStop(0, 'rgba(255, 153, 0, 0.15)');
      trailGrad.addColorStop(0.1, 'rgba(255, 153, 0, 0.0)');
      trailGrad.addColorStop(0.9, 'rgba(255, 153, 0, 0.0)');
      trailGrad.addColorStop(1, 'rgba(255, 153, 0, 0.15)');
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fillStyle = trailGrad;
      ctx.fill();

      // Location dots
      locations.forEach((loc, i) => {
        const locAngle = (i / locations.length) * Math.PI * 2 - Math.PI / 2;
        const dist = loc.open_tickets > 0 ? 50 + (i % 3) * 25 : 80 + (i % 2) * 20;
        const lx = cx + Math.cos(locAngle) * dist;
        const ly = cy + Math.sin(locAngle) * dist;
        const hasIssues = loc.open_tickets > 0;
        const isCritical = loc.critical_tickets > 0;

        // Pulse for active
        if (hasIssues) {
          const pulseR = 6 + Math.sin(frame * 0.08 + i) * 3;
          ctx.beginPath();
          ctx.arc(lx, ly, pulseR, 0, Math.PI * 2);
          ctx.fillStyle = isCritical ? `rgba(255, 51, 51, ${0.2 + Math.sin(frame * 0.1) * 0.15})` : `rgba(255, 153, 0, ${0.15 + Math.sin(frame * 0.08) * 0.1})`;
          ctx.fill();
        }

        // Dot
        ctx.beginPath();
        ctx.arc(lx, ly, 3, 0, Math.PI * 2);
        ctx.fillStyle = isCritical ? '#FF3333' : hasIssues ? '#FF9900' : `${loc.color}80`;
        ctx.fill();

        // Label
        ctx.font = '7px Antonio';
        ctx.fillStyle = hasIssues ? (isCritical ? '#FF3333' : '#FF9900') : '#666';
        ctx.textAlign = 'center';
        const labelParts = loc.ship_section.split(' ');
        ctx.fillText(labelParts[0] || '', lx, ly + 12);
      });

      // Center enterprise icon
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FF990060';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FF9900';
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [locations, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lcars-orange font-lcars tracking-[0.3em] text-2xl animate-pulse">LADE SYSTEME...</div>
      </div>
    );
  }

  if (!stats) return null;

  const totalOpenTickets = locations.reduce((sum, l) => sum + l.open_tickets, 0);
  const criticalTickets = allTickets.filter(t => t.priority === 'critical');
  const highTickets = allTickets.filter(t => t.priority === 'high');
  const locationsWithIssues = locations.filter(l => l.open_tickets > 0);

  return (
    <div className="space-y-4 animate-fade-in" data-testid="dashboard-page">
      {/* RED ALERT Banner */}
      {redAlert && !redAlertDismissed && criticalTickets.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-red-500 animate-pulse" data-testid="red-alert-banner"
          style={{ background: 'linear-gradient(90deg, rgba(255,0,0,0.15) 0%, rgba(255,0,0,0.05) 50%, rgba(255,0,0,0.15) 100%)' }}>
          {/* Scan line effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-full h-1 bg-red-500/20"
              style={{ animation: 'scan 2s linear infinite' }} />
          </div>
          <div className="px-6 py-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="text-red-500" size={28} />
                <div>
                  <h2 className="text-red-500 font-lcars text-2xl tracking-[0.4em] font-bold">ROTER ALARM</h2>
                  <p className="text-red-400/80 font-lcars text-[10px] tracking-[0.3em]">KRITISCHE SYSTEMANLIEGEN ERKANNT</p>
                </div>
              </div>
              <div className="hidden md:flex gap-3 ml-6">
                {criticalTickets.map(t => {
                  const loc = locations.find(l => l.location_id === t.location_id);
                  return (
                    <button key={t.ticket_id} data-testid={`alert-ticket-${t.ticket_id}`}
                      onClick={() => { play('buttonPress'); onNavigate('enterprise'); }}
                      className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/20 transition-all">
                      <span className="text-red-400 font-lcars text-[10px] tracking-wider block">{loc?.name || t.location_id}</span>
                      <span className="text-white font-lcars-body text-xs">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button data-testid="dismiss-alert-btn"
              onClick={() => { play('computerAck'); setRedAlertDismissed(true); }}
              className="bg-red-500/20 text-red-400 rounded-full px-4 py-1.5 font-lcars text-[10px] tracking-wider hover:bg-red-500 hover:text-black transition-all flex-shrink-0">
              BESTAETIGT
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.3em] text-lcars-orange uppercase font-lcars" data-testid="dashboard-title">
          BRUECKE
        </h1>
        <span className="font-lcars text-lcars-gray text-xs tracking-[0.2em]">STERNZEIT {stardate}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="stats-grid">
        <StatCard icon={<FileText size={24} />} label="ARTIKEL" value={stats.total_articles} color="lcars-orange" testId="stat-articles" />
        <StatCard icon={<FolderOpen size={24} />} label="STANDORTE" value={locations.length} color="lcars-blue" testId="stat-locations" />
        <StatCard icon={<AlertTriangle size={24} />} label="OFFENE ANLIEGEN" value={totalOpenTickets} color={totalOpenTickets > 0 ? 'lcars-red' : 'lcars-tan'} testId="stat-tickets" />
        <StatCard icon={<Shield size={24} />} label="ALARM-STATUS" value={criticalTickets.length > 0 ? 'ROT' : 'GRUEN'}
          color={criticalTickets.length > 0 ? 'lcars-red' : 'lcars-tan'} testId="stat-alert" />
      </div>

      {/* Main tactical area */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Tactical Radar */}
        <div className="border-2 border-lcars-orange/40 rounded-2xl p-4 relative overflow-hidden" data-testid="tactical-radar">
          <h2 className="text-lcars-orange font-lcars text-sm tracking-[0.25em] uppercase mb-2">TAKTISCHE ANZEIGE</h2>
          <div className="flex justify-center">
            <canvas ref={radarRef} className="w-[240px] h-[240px] md:w-[280px] md:h-[280px]" />
          </div>
          <div className="flex justify-center gap-4 mt-2">
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
        </div>

        {/* Live Ticket Feed */}
        <div className="md:col-span-2 border-2 border-lcars-red/30 rounded-2xl p-4 overflow-hidden" data-testid="live-ticket-feed">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lcars-orange font-lcars text-sm tracking-[0.25em] uppercase">STANDORT-STATUS LIVE</h2>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-lcars-tan animate-pulse" />
              <span className="font-lcars text-[8px] text-lcars-tan tracking-wider">ECHTZEIT</span>
            </span>
          </div>

          {locationsWithIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="text-lcars-tan mb-3" size={48} />
              <p className="text-lcars-tan font-lcars text-lg tracking-[0.2em]">ALLE SYSTEME NOMINAL</p>
              <p className="text-lcars-gray font-lcars text-[10px] tracking-wider mt-1">KEINE OFFENEN ANLIEGEN</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {locations.filter(l => l.open_tickets > 0).sort((a, b) => b.critical_tickets - a.critical_tickets).map(loc => {
                const locTickets = allTickets.filter(t => t.location_id === loc.location_id);
                return (
                  <button key={loc.location_id} data-testid={`status-loc-${loc.location_id}`}
                    onClick={() => { play('panelOpen'); onNavigate('enterprise'); }}
                    className="w-full text-left rounded-xl px-4 py-3 border transition-all hover:bg-white/5 group"
                    style={{ borderColor: `${loc.critical_tickets > 0 ? '#FF3333' : loc.color}40` }}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-3 h-10 rounded-full" style={{ background: loc.color }} />
                        {loc.critical_tickets > 0 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-lcars text-sm tracking-wider group-hover:text-lcars-orange transition-colors" style={{ color: loc.color }}>
                            {loc.name}
                          </span>
                          <span className="font-lcars text-[9px] text-lcars-gray tracking-wider">{loc.ship_section}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {locTickets.slice(0, 3).map(t => (
                            <span key={t.ticket_id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-lcars tracking-wider"
                              style={{ background: `${t.priority === 'critical' ? '#FF3333' : t.priority === 'high' ? '#CC6666' : '#FF9900'}15`,
                                       color: t.priority === 'critical' ? '#FF3333' : t.priority === 'high' ? '#CC6666' : '#FF9900' }}>
                              {t.priority === 'critical' && <AlertTriangle size={8} />}
                              {t.title.length > 25 ? t.title.slice(0, 25) + '...' : t.title}
                            </span>
                          ))}
                          {locTickets.length > 3 && (
                            <span className="text-lcars-gray font-lcars text-[9px]">+{locTickets.length - 3} WEITERE</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-lcars text-xl font-bold" style={{ color: loc.critical_tickets > 0 ? '#FF3333' : '#FF9900' }}>
                          {loc.open_tickets}
                        </div>
                        <div className="font-lcars text-[8px] text-lcars-gray tracking-wider">OFFEN</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Category overview */}
        <div className="border-2 border-lcars-blue rounded-2xl p-5" data-testid="category-panel">
          <h2 className="text-lcars-orange font-lcars text-sm tracking-[0.25em] uppercase mb-3 border-b border-lcars-blue/30 pb-2">
            DATENBANKMODULE
          </h2>
          <div className="space-y-1">
            {stats.category_stats.map((cat) => (
              <button key={cat.category_id} data-testid={`cat-btn-${cat.category_id}`}
                onClick={() => { play('buttonPress'); onNavigate('knowledge', { category: cat.category_id }); }}
                className="w-full flex items-center gap-3 rounded-full px-4 py-1.5 hover:bg-white/5 transition-all group">
                <div className={`w-6 h-6 rounded-full ${COLOR_MAP[cat.color] || 'bg-lcars-orange'} flex items-center justify-center text-xs text-black font-bold`}>
                  {cat.count}
                </div>
                <span className={`font-lcars text-xs tracking-[0.15em] flex-1 text-left ${TEXT_COLOR_MAP[cat.color] || 'text-lcars-orange'}`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent articles */}
        <div className="border-2 border-lcars-orange rounded-2xl p-5" data-testid="recent-panel">
          <h2 className="text-lcars-orange font-lcars text-sm tracking-[0.25em] uppercase mb-3 border-b border-lcars-orange/30 pb-2">
            LETZTE EINTRAEGE
          </h2>
          <div className="space-y-1">
            {stats.recent_articles.map((art) => (
              <button key={art.article_id} data-testid={`recent-art-${art.article_id}`}
                onClick={() => { play('buttonPress'); onNavigate('article', { articleId: art.article_id }); }}
                className="w-full text-left rounded-lg px-3 py-2 hover:bg-white/5 transition-all border border-transparent hover:border-lcars-orange/20 group">
                <h3 className="text-white font-lcars text-xs tracking-wider group-hover:text-lcars-orange transition-colors truncate">
                  {art.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-lcars-blue font-lcars tracking-wider">{art.category_id?.toUpperCase()}</span>
                  <span className="text-[9px] text-lcars-gray">{new Date(art.created_at).toLocaleDateString('de-DE')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Star Trek Quote */}
      <div className="border-2 border-lcars-blue/30 rounded-2xl p-4 relative overflow-hidden" data-testid="quote-panel">
        <div className="absolute top-0 right-0 w-32 h-32 bg-lcars-blue/5 rounded-bl-full" />
        <div className="flex items-start gap-3">
          <Quote className="text-lcars-blue/40 flex-shrink-0 mt-1" size={22} />
          <div className={`transition-all duration-500 ${quoteFade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <p className="font-lcars-body text-white/90 text-sm md:text-base leading-relaxed italic" data-testid="quote-text">
              &laquo;{quote.text}&raquo;
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-[1px] w-8 bg-lcars-blue/30" />
              <span className="font-lcars text-lcars-blue text-[9px] tracking-[0.25em]" data-testid="quote-author">
                {quote.author.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, testId }) {
  const bgColor = COLOR_MAP[color] || 'bg-lcars-orange';
  return (
    <div className={`border-2 border-${color} rounded-2xl p-3 relative overflow-hidden`} data-testid={testId}>
      <div className={`absolute top-0 right-0 w-12 h-12 ${bgColor} opacity-5 rounded-bl-full`} />
      <div className={`text-${color} mb-1`}>{icon}</div>
      <div className={`text-xl md:text-2xl font-bold font-lcars text-${color}`}>{value}</div>
      <div className="text-lcars-gray font-lcars text-[9px] tracking-[0.15em] mt-0.5">{label}</div>
    </div>
  );
}
