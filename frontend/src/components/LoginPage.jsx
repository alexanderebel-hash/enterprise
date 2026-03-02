import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Shield } from 'lucide-react';
import { getRandomQuote } from '../data/quotes';
import { useLCARSSound } from '../hooks/useLCARSSound';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const { play } = useLCARSSound();
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [quote, setQuote] = useState(getRandomQuote());
  const [quoteFade, setQuoteFade] = useState(true);

  // Rotate quotes every 12 seconds on login page
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => {
        setQuote(getRandomQuote());
        setQuoteFade(true);
      }, 400);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Benutzername und Passwort erforderlich');
      return;
    }
    setError('');
    play('buttonPress');
    try {
      await login(username.trim(), password);
      play('accessGranted');
    } catch (err) {
      setError('Zugriff verweigert. Ungueltige Anmeldedaten.');
      play('alert');
    }
  };

  return (
    <div className="h-screen bg-black flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-lg">
        {/* Header bar */}
        <div className="flex items-stretch mb-8">
          <div className="bg-lcars-orange rounded-tl-[40px] w-48 h-16 flex items-center pl-6">
            <span className="lcars-number">NCC-1701-D</span>
          </div>
          <div className="bg-lcars-orange h-4 flex-1 mt-0 rounded-tr-full" />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-bold tracking-[0.3em] text-lcars-orange uppercase font-lcars">
            LCARS ZUGANG
          </h1>
          <p className="text-lcars-tan mt-3 tracking-widest uppercase text-sm font-lcars">
            Wissensdatenbank USS Enterprise
          </p>
          <p className="text-lcars-gray mt-1 tracking-wider text-xs font-lcars">
            Identifikation erforderlich
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="border-2 border-lcars-orange rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-lcars-orange/20 flex items-center justify-center">
                <Shield className="text-lcars-orange" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-[0.2em] uppercase font-lcars text-lcars-orange">
                  ANMELDUNG
                </h2>
                <p className="text-lcars-gray text-xs tracking-widest uppercase font-lcars">Crew-Identifikation</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-lcars-tan text-xs tracking-widest uppercase font-lcars mb-2">
                  Benutzername
                </label>
                <input
                  type="text"
                  data-testid="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  className="w-full bg-black/50 border border-lcars-orange/40 rounded-lg px-4 py-3 text-lcars-orange font-lcars-body focus:outline-none focus:border-lcars-orange transition-colors"
                  placeholder="Crew-ID eingeben"
                />
              </div>
              <div>
                <label className="block text-lcars-tan text-xs tracking-widest uppercase font-lcars mb-2">
                  Passwort
                </label>
                <input
                  type="password"
                  data-testid="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-black/50 border border-lcars-orange/40 rounded-lg px-4 py-3 text-lcars-orange font-lcars-body focus:outline-none focus:border-lcars-orange transition-colors"
                  placeholder="Autorisierungscode"
                />
              </div>
            </div>

            <button
              type="submit"
              data-testid="login-submit"
              disabled={loading}
              className="w-full mt-6 bg-lcars-orange text-black font-lcars tracking-[0.2em] uppercase py-3 rounded-lg hover:bg-lcars-orange/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'AUTORISIERUNG...' : 'ZUGANG ANFORDERN'}
            </button>
          </div>
        </form>

        {/* Rotating Quote */}
        <div className={`mt-8 text-center transition-all duration-500 ${quoteFade ? 'opacity-100' : 'opacity-0'}`} data-testid="login-quote">
          <p className="font-lcars-body text-white/60 text-sm italic max-w-md mx-auto leading-relaxed">
            &laquo;{quote.text}&raquo;
          </p>
          <p className="font-lcars text-lcars-blue/50 text-[9px] tracking-[0.25em] mt-2">
            {quote.author.toUpperCase()}
          </p>
        </div>

        {error && (
          <div className="mt-6 text-center text-lcars-red tracking-wider uppercase text-sm font-lcars" data-testid="login-error">
            {error}
          </div>
        )}

        {/* Footer bar */}
        <div className="flex items-stretch mt-10">
          <div className="bg-lcars-blue rounded-bl-[40px] w-48 h-8 flex items-center pl-6">
            <span className="lcars-number text-black">47148.2</span>
          </div>
          <div className="bg-lcars-blue h-2 flex-1 mt-auto rounded-br-full" />
        </div>
      </div>
    </div>
  );
}
