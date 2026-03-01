import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Save, ArrowLeft, Loader2, Tag, X } from 'lucide-react';

export default function ArticleEditor({ onNavigate, editArticleId }) {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
    if (editArticleId) {
      api.getArticle(editArticleId).then((art) => {
        setTitle(art.title);
        setSummary(art.summary || '');
        setContent(art.content);
        setCategoryId(art.category_id);
        setTags(art.tags || []);
      }).catch(console.error);
    }
  }, [editArticleId]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => setTags(tags.filter(t => t !== tag));

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !categoryId) {
      setError('Bitte alle Pflichtfelder ausfuellen');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = { title, summary, content, category_id: categoryId, tags };
      if (editArticleId) {
        await api.updateArticle(token, editArticleId, data);
      } else {
        await api.createArticle(token, data);
      }
      setSuccess(editArticleId ? 'Artikel aktualisiert!' : 'Artikel erstellt!');
      if (!editArticleId) {
        setTitle(''); setSummary(''); setContent(''); setCategoryId(''); setTags([]);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl animate-fade-in" data-testid="article-editor-page">
      <button
        data-testid="back-btn"
        onClick={() => onNavigate('knowledge')}
        className="flex items-center gap-2 text-lcars-blue font-lcars text-sm tracking-wider mb-4 hover:text-lcars-orange transition-colors"
      >
        <ArrowLeft size={16} /> ZURUECK
      </button>

      <h1 className="text-3xl font-bold tracking-[0.3em] text-lcars-orange uppercase font-lcars mb-6" data-testid="editor-title">
        {editArticleId ? 'EINTRAG BEARBEITEN' : 'NEUER LOGBUCH-EINTRAG'}
      </h1>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className="text-lcars-blue font-lcars text-xs tracking-[0.2em] block mb-2">TITEL *</label>
          <input
            data-testid="article-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel des Eintrags..."
            className="w-full bg-black border-2 border-lcars-blue/40 rounded-lg px-4 py-3 text-white font-lcars text-sm tracking-wider focus:border-lcars-orange focus:outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-lcars-blue font-lcars text-xs tracking-[0.2em] block mb-2">KATEGORIE *</label>
          <select
            data-testid="article-category-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-black border-2 border-lcars-blue/40 rounded-lg px-4 py-3 text-white font-lcars text-sm tracking-wider focus:border-lcars-orange focus:outline-none"
          >
            <option value="">Kategorie waehlen...</option>
            {categories.map(c => (
              <option key={c.category_id} value={c.category_id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Summary */}
        <div>
          <label className="text-lcars-blue font-lcars text-xs tracking-[0.2em] block mb-2">ZUSAMMENFASSUNG</label>
          <input
            data-testid="article-summary-input"
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Kurze Zusammenfassung..."
            className="w-full bg-black border-2 border-lcars-blue/40 rounded-lg px-4 py-3 text-white font-lcars text-sm tracking-wider focus:border-lcars-orange focus:outline-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-lcars-blue font-lcars text-xs tracking-[0.2em] block mb-2">TAGS</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {tags.map(tag => (
              <span key={tag} className="bg-lcars-blue/15 text-lcars-blue rounded-full px-3 py-1 font-lcars text-xs tracking-wider flex items-center gap-1">
                {tag}
                <button onClick={() => removeTag(tag)} data-testid={`remove-tag-${tag}`}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              data-testid="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Tag hinzufuegen..."
              className="flex-1 bg-black border border-lcars-blue/30 rounded-lg px-3 py-2 text-white font-lcars text-xs tracking-wider focus:border-lcars-orange focus:outline-none"
            />
            <button
              data-testid="add-tag-btn"
              onClick={addTag}
              className="bg-lcars-blue/20 text-lcars-blue rounded-lg px-4 py-2 font-lcars text-xs tracking-wider hover:bg-lcars-blue hover:text-black transition-all"
            >
              <Tag size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="text-lcars-blue font-lcars text-xs tracking-[0.2em] block mb-2">INHALT * (Markdown)</label>
          <textarea
            data-testid="article-content-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Inhalt des Eintrags (Markdown wird unterstuetzt)..."
            rows={14}
            className="w-full bg-black border-2 border-lcars-blue/40 rounded-lg px-4 py-3 text-white font-lcars-body text-sm leading-relaxed focus:border-lcars-orange focus:outline-none resize-y"
          />
        </div>

        {error && (
          <div className="text-lcars-red font-lcars text-sm tracking-wider" data-testid="editor-error">{error}</div>
        )}
        {success && (
          <div className="text-lcars-tan font-lcars text-sm tracking-wider" data-testid="editor-success">{success}</div>
        )}

        <button
          data-testid="save-article-btn"
          onClick={handleSave}
          disabled={saving}
          className="bg-lcars-orange text-black rounded-full px-8 py-3 font-lcars text-sm tracking-[0.2em] font-bold hover:bg-lcars-tan transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'SPEICHERE...' : 'EINTRAG SPEICHERN'}
        </button>
      </div>
    </div>
  );
}
