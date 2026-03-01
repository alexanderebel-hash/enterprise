import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Send, Loader2, Terminal, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ComputerChat() {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setSending(true);

    try {
      const res = await api.chat(token, text, sessionId);
      setSessionId(res.session_id);
      setMessages(prev => [...prev, { role: 'computer', content: res.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'computer', content: `Systemfehler: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in" data-testid="computer-chat-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Terminal className="text-lcars-pink" size={24} />
          <h1 className="text-3xl md:text-4xl font-bold tracking-[0.3em] text-lcars-orange uppercase font-lcars" data-testid="chat-title">
            COMPUTER
          </h1>
        </div>
        {messages.length > 0 && (
          <button
            data-testid="clear-chat-btn"
            onClick={clearChat}
            className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-lcars-red/10 text-lcars-red hover:bg-lcars-red hover:text-black transition-all font-lcars text-xs tracking-wider"
          >
            <Trash2 size={14} /> LOESCHEN
          </button>
        )}
      </div>

      <div className="text-lcars-gray font-lcars text-[10px] tracking-[0.3em] mb-3">
        SPRACHSCHNITTSTELLE AKTIV - WISSENSDATENBANK VERBUNDEN
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto border-2 border-lcars-pink/30 rounded-2xl p-4 space-y-4 bg-black/50"
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Terminal className="text-lcars-pink/30 mb-4" size={64} />
            <p className="text-lcars-pink font-lcars tracking-[0.2em] text-lg">BEREIT</p>
            <p className="text-lcars-gray font-lcars text-xs tracking-[0.15em] mt-2 max-w-md">
              Stellen Sie Fragen zur Wissensdatenbank. Der Computer durchsucht alle gespeicherten Artikel und Anleitungen.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['Welche Tools gibt es?', 'Wie richte ich Scribe ein?', 'Was kostet das Setup?'].map((q) => (
                <button
                  key={q}
                  data-testid={`suggestion-${q.slice(0, 10)}`}
                  onClick={() => { setInput(q); }}
                  className="rounded-full px-4 py-1.5 border border-lcars-pink/30 text-lcars-pink font-lcars text-xs tracking-wider hover:bg-lcars-pink/10 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            data-testid={`chat-msg-${i}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
              msg.role === 'user'
                ? 'bg-lcars-orange/15 border border-lcars-orange/30 text-white'
                : 'bg-lcars-pink/10 border border-lcars-pink/30 text-white'
            }`}>
              {msg.role === 'computer' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-lcars-pink animate-pulse" />
                  <span className="text-lcars-pink font-lcars text-[10px] tracking-[0.3em]">COMPUTER</span>
                </div>
              )}
              <div className="font-lcars-body text-sm leading-relaxed article-content">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start" data-testid="chat-loading">
            <div className="bg-lcars-pink/10 border border-lcars-pink/30 rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="text-lcars-pink animate-spin" size={16} />
                <span className="text-lcars-pink font-lcars text-xs tracking-[0.2em]">VERARBEITE ANFRAGE...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="mt-4 flex gap-3" data-testid="chat-input-area">
        <input
          data-testid="chat-input"
          type="text"
          placeholder="Frage an den Computer..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          className="flex-1 bg-black border-2 border-lcars-pink/40 rounded-full px-6 py-3 text-white font-lcars text-sm tracking-wider focus:border-lcars-pink focus:outline-none placeholder:text-lcars-gray/50 disabled:opacity-50"
        />
        <button
          data-testid="chat-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="bg-lcars-pink text-black rounded-full w-12 h-12 flex items-center justify-center hover:bg-lcars-blue transition-all disabled:opacity-30 disabled:hover:bg-lcars-pink flex-shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
