import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import {
  LayoutDashboard, Database, MessageSquare, PlusCircle,
  LogOut, Menu, X, ChevronRight
} from 'lucide-react';
import { useLCARSSound } from '../hooks/useLCARSSound';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'BRUECKE', icon: LayoutDashboard, color: 'bg-lcars-orange' },
  { id: 'knowledge', label: 'DATENBANK', icon: Database, color: 'bg-lcars-blue' },
  { id: 'chat', label: 'COMPUTER', icon: MessageSquare, color: 'bg-lcars-pink' },
  { id: 'create', label: 'LOGBUCH', icon: PlusCircle, color: 'bg-lcars-tan', captainOnly: true },
];

export default function LCARSLayout({ children, activePage, onNavigate }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCaptain = user?.role === 'captain';

  const filteredNav = NAV_ITEMS.filter(n => !n.captainOnly || isCaptain);

  const handleNav = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden" data-testid="lcars-layout">
      {/* Top Header Bar */}
      <header className="flex-shrink-0 flex items-stretch" data-testid="lcars-header">
        {/* Elbow top-left */}
        <div className="hidden md:flex flex-col w-[220px] flex-shrink-0">
          <div className="bg-lcars-orange h-10 rounded-tl-[40px] flex items-center px-5">
            <span className="text-black font-lcars text-xs tracking-[0.3em] font-bold">LCARS 47</span>
          </div>
        </div>
        {/* Top bar */}
        <div className="flex-1 flex items-stretch gap-1 h-10">
          <div className="bg-lcars-orange flex-1 rounded-none flex items-center justify-between px-4">
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-black"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="hidden md:block" />
            <span className="text-black font-lcars text-sm tracking-[0.25em] font-bold uppercase">
              WISSENSDATENBANK
            </span>
            <span className="text-black font-lcars text-[10px] tracking-wider hidden sm:block">
              USS ENTERPRISE NCC-1701-D
            </span>
          </div>
          <div className="bg-lcars-tan w-24 hidden sm:flex items-center justify-center">
            <span className="text-black font-lcars text-[10px] tracking-widest">SD 47148</span>
          </div>
          <div className="bg-lcars-orange w-16 rounded-tr-full" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          className={`lcars-sidebar ${mobileOpen ? 'mobile-open' : ''} w-[220px] flex-shrink-0 flex flex-col bg-black`}
          data-testid="lcars-sidebar"
        >
          {/* Elbow connector */}
          <div className="hidden md:block relative">
            <div className="bg-lcars-orange w-full h-6" />
            <div className="bg-lcars-orange w-[180px] h-8 rounded-br-[32px]">
              <div className="bg-black w-full h-full rounded-br-[32px]" />
            </div>
          </div>

          {/* User badge */}
          <div className="p-4 mt-2">
            <div className={`rounded-full px-4 py-2 text-center ${isCaptain ? 'bg-lcars-orange' : 'bg-lcars-blue'}`}>
              <span className="text-black font-lcars text-sm tracking-[0.2em] font-bold uppercase" data-testid="user-display-name">
                {user?.display_name}
              </span>
            </div>
            <p className="text-center mt-1 text-lcars-gray text-[10px] tracking-[0.3em] uppercase font-lcars">
              {isCaptain ? 'KOMMANDANT' : 'ERSTER OFFIZIER'}
            </p>
          </div>

          {/* Nav items */}
          <div className="flex-1 flex flex-col gap-1 px-3 mt-2">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  data-testid={`nav-${item.id}`}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-3 rounded-full px-4 py-2.5 transition-all duration-200 text-right w-full
                    ${isActive
                      ? `${item.color} text-black scale-[1.02]`
                      : `bg-transparent text-${item.color.replace('bg-', '')} hover:bg-white/5`
                    }`}
                >
                  <Icon size={18} />
                  <span className="font-lcars text-sm tracking-[0.2em] font-bold flex-1 text-right">
                    {item.label}
                  </span>
                  {isActive && <ChevronRight size={14} />}
                </button>
              );
            })}
          </div>

          {/* Decorative bars */}
          <div className="px-3 mt-auto mb-2 space-y-1">
            <div className="bg-lcars-blue/30 h-2 rounded-full" />
            <div className="bg-lcars-pink/30 h-3 rounded-full" />
            <div className="bg-lcars-orange/20 h-1 rounded-full" />
          </div>

          {/* Logout */}
          <div className="p-3">
            <button
              data-testid="logout-btn"
              onClick={logout}
              className="flex items-center gap-3 rounded-full px-4 py-2 w-full bg-lcars-red/20 text-lcars-red hover:bg-lcars-red hover:text-black transition-all duration-200"
            >
              <LogOut size={16} />
              <span className="font-lcars text-xs tracking-[0.2em] font-bold flex-1 text-right">ABMELDEN</span>
            </button>
          </div>

          {/* Bottom elbow */}
          <div className="hidden md:block">
            <div className="bg-lcars-blue w-[180px] h-8 rounded-tr-[32px]">
              <div className="bg-black w-full h-full rounded-tr-[32px]" />
            </div>
            <div className="bg-lcars-blue w-full h-6 rounded-bl-[40px]" />
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6" data-testid="main-content">
          {children}
        </main>
      </div>

      {/* Bottom bar */}
      <footer className="flex-shrink-0 flex items-stretch h-6" data-testid="lcars-footer">
        <div className="hidden md:block w-[220px] bg-lcars-blue rounded-bl-[20px]">
          <span className="text-black font-lcars text-[9px] tracking-widest pl-4 leading-6">SEKTION 31</span>
        </div>
        <div className="flex-1 flex gap-1">
          <div className="bg-lcars-pink flex-1" />
          <div className="bg-lcars-tan w-20 hidden sm:block" />
          <div className="bg-lcars-blue w-32 flex items-center justify-center">
            <span className="text-black font-lcars text-[9px] tracking-widest">ALPHA QUADRANT</span>
          </div>
          <div className="bg-lcars-blue w-12 rounded-br-[20px]" />
        </div>
      </footer>
    </div>
  );
}
