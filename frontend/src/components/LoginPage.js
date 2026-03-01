import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Shield, User } from 'lucide-react';
import { getRandomQuote } from '../data/quotes';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
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

  const roles = [
    {
      id: 'captain',
      label: 'CAPTAIN P',
      subtitle: 'Kommandant / Ersteller',
      user: 'captain',
      pass: 'engage',
      icon: Shield,
      color: 'lcars-orange',
      desc: 'Vollzugriff auf alle Systeme. Artikel erstellen, bearbeiten und verwalten.',
    },
    {
      id: 'nummer1',
      label: 'NUMMER EINS',
      subtitle: 'Erster Offizier / Leser',
      user: 'nummer1',
      pass: 'makeitso',
      icon: User,
      color: 'lcars-blue',
      desc: 'Lesezugriff auf die Wissensdatenbank und Computer-Zugang.',
    },
  ];

  const handleLogin = async (role) => {
    setSelected(role.id);
    setError('');
    try {
      await login(role.user, role.pass);
    } catch (e) {
      setError(e.message);
      setSelected(null);
    }
  };

  return (
    <div className="h-screen bg-black flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-2xl">
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

        <div className="grid md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            const isActive = selected === role.id;
            const borderColor = role.color === 'lcars-orange' ? 'border-lcars-orange' : 'border-lcars-blue';
            const bgHover = role.color === 'lcars-orange' ? 'hover:bg-lcars-orange/10' : 'hover:bg-lcars-blue/10';
            const textColor = role.color === 'lcars-orange' ? 'text-lcars-orange' : 'text-lcars-blue';

            return (
              <button
                key={role.id}
                data-testid={`login-btn-${role.id}`}
                onClick={() => handleLogin(role)}
                disabled={loading}
                className={`border-2 ${borderColor} rounded-2xl p-6 text-left transition-all duration-300 ${bgHover} ${isActive ? 'scale-95 opacity-70' : ''} disabled:opacity-50`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-${role.color}/20 flex items-center justify-center`}>
                    <Icon className={textColor} size={24} />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold tracking-[0.2em] uppercase font-lcars ${textColor}`}>
                      {role.label}
                    </h2>
                    <p className="text-lcars-gray text-xs tracking-widest uppercase font-lcars">{role.subtitle}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm font-lcars-body leading-relaxed">{role.desc}</p>
                <div className={`mt-4 h-1 rounded-full bg-${role.color}/30`}>
                  {isActive && <div className={`h-full bg-${role.color} rounded-full animate-pulse`} style={{ width: '60%' }} />}
                </div>
              </button>
            );
          })}
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
