import React from 'react';
import { RotateCcw, Settings, MoreVertical, Flame, Award, Dumbbell } from 'lucide-react';

interface HeaderProps {
  userName: string;
  userRole: string;
  badgeLevel: string;
  totalSets: number;
  completedSets: number;
  onResetProgress: () => void;
  onOpenSettings: () => void;
  onOpenInstall: () => void;
  isInstallable: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  userRole,
  badgeLevel,
  totalSets,
  completedSets,
  onResetProgress,
  onOpenSettings,
  onOpenInstall,
  isInstallable
}) => {
  const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

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

          <button
            onClick={onResetProgress}
            title="Reiniciar progresso de hoje"
            className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 flex items-center justify-center active:scale-90 transition-transform border border-slate-700/50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            title="Configurações e Importação"
            className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 flex items-center justify-center active:scale-90 transition-transform border border-slate-700/50"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User profile card (matching Image 1) */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-teal-500/80 flex items-center justify-center text-teal-400 font-bold text-sm shadow-inner">
              {userName.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#080d19] rounded-full"></div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400">
                {userRole}
              </span>
            </div>
            <h1 className="text-base font-bold text-white tracking-tight">
              {userName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Aço Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs font-semibold shadow-sm">
            <Award className="w-3.5 h-3.5 text-blue-400" />
            <span>{badgeLevel}</span>
          </div>
        </div>
      </div>

      {/* Workout Progress Bar */}
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
    </header>
  );
};
