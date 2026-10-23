'use client';

import { CheckCircle2, Palette, RotateCcw, Glasses, Headphones, Crown } from 'lucide-react';
import Avatar3D from '@/components/avatar/Avatar3D';
import {
  AVATAR_VARIANTS,
  useAvatar,
  type AvatarMood,
} from '@/context/AvatarContext';
import { useTranslation } from '@/context/LanguageContext';

const ACCENT_PALETTE = ['#a855f7', '#f472b6', '#22d3ee', '#34d399', '#fbbf24'];
const EYE_PALETTE = ['#f472b6', '#38bdf8', '#c084fc', '#fbbf24', '#4ade80'];
const BODY_PALETTE = ['#fdfbf7', '#f1f5f9', '#e9d5ff', '#ccfbf1', '#fef3c7'];

interface ColorFieldProps {
  label: string;
  description: string;
  value: string;
  palette: string[];
  onChange: (color: string) => void;
}

function ColorField({ label, description, value, palette, onChange }: ColorFieldProps) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 transition-all duration-200 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-900/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm text-slate-200">{label}</p>
          <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{description}</p>
        </div>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded-lg border border-slate-700 bg-transparent p-0.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-violet-400/40"
          aria-label={label}
        />
      </div>
      <div className="mt-2.5 flex items-center gap-2" role="group" aria-label={`${label} quick palette`}>
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`h-6 w-6 rounded-full border-2 transition-all duration-150 hover:scale-110 ${
              value.toLowerCase() === color.toLowerCase()
                ? 'border-white shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                : 'border-white/20'
            }`}
            style={{ backgroundColor: color }}
            aria-label={`${label}: ${color}`}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
          />
        ))}
        <span className="ml-auto font-mono text-[10px] text-slate-500">{value}</span>
      </div>
    </div>
  );
}

export function AvatarSection() {
  const { settings, mood, updateSettings, resetSettings, setMood, celebrate, toggleAccessory, setVariant } = useAvatar();
  const { language } = useTranslation();
  const isEn = language === 'en';

  const moodLabels: Record<AvatarMood, string> = {
    idle: isEn ? 'Reposo' : 'Reposo',
    thinking: isEn ? 'Pensando' : 'Pensando',
    success: isEn ? 'Éxito' : 'Éxito',
  };

  return (
    <div
      className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 via-[#0a0a14]/95 to-slate-950 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-violet-950/30 overflow-hidden"
      role="tabpanel"
      id="panel-avatar"
      aria-labelledby="tab-avatar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(168,85,247,0.12),transparent_70%)]" />

      <header className="relative mb-8 flex items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-purple-200 to-fuchsia-200 tracking-tight">
            Avatar 3D
          </h2>
          <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
            {isEn
              ? 'Personaliza tu asistente flotante y observa sus reacciones en tiempo real.'
              : 'Personaliza tu asistente flotante y observa sus reacciones en tiempo real.'}
          </p>
        </div>
        <button
          type="button"
          onClick={resetSettings}
          className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Restablecer
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* LEFT: Controls */}
        <div className="lg:col-span-6 space-y-8">
          {/* Floating toggle */}
          <section>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-violet-950/60 to-slate-950/60 backdrop-blur-xl p-5 shadow-xl shadow-violet-950/20 transition-all hover:border-white/20">
              <div>
                <p className="font-semibold text-slate-100 text-base">Asistente flotante</p>
                <p className="text-xs text-slate-400 mt-0.5">Activa el avatar interactivo en el generador</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.enabled}
                onClick={() => updateSettings({ enabled: !settings.enabled })}
                className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-all duration-300 ${
                  settings.enabled ? 'border-violet-400 bg-violet-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-slate-600 bg-slate-700'
                }`}
              >
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-300 ease-out ${settings.enabled ? 'translate-x-7' : 'translate-x-1'}`} aria-hidden="true" />
              </button>
            </div>
          </section>

          {/* Variants */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-violet-300 mb-3">Variante de personaje</h3>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_VARIANTS.map((variant) => {
                const active = settings.variant === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setVariant(variant.id)}
                    aria-pressed={active}
                    className={`group relative rounded-2xl border-2 p-4 sm:p-5 text-left transition-all duration-200 ${
                      active
                        ? 'border-violet-400 bg-gradient-to-b from-violet-500/20 to-purple-950/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] ring-1 ring-violet-400/50'
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="text-3xl drop-shadow-lg" aria-hidden="true">{variant.emoji}</span>
                    <p className="mt-2 font-bold text-slate-100 text-sm">{variant.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400 font-normal line-clamp-2">{variant.description}</p>
                    {active && (
                      <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 shadow-md ring-1 ring-violet-300/40">
                        <CheckCircle2 className="h-3 w-3 text-white" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Accessories */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-violet-300 mb-3">Accesorios</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'glasses' as const, label: 'Gafas', icon: Glasses },
                { key: 'headphones' as const, label: 'Audífonos', icon: Headphones },
                { key: 'hat' as const, label: 'Gorrito', icon: Crown },
              ].map((accessory) => {
                const active = settings.accessories[accessory.key];
                const Icon = accessory.icon;
                return (
                  <button
                    key={accessory.key}
                    type="button"
                    onClick={() => toggleAccessory(accessory.key)}
                    aria-pressed={active}
                    className={`group relative rounded-2xl border-2 p-4 sm:p-5 text-center transition-all duration-200 ${
                      active
                        ? 'border-violet-400 bg-gradient-to-b from-violet-500/20 to-purple-950/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] ring-1 ring-violet-400/50'
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="text-3xl text-violet-200 drop-shadow-lg" aria-hidden="true">
                      <Icon className="w-8 h-8" aria-hidden="true" />
                    </span>
                    <p className="mt-2 font-semibold text-slate-100">{accessory.label}</p>
                    {active && (
                      <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 shadow-md ring-1 ring-violet-300/40">
                        <CheckCircle2 className="h-3 w-3 text-white" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Colors */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-violet-300 mb-3">Colores</h3>
            <div className="space-y-3">
              <ColorField
                label="Glow de acento"
                description="Luces, partículas y brillo del corazón."
                value={settings.accentColor}
                palette={ACCENT_PALETTE}
                onChange={(accentColor) => updateSettings({ accentColor })}
              />
              <ColorField
                label="Color de ojos"
                description="Ojos, mejillas y brillos faciales."
                value={settings.eyeColor}
                palette={EYE_PALETTE}
                onChange={(eyeColor) => updateSettings({ eyeColor })}
              />
              <ColorField
                label="Tono del cuerpo"
                description="Acabado del casco y la armadura."
                value={settings.bodyTone}
                palette={BODY_PALETTE}
                onChange={(bodyTone) => updateSettings({ bodyTone })}
              />
            </div>
          </section>
        </div>

        {/* RIGHT: Sticky 3D Studio */}
        <div className="lg:col-span-6">
          <div className="sticky top-6 space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 via-[#0a0a14]/95 to-slate-950 shadow-2xl shadow-purple-950/20 backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(168,85,247,0.15),transparent_70%)]" />

              <div className="relative h-[380px] w-full">
                <Avatar3D
                  interactive
                  className="h-full w-full"
                  variant={settings.variant}
                  accessories={settings.accessories}
                  reactionState={mood}
                  cameraPosition={[0, 0.8, 4.5]}
                  cameraFov={38}
                  modelScale={0.85}
                />
              </div>

              <div className="relative flex items-center justify-between gap-2 border-t border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-md">
                {(['idle', 'thinking', 'success'] as AvatarMood[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (option === 'success') celebrate();
                      else setMood(option);
                    }}
                    aria-pressed={mood === option}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                      mood === option
                        ? 'bg-violet-500/20 text-violet-200 shadow-[0_0_15px_rgba(168,85,247,0.25)] ring-1 ring-violet-400/60 border border-violet-400/30'
                        : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    {moodLabels[option]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
