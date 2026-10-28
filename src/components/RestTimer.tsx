import React, { useEffect, useState } from 'react';
import { X, Play, Pause, Plus, Minus, Bell } from 'lucide-react';
import { sound } from '../utils/sound';

interface RestTimerProps {
  secondsRemaining: number;
  totalDuration: number;
  exerciseName?: string;
  onClose: () => void;
  onAdjustTime: (deltaSeconds: number) => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  secondsRemaining,
  totalDuration,
  exerciseName,
  onClose,
  onAdjustTime
}) => {
  const [isPaused, setIsPaused] = useState(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = totalDuration > 0 ? (secondsRemaining / totalDuration) * 100 : 0;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#0b1424]/95 backdrop-blur-xl border-2 border-cyan-500/50 rounded-2xl p-3 shadow-2xl shadow-cyan-950/80">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Descanso em Andamento
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {exerciseName || 'Recuperação muscular'}
              </div>
            </div>
          </div>

          {/* Time display */}
          <div className="text-2xl font-black tracking-tight text-white font-mono px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
            {formatTime(secondsRemaining)}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-1000 ease-linear shadow-sm shadow-cyan-400/50"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Quick controls: Opções de postergar descanso ou iniciar série */}
        <div className="flex items-center justify-between gap-1 text-xs pt-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Postergar:</span>
            <button
              onClick={() => onAdjustTime(30)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-slate-700/60 font-bold active:scale-95 transition-all flex items-center gap-0.5 text-[11px]"
              title="Postergar mais 30 segundos"
            >
              <Plus className="w-3 h-3" /> 30s
            </button>
            <button
              onClick={() => onAdjustTime(60)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-slate-700/60 font-bold active:scale-95 transition-all flex items-center gap-0.5 text-[11px]"
              title="Postergar mais 1 minuto"
            >
              <Plus className="w-3 h-3" /> 1 min
            </button>
            <button
              onClick={() => onAdjustTime(-15)}
              className="px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 font-bold active:scale-95 transition-all flex items-center gap-0.5 text-[11px]"
              title="Adiantar 15 segundos"
            >
              <Minus className="w-3 h-3" /> 15s
            </button>
          </div>

          <button
            onClick={onClose}
            className="ml-auto px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-[11px] shadow-md shadow-teal-500/20 active:scale-95 transition-all"
          >
            Pronto para Série
          </button>
        </div>
      </div>
    </div>
  );
};
