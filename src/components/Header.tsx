import React, { useRef } from 'react';
import { RotateCcw, MoreVertical, Dumbbell, Camera, Calendar, Clock } from 'lucide-react';
import type { WorkoutCycle } from '../types/workout';
import { formatDateBr, getDaysRemaining } from '../utils/dateUtils';

interface HeaderProps {
  userName: string;
  avatarUrl?: string;
  onUpdateAvatar: (url: string) => void;
  cycle: WorkoutCycle;
  totalSets: number;
  completedSets: number;
  onResetProgress: () => void;
  onOpenSettings: () => void;
  onOpenInstall: () => void;
  onOpenCalendar?: () => void;
  isInstallable: boolean;
  hasWorkouts: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  avatarUrl,
  onUpdateAvatar,
  cycle,
  totalSets,
  completedSets,
  onResetProgress,
  onOpenSettings,
  onOpenInstall,
  onOpenCalendar,
  isInstallable,
  hasWorkouts
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const daysRemaining = getDaysRemaining(cycle.endDate);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        onUpdateAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080d19]/95 backdrop-blur-md border-b border-slate-800/80 px-4 pt-3 pb-3">
      {/* Top action row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold text-xs tracking-wider">
            AF
          </div>
          <span className="font-extrabold tracking-tight text-white text-base">AppFit</span>
        </div>

        <div className="flex items-center gap-2">
          {isInstallable && (
            <button
              onClick={onOpenInstall}
              className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20 active:scale-95 transition-transform flex items-center gap-1"
            >
              <Dumbbell className="w-3 h-3" />
              Instalar App
            </button>
          )}

          {hasWorkouts && (
            <>
              {onOpenCalendar && (
                <button
                  onClick={onOpenCalendar}
                  title="Histórico de Treinos (Calendário)"
                  className="w-8 h-8 rounded-lg bg-teal-950/60 hover:bg-teal-900/60 text-teal-300 flex items-center justify-center active:scale-90 transition-transform border border-teal-500/40"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onResetProgress}
                title="Reiniciar progresso de hoje"
                className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 flex items-center justify-center active:scale-90 transition-transform border border-slate-700/50"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={onOpenSettings}
            title="Configurações e Ciclo do Treino"
            className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 flex items-center justify-center active:scale-90 transition-transform border border-slate-700/50"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User profile card: apenas Nome e espaço para foto de perfil */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar Container with Photo upload support */}
          <div className="relative group">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFile}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-slate-800 border-2 border-teal-500/80 flex items-center justify-center text-teal-400 font-extrabold text-base shadow-lg shadow-teal-500/10 cursor-pointer overflow-hidden relative"
              title="Toque para alterar a foto de perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <span>{userName.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#080d19] rounded-full"></div>
          </div>

          {/* Nome do usuário (sem subtítulo e sem emblema) */}
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">
              {userName}
            </h1>
          </div>
        </div>
      </div>

      {/* Ciclo de Validade do Treino (Apenas se houver treinos cadastrados) */}
      {hasWorkouts && (
        <div
          onClick={onOpenSettings}
          className="mb-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="truncate text-slate-300">
              <span className="font-bold text-white">Ciclo: </span>
              <span className="text-cyan-300 font-semibold">{cycle.durationWeeks} sem ({cycle.durationMonths} meses)</span>
              <span className="text-slate-400 text-[11px] ml-1">
                • {formatDateBr(cycle.startDate)} até {formatDateBr(cycle.endDate)}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-950/70 border border-teal-500/40 text-[10px] font-bold text-teal-300 ml-2">
            <Clock className="w-3 h-3 text-teal-400" />
            <span>{daysRemaining} dias</span>
          </div>
        </div>
      )}

      {/* Workout Progress Bar (quando houver treinos) */}
      {hasWorkouts && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              Progresso do Treino:
              <span className="text-slate-200 font-bold px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 text-[11px]">
                {completedSets}/{totalSets}
              </span>
            </span>
            <span className="font-bold text-teal-400">{percentage}%</span>
          </div>

          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm shadow-cyan-400/50"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
};
