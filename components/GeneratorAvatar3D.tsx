'use client';

import AIHeroInteractive3D from '@/components/AIHeroInteractive3D';
import type { AvatarAccessories, AvatarMood, AvatarVariant } from '@/context/AvatarContext';

interface GeneratorAvatar3DProps {
  isGenerating?: boolean;
  isSuccess?: boolean;
  variant?: AvatarVariant;
  accessories?: AvatarAccessories;
}

export default function GeneratorAvatar3D({
  isGenerating = false,
  isSuccess = false,
  variant,
  accessories,
}: GeneratorAvatar3DProps) {
  const reactionState: AvatarMood = isGenerating ? 'thinking' : isSuccess ? 'success' : 'idle';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-56 h-64 overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 flex items-center justify-center pointer-events-auto">
      <div className="relative w-full h-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(168,85,247,0.15),transparent_65%)]"
          aria-hidden="true"
        />
        <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 scale-125 origin-center">
            <AIHeroInteractive3D
              variant={variant}
              accessories={accessories}
              reactionState={reactionState}
              showParticles={false}
              cameraPosition={[0, 0, 3.8]}
              cameraFov={40}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
