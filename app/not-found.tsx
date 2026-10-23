'use client';

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-16 bg-gradient-to-b from-[#0A0D14] to-[#07090F]">
      {/* Radial Violet Glow - Top Left */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-violet-950/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />

      {/* Background "404" Text Layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
        <span className="text-[180px] font-extrabold text-[#141822]/80 tracking-widest select-none leading-none">
          404
        </span>
      </div>

      {/* Central Card */}
      <div className="relative z-10 bg-slate-950/50 border border-slate-800/60 rounded-3xl p-8 sm:p-10 max-w-lg w-full text-center backdrop-blur-lg shadow-inner shadow-2xl shadow-violet-700/10 space-y-6 animate-fade-in">
        {/* Icon Wrapper */}
        <div className="inline-block bg-violet-500/10 border border-violet-500/30 rounded-full p-4 mb-2 animate-slide-up">
          <span className="text-4xl" aria-hidden="true">🤖</span>
        </div>

        {/* Error Badge */}
        <span className="inline-block px-2.5 py-1 rounded-full bg-violet-950/20 border border-violet-500/20 text-violet-400 text-xs font-semibold tracking-wider animate-slide-up" style={{ animationDelay: "0.1s" }}>
          ERROR 404
        </span>

        {/* Big Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight relative animate-slide-up" style={{ animationDelay: "0.15s", textShadow: "0 1px 0 rgba(0,0,0,0.5)" }}>
          Página no encontrada
        </h1>

        {/* Description */}
        <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
          Lo sentimos, la página que buscas no existe, ha sido movida o la URL es incorrecta.
        </p>

        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium flex items-center justify-center gap-2 py-3 w-full animate-slide-up"
          type="button"
          style={{ animationDelay: "0.25s" }}
        >
          <span aria-hidden="true">←</span> Volver a la página anterior
        </button>
      </div>
    </div>
  );
}