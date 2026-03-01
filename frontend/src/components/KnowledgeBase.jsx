import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Search, ChevronRight, FolderOpen, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLCARSSound } from '../hooks/useLCARSSound';

const COLOR_MAP = {
  'lcars-red': 'bg-lcars-red', 'lcars-orange': 'bg-lcars-orange', 'lcars-blue': 'bg-lcars-blue',
  'lcars-pink': 'bg-lcars-pink', 'lcars-tan': 'bg-lcars-tan',
};
const BORDER_MAP = {
  'lcars-red': 'border-lcars-red', 'lcars-orange': 'border-lcars-orange', 'lcars-blue': 'border-lcars-blue',
  'lcars-pink': 'border-lcars-pink', 'lcars-tan': 'border-lcars-tan',
};

export default function KnowledgeBase({ onNavigate, initialCategory }) {
  const { user, token } = useAuth();
  const { play } = useLCARSSound();
  const isCaptain = user?.role === 'captain';
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(initialCategory || null);
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (activeCategory) params.category = activeCategory;
    if (search) params.search = search;
    api.getArticles(params).then(setArticles).catch(console.error).finally(() => setLoading(false));
  }, [activeCategory, search]);

  const handleViewArticle = async (articleId) => {
    play('panelOpen');
    try {
      const art = await api.getArticle(articleId);
      setSelectedArticle(art);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteArticle = async () => {
    if (!selectedArticle) return;
    try {
      await api.deleteArticle(token, selectedArticle.article_id);
      play('computerAck');
      setSelectedArticle(null);
      setShowDeleteConfirm(false);
      // Refresh articles
      const params = {};
      if (activeCategory) params.category = activeCategory;
      if (search) params.search = search;
      const updated = await api.getArticles(params);
      setArticles(updated);
    } catch (e) {
      play('alert');
      console.error(e);
    }
  };

  if (selectedArticle) {
    const cat = categories.find(c => c.category_id === selectedArticle.category_id);
    return (
      <div className="animate-fade-in max-w-4xl" data-testid="article-detail">
        <button
          data-testid="back-to-list-btn"
          onClick={() => { play('navigate'); setSelectedArticle(null); }}
          className="flex items-center gap-2 text-lcars-blue font-lcars text-sm tracking-wider mb-4 hover:text-lcars-orange transition-colors"
        >
          <ArrowLeft size={16} /> ZURUECK ZUR DATENBANK
        </button>

        <div className={`border-2 ${BORDER_MAP[cat?.color] || 'border-lcars-orange'} rounded-2xl overflow-hidden`}>
          {/* Article header */}
          <div className={`${COLOR_MAP[cat?.color] || 'bg-lcars-orange'} px-6 py-3 flex items-center justify-between`}>
            <span className="text-black font-lcars text-xs tracking-[0.2em] font-bold">{cat?.name || 'ARTIKEL'}</span>
            <div className="flex items-center gap-3">
              {isCaptain && (
                <>
                  <button
                    data-testid="edit-article-btn"
                    onClick={() => { play('buttonPress'); onNavigate('create', { editId: selectedArticle.article_id }); }}
                    className="text-black/70 hover:text-black transition-colors"
                    title="Bearbeiten"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    data-testid="delete-article-btn"
                    onClick={() => { play('alert'); setShowDeleteConfirm(true); }}
                    className="text-black/70 hover:text-black transition-colors"
                    title="Loeschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
              <span className="text-black/60 font-lcars text-[10px]">
                {new Date(selectedArticle.created_at).toLocaleDateString('de-DE')}
              </span>
            </div>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="bg-lcars-red/10 border-b border-lcars-red/30 px-6 py-4 flex items-center justify-between" data-testid="delete-confirm">
              <span className="text-lcars-red font-lcars text-sm tracking-wider">ARTIKEL WIRKLICH LOESCHEN?</span>
              <div className="flex gap-2">
                <button
                  data-testid="confirm-delete-btn"
                  onClick={handleDeleteArticle}
                  className="bg-lcars-red text-black rounded-full px-5 py-1.5 font-lcars text-xs tracking-wider font-bold hover:bg-white transition-all"
                >
                  LOESCHEN
                </button>
                <button
                  data-testid="cancel-delete-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-lcars-gray/20 text-lcars-gray rounded-full px-5 py-1.5 font-lcars text-xs tracking-wider hover:bg-lcars-gray/30 transition-all"
                >
                  ABBRECHEN
                </button>
              </div>
            </div>
          )}

          <div className="p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-lcars-orange font-lcars tracking-[0.15em] uppercase mb-2" data-testid="article-title">
              {selectedArticle.title}
            </h1>
            {selectedArticle.summary && (
              <p className="text-lcars-tan font-lcars-body text-sm mb-4 border-l-2 border-lcars-orange/30 pl-3">{selectedArticle.summary}</p>
            )}
            {selectedArticle.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedArticle.tags.map(tag => (
                  <span key={tag} className="bg-lcars-blue/10 text-lcars-blue rounded-full px-3 py-0.5 font-lcars text-[10px] tracking-widest uppercase">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="article-content" data-testid="article-content">
              <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in" data-testid="knowledge-base-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.3em] text-lcars-orange uppercase font-lcars" data-testid="kb-title">
          DATENBANK
        </h1>
      </div>

      {/* Search bar */}
      <div className="relative" data-testid="search-container">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-lcars-orange" size={18} />
        <input
          data-testid="search-input"
          type="text"
          placeholder="DATENBANK DURCHSUCHEN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black border-2 border-lcars-orange/40 rounded-full pl-12 pr-4 py-3 text-white font-lcars text-sm tracking-wider focus:border-lcars-orange focus:outline-none placeholder:text-lcars-gray/50 placeholder:tracking-[0.2em]"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2" data-testid="category-filters">
        <button
          data-testid="cat-filter-all"
          onClick={() => { play('buttonPress'); setActiveCategory(null); }}
          className={`rounded-full px-5 py-1.5 font-lcars text-xs tracking-[0.2em] transition-all ${!activeCategory ? 'bg-lcars-orange text-black' : 'bg-lcars-orange/10 text-lcars-orange hover:bg-lcars-orange/20'}`}
        >
          ALLE
        </button>
        {categories.map(cat => (
          <button
            key={cat.category_id}
            data-testid={`cat-filter-${cat.category_id}`}
            onClick={() => { play('buttonPress'); setActiveCategory(cat.category_id); }}
            className={`rounded-full px-5 py-1.5 font-lcars text-xs tracking-[0.2em] transition-all ${activeCategory === cat.category_id
              ? `${COLOR_MAP[cat.color] || 'bg-lcars-orange'} text-black`
              : `${COLOR_MAP[cat.color] || 'bg-lcars-orange'}/10 text-${cat.color || 'lcars-orange'} hover:opacity-80`
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Article list */}
      {loading ? (
        <div className="text-lcars-orange font-lcars tracking-[0.3em] text-center py-12 animate-pulse">
          DATENBANK WIRD ABGEFRAGT...
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 border-2 border-lcars-gray/20 rounded-2xl">
          <FolderOpen className="mx-auto text-lcars-gray mb-3" size={48} />
          <p className="text-lcars-gray font-lcars tracking-[0.2em]">KEINE EINTRAEGE GEFUNDEN</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="article-list">
          {articles.map((art) => {
            const cat = categories.find(c => c.category_id === art.category_id);
            return (
              <button
                key={art.article_id}
                data-testid={`article-item-${art.article_id}`}
                onClick={() => handleViewArticle(art.article_id)}
                className={`w-full text-left border ${BORDER_MAP[cat?.color] || 'border-lcars-orange'}/30 rounded-xl px-5 py-4 hover:bg-white/5 transition-all group flex items-center gap-4`}
              >
                <div className={`w-2 h-12 rounded-full ${COLOR_MAP[cat?.color] || 'bg-lcars-orange'} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-lcars text-sm tracking-wider group-hover:text-lcars-orange transition-colors truncate">
                    {art.title}
                  </h3>
                  <p className="text-lcars-gray text-xs font-lcars-body mt-1 line-clamp-1">{art.summary}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-lcars tracking-wider ${cat?.color ? `text-${cat.color}` : 'text-lcars-orange'}`}>
                      {cat?.name}
                    </span>
                    <span className="text-[10px] text-lcars-gray font-lcars">
                      {new Date(art.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="text-lcars-gray group-hover:text-lcars-orange transition-colors flex-shrink-0" size={18} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
