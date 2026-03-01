import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FileText, FolderOpen, TrendingUp, Clock } from 'lucide-react';

const ICON_MAP = { wrench: '🔧', 'book-open': '📖', workflow: '⚙️', settings: '🔩', video: '📹' };
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lcars-orange font-lcars tracking-[0.3em] text-2xl animate-pulse">LADE SYSTEME...</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.3em] text-lcars-orange uppercase font-lcars" data-testid="dashboard-title">
          BRUECKE
        </h1>
        <span className="lcars-number">STERNZEIT 47148.2</span>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="stats-grid">
        <StatCard
          icon={<FileText size={24} />}
          label="ARTIKEL"
          value={stats.total_articles}
          color="lcars-orange"
          testId="stat-articles"
        />
        <StatCard
          icon={<FolderOpen size={24} />}
          label="KATEGORIEN"
          value={stats.total_categories}
          color="lcars-blue"
          testId="stat-categories"
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          label="SYSTEME"
          value="ONLINE"
          color="lcars-tan"
          testId="stat-systems"
        />
        <StatCard
          icon={<Clock size={24} />}
          label="STATUS"
          value="AKTIV"
          color="lcars-pink"
          testId="stat-status"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category overview */}
        <div className="border-2 border-lcars-blue rounded-2xl p-5" data-testid="category-panel">
          <h2 className="text-lcars-orange font-lcars text-xl tracking-[0.2em] uppercase mb-4 border-b border-lcars-blue/30 pb-2">
            DATENBANKMODULE
          </h2>
          <div className="space-y-2">
            {stats.category_stats.map((cat) => (
              <button
                key={cat.category_id}
                data-testid={`cat-btn-${cat.category_id}`}
                onClick={() => onNavigate('knowledge', { category: cat.category_id })}
                className="w-full flex items-center gap-3 rounded-full px-4 py-2 hover:bg-white/5 transition-all group"
              >
                <div className={`w-8 h-8 rounded-full ${COLOR_MAP[cat.color] || 'bg-lcars-orange'} flex items-center justify-center text-sm`}>
                  {cat.count}
                </div>
                <span className={`font-lcars text-sm tracking-[0.15em] flex-1 text-left ${TEXT_COLOR_MAP[cat.color] || 'text-lcars-orange'} group-hover:tracking-[0.2em] transition-all`}>
                  {cat.name}
                </span>
                <span className="text-lcars-gray text-xs font-lcars">{cat.count} EINTRAEGE</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent articles */}
        <div className="border-2 border-lcars-orange rounded-2xl p-5" data-testid="recent-panel">
          <h2 className="text-lcars-orange font-lcars text-xl tracking-[0.2em] uppercase mb-4 border-b border-lcars-orange/30 pb-2">
            LETZTE EINTRAEGE
          </h2>
          <div className="space-y-2">
            {stats.recent_articles.map((art) => (
              <button
                key={art.article_id}
                data-testid={`recent-art-${art.article_id}`}
                onClick={() => onNavigate('article', { articleId: art.article_id })}
                className="w-full text-left rounded-lg px-4 py-3 hover:bg-white/5 transition-all border border-transparent hover:border-lcars-orange/20 group"
              >
                <h3 className="text-white font-lcars text-sm tracking-wider group-hover:text-lcars-orange transition-colors">
                  {art.title}
                </h3>
                <p className="text-lcars-gray text-xs font-lcars-body mt-1 line-clamp-1">{art.summary}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-lcars-blue font-lcars tracking-wider">{art.category_id?.toUpperCase()}</span>
                  <span className="text-[10px] text-lcars-gray">{new Date(art.created_at).toLocaleDateString('de-DE')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System info bar */}
      <div className="flex flex-wrap gap-2 mt-4" data-testid="system-info">
        {['WARP-KERN: STABIL', 'SCHILDE: 100%', 'SENSOREN: AKTIV', 'COMPUTER-KERN: ONLINE'].map((s, i) => (
          <div key={i} className="bg-lcars-blue/10 border border-lcars-blue/30 rounded-full px-4 py-1">
            <span className="text-lcars-blue font-lcars text-[10px] tracking-[0.2em]">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, testId }) {
  const bgColor = COLOR_MAP[color] || 'bg-lcars-orange';
  return (
    <div className={`border-2 border-${color} rounded-2xl p-4 relative overflow-hidden`} data-testid={testId}>
      <div className={`absolute top-0 right-0 w-16 h-16 ${bgColor} opacity-5 rounded-bl-full`} />
      <div className={`text-${color} mb-2`}>{icon}</div>
      <div className={`text-2xl md:text-3xl font-bold font-lcars text-${color}`}>{value}</div>
      <div className="text-lcars-gray font-lcars text-[10px] tracking-[0.2em] mt-1">{label}</div>
    </div>
  );
}
