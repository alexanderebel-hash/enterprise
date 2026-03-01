import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Save, ArrowLeft, Loader2, Tag, X, Mic, Square, Upload, FileText } from 'lucide-react';
import { useLCARSSound } from '../hooks/useLCARSSound';

export default function ArticleEditor({ onNavigate, editArticleId }) {
  const { token, user } = useAuth();
  const { play } = useLCARSSound();
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

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stardate, setStardate] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // File import state
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileDrop = useCallback(async (file) => {
    if (!file) return;
    const allowed = ['.md', '.txt', '.markdown', '.html', '.htm', '.pdf'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Format nicht unterstuetzt: ${ext}. Erlaubt: ${allowed.join(', ')}`);
      play('alert');
      return;
    }
    setIsImporting(true);
    setError('');
    play('dataTransmit');
    try {
      const result = await api.importArticle(token, file);
      setTitle(result.title || '');
      setSummary(result.summary || '');
      setContent(result.content || '');
      setCategoryId(result.category_id || '');
      setTags(result.tags || []);
      play('computerAck');
      setSuccess(`Datei "${file.name}" importiert und analysiert!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(`Importfehler: ${e.message}`);
      play('alert');
    } finally {
      setIsImporting(false);
    }
  }, [token, play]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileDrop(file);
  }, [handleFileDrop]);

  const onDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
    api.getStardate().then(d => setStardate(d.stardate)).catch(() => setStardate('47148.2'));
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

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(blob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      play('recordStart');
      play('logbuchStart');

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (e) {
      setError('Mikrofon-Zugriff verweigert. Bitte erlauben Sie den Zugriff.');
      play('alert');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      play('recordStop');
    }
  };

  const transcribeAudio = async (blob) => {
    setIsTranscribing(true);
    play('dataTransmit');
    try {
      const result = await api.transcribe(token, blob);
      if (result.text) {
        // Append transcribed text to content
        const displayName = user?.display_name || 'Captain P';
        const prefix = content ? '\n\n' : '';
        const logPrefix = `${prefix}## Persoenlicher Logbucheintrag - ${displayName}, Sternzeit ${stardate}\n\n`;
        setContent(prev => prev + logPrefix + result.text);
        if (!title) setTitle(`Logbucheintrag - Sternzeit ${stardate}`);
        play('computerAck');
        setSuccess('Logbucheintrag transkribiert!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) {
      setError(`Transkriptionsfehler: ${e.message}`);
      play('alert');
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !categoryId) {
      setError('Bitte alle Pflichtfelder ausfuellen');
      play('alert');
      return;
    }
    setSaving(true);
    setError('');
    play('dataTransmit');
    try {
      const data = { title, summary, content, category_id: categoryId, tags };
      if (editArticleId) {
        await api.updateArticle(token, editArticleId, data);
      } else {
        await api.createArticle(token, data);
      }
      play('accessGranted');
      setSuccess(editArticleId ? 'Artikel aktualisiert!' : 'Artikel erstellt!');
      if (!editArticleId) {
        setTitle(''); setSummary(''); setContent(''); setCategoryId(''); setTags([]);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
      play('alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl animate-fade-in" data-testid="article-editor-page">
      <button
        data-testid="back-btn"
        onClick={() => { play('navigate'); onNavigate('knowledge'); }}
        className="flex items-center gap-2 text-lcars-blue font-lcars text-sm tracking-wider mb-4 hover:text-lcars-orange transition-colors"
      >
        <ArrowLeft size={16} /> ZURUECK
      </button>

      <h1 className="text-3xl font-bold tracking-[0.3em] text-lcars-orange uppercase font-lcars mb-2" data-testid="editor-title">
        {editArticleId ? 'EINTRAG BEARBEITEN' : 'NEUER LOGBUCH-EINTRAG'}
      </h1>
      <p className="text-lcars-gray font-lcars text-[10px] tracking-[0.3em] mb-6">STERNZEIT {stardate}</p>

      {/* Voice Recording Section */}
      <div className="border-2 border-lcars-pink/40 rounded-2xl p-5 mb-6 relative overflow-hidden" data-testid="voice-recorder">
        <div className="absolute top-0 right-0 w-24 h-24 bg-lcars-pink/5 rounded-bl-full" />
        <h2 className="text-lcars-pink font-lcars text-sm tracking-[0.2em] mb-3 flex items-center gap-2">
          <Mic size={16} />
          PERSOENLICHER LOGBUCHEINTRAG
        </h2>
        <p className="text-lcars-gray font-lcars-body text-xs mb-4">
          Sprechen Sie Ihren Logbucheintrag. Der Computer transkribiert automatisch.
        </p>

        <div className="flex items-center gap-4">
          {!isRecording ? (
            <button
              data-testid="start-recording-btn"
              onClick={startRecording}
              disabled={isTranscribing}
              className="flex items-center gap-2 bg-lcars-pink text-black rounded-full px-6 py-2.5 font-lcars text-xs tracking-[0.2em] font-bold hover:bg-lcars-blue transition-all disabled:opacity-50"
            >
              <Mic size={16} />
              {isTranscribing ? 'TRANSKRIBIERE...' : 'AUFZEICHNUNG STARTEN'}
            </button>
          ) : (
            <button
              data-testid="stop-recording-btn"
              onClick={stopRecording}
              className="flex items-center gap-2 bg-lcars-red text-black rounded-full px-6 py-2.5 font-lcars text-xs tracking-[0.2em] font-bold hover:bg-white transition-all animate-pulse"
            >
              <Square size={16} />
              AUFZEICHNUNG STOPPEN
            </button>
          )}

          {isRecording && (
            <div className="flex items-center gap-3" data-testid="recording-indicator">
              <div className="w-3 h-3 bg-lcars-red rounded-full animate-pulse" />
              <span className="font-lcars text-lcars-red text-sm tracking-wider">{formatTime(recordingTime)}</span>
              <span className="font-lcars text-lcars-gray text-[10px] tracking-wider">AUFNAHME LAEUFT</span>
            </div>
          )}

          {isTranscribing && (
            <div className="flex items-center gap-2" data-testid="transcribing-indicator">
              <Loader2 size={16} className="text-lcars-pink animate-spin" />
              <span className="font-lcars text-lcars-pink text-xs tracking-wider">WHISPER ANALYSE...</span>
            </div>
          )}
        </div>

        <div className="mt-3 text-lcars-gray font-lcars text-[9px] tracking-[0.2em]">
          PERSOENLICHER LOGBUCHEINTRAG, {user?.display_name?.toUpperCase()}, STERNZEIT {stardate}
        </div>
      </div>

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
