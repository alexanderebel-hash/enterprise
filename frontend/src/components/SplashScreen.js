import React, { useState, useEffect, useRef } from 'react';
import { getRandomQuote } from '../data/quotes';
import { useLCARSSound } from '../hooks/useLCARSSound';

const SCAN_ITEMS = [
  { label: 'UMGEBUNGSSCAN', value: 'INITIALISIERT', delay: 400 },
  { label: 'SUBRAUMSENSOREN', value: 'KALIBRIERT', delay: 800 },
  { label: 'BIOMETRISCHE ANALYSE', value: 'ABGESCHLOSSEN', delay: 1200 },
  { label: 'COMPUTER-KERN', value: 'VERBUNDEN', delay: 1600 },
  { label: 'WISSENSDATENBANK', value: 'ONLINE', delay: 2000 },
  { label: 'SICHERHEITSPROTOKOLL', value: 'AKTIV', delay: 2400 },
  { label: 'LCARS INTERFACE', value: 'BEREIT', delay: 2800 },
];

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0); // 0=scanlines, 1=data, 2=quote, 3=done
  const [visibleItems, setVisibleItems] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [quote] = useState(getRandomQuote());
  const [showQuote, setShowQuote] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const { play } = useLCARSSound();

  // Play startup sound on mount
  useEffect(() => {
    const t = setTimeout(() => play('startup'), 300);
    return () => clearTimeout(t);
  }, [play]);

  // Tricorder scan canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = 320;
    const h = canvas.height = 320;
    let frame = 0;
    let particles = [];

    // Init particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }

    function drawFrame() {
      ctx.clearRect(0, 0, w, h);
      frame++;

      // Grid
      ctx.strokeStyle = 'rgba(255, 153, 0, 0.06)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 16) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Rotating scan arc
      const cx = w / 2, cy = h / 2;
      const angle = (frame * 0.03) % (Math.PI * 2);
      const gradient = ctx.createConicGradient(angle, cx, cy);
      gradient.addColorStop(0, 'rgba(255, 153, 0, 0.3)');
      gradient.addColorStop(0.15, 'rgba(255, 153, 0, 0.0)');
      gradient.addColorStop(0.85, 'rgba(255, 153, 0, 0.0)');
      gradient.addColorStop(1, 'rgba(255, 153, 0, 0.3)');

      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Concentric rings
      [40, 80, 120, 140].forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 153, 0, ${0.08 + i * 0.04})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Scan line
      const scanY = (frame * 2) % h;
      const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      scanGrad.addColorStop(0, 'rgba(153, 153, 255, 0)');
      scanGrad.addColorStop(0.5, 'rgba(153, 153, 255, 0.15)');
      scanGrad.addColorStop(1, 'rgba(153, 153, 255, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 20, w, 40);

      // Sweep line
      const sweepLen = 140;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * sweepLen, cy + Math.sin(angle) * sweepLen);
      ctx.strokeStyle = 'rgba(255, 153, 0, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dot at sweep tip
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * sweepLen, cy + Math.sin(angle) * sweepLen, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FF9900';
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FF9900';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 153, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        const pAngle = Math.atan2(p.y - cy, p.x - cx);
        const angleDiff = Math.abs(((pAngle - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const highlight = angleDiff < 0.5 && dist < 145 ? 1 : 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 204, 153, ${p.alpha * highlight})`;
        ctx.fill();
      });

      // Data readouts at corners
      ctx.font = '9px Antonio';
      ctx.fillStyle = 'rgba(255, 153, 0, 0.4)';
      ctx.fillText(`AZ: ${(angle * 57.3).toFixed(1)}`, 8, 16);
      ctx.fillText(`R: ${(140 + Math.sin(frame * 0.05) * 10).toFixed(1)}m`, 8, 28);
      ctx.fillText(`SIG: ${(0.7 + Math.sin(frame * 0.02) * 0.3).toFixed(3)}`, w - 80, 16);
      ctx.fillText(`F: ${(47.148 + frame * 0.001).toFixed(3)}`, w - 80, 28);

      animFrameRef.current = requestAnimationFrame(drawFrame);
    }

    drawFrame();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Phase progression
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    return () => clearTimeout(t1);
  }, []);

  // Scan items appearing
  useEffect(() => {
    if (phase < 1) return;
    const timers = SCAN_ITEMS.map((item, i) =>
      setTimeout(() => {
        setVisibleItems(i + 1);
        setScanProgress(((i + 1) / SCAN_ITEMS.length) * 100);
      }, item.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Quote after scan
  useEffect(() => {
    if (visibleItems < SCAN_ITEMS.length) return;
    const t = setTimeout(() => setShowQuote(true), 500);
    return () => clearTimeout(t);
  }, [visibleItems]);

  // Fade out and complete
  useEffect(() => {
    if (!showQuote) return;
    // Set sessionStorage early so even if user refreshes during fadeout, splash won't reshow
    sessionStorage.setItem('lcars_splash_shown', 'true');
    const t = setTimeout(() => setFadeOut(true), 2800);
    const t2 = setTimeout(() => onComplete(), 3500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [showQuote, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-700 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      data-testid="splash-screen"
    >
      {/* Ambient scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,153,0,0.1) 2px, rgba(255,153,0,0.1) 4px)',
        }}
      />

      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 px-6 max-w-5xl w-full">
        {/* Tricorder scanner visualization */}
        <div className="relative flex-shrink-0">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-[240px] h-[240px] md:w-[320px] md:h-[320px]"
              style={{ imageRendering: 'auto' }}
            />
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full border border-lcars-orange/20" style={{ margin: '20px' }} />
          </div>
          <div className="text-center mt-3">
            <span className="font-lcars text-lcars-orange text-[10px] tracking-[0.4em] animate-pulse">
              TRIKORDER AKTIV
            </span>
          </div>
        </div>

        {/* Right side: scan data + quote */}
        <div className="flex-1 max-w-lg">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-lcars-orange h-1 w-12 rounded-full" />
              <span className="font-lcars text-lcars-orange text-xs tracking-[0.4em]">USS ENTERPRISE NCC-1701-D</span>
            </div>
            <h1 className="font-lcars text-lcars-orange text-3xl md:text-5xl tracking-[0.2em] font-bold">
              LCARS
            </h1>
            <p className="font-lcars text-lcars-tan text-xs tracking-[0.3em] mt-1">WISSENSDATENBANK INITIALISIERUNG</p>
          </div>

          {/* Scan readouts */}
          <div className="space-y-1 mb-6">
            {SCAN_ITEMS.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between gap-4 py-1 transition-all duration-500 ${i < visibleItems ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${i < visibleItems ? 'bg-lcars-tan' : 'bg-gray-800'} transition-colors duration-300`} />
                  <span className="font-lcars text-lcars-gray text-[11px] tracking-[0.15em]">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-[1px] w-8 bg-lcars-orange/20" />
                  <span className={`font-lcars text-[11px] tracking-[0.2em] ${i < visibleItems ? 'text-lcars-orange' : 'text-gray-700'}`}>
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-lcars-orange to-lcars-tan rounded-full transition-all duration-700 ease-out"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-lcars text-lcars-gray text-[9px] tracking-[0.2em]">SYSTEMSTATUS</span>
              <span className="font-lcars text-lcars-orange text-[9px] tracking-[0.2em]">{Math.round(scanProgress)}%</span>
            </div>
          </div>

          {/* Quote */}
          <div className={`transition-all duration-1000 ${showQuote ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="border-l-2 border-lcars-blue/40 pl-4 py-2">
              <p className="font-lcars-body text-white/90 text-sm md:text-base leading-relaxed italic">
                &laquo;{quote.text}&raquo;
              </p>
              <p className="font-lcars text-lcars-blue text-[10px] tracking-[0.2em] mt-2">
                {quote.author.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative bars */}
      <div className="absolute bottom-0 left-0 right-0 flex h-2 gap-[2px]">
        <div className="bg-lcars-orange/30 flex-[3] rounded-tr-full" />
        <div className="bg-lcars-blue/20 flex-[1]" />
        <div className="bg-lcars-pink/20 flex-[2]" />
        <div className="bg-lcars-tan/20 flex-[1] rounded-tl-full" />
      </div>
    </div>
  );
}
