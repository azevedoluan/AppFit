import React from 'react';
import type { WorkoutDay } from '../types/workout';
import { ChevronDown, ChevronUp, PlusCircle, Play, StopCircle, Clock } from 'lucide-react';

interface WorkoutHeaderProps {
  workoutDay: WorkoutDay;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onAddExercise: () => void;
  isWorkoutActive: boolean;
  elapsedSeconds: number;
  onStartWorkout: () => void;
  onEndWorkout: () => void;
}

export const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({
  workoutDay,
  onExpandAll,
  onCollapseAll,
  onAddExercise,
  isWorkoutActive,
  elapsedSeconds,
  onStartWorkout,
  onEndWorkout
}) => {
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="px-4 pt-1 pb-3 space-y-2.5">
      {/* Category Pill and Expand/Collapse buttons */}
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-teal-950/70 text-teal-400 border border-teal-500/30">
          {workoutDay.categoryBadge}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onExpandAll}
            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
          >
            Expandir
          </button>
          <button
            onClick={onCollapseAll}
            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
          >
            Recolher
          </button>
          <button
            onClick={onAddExercise}
            title="Adicionar Exercício"
            className="p-1 rounded-md text-teal-400 hover:text-teal-300 bg-teal-950/40 border border-teal-500/30 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Title (apenas o nome do treino) */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight">
          {workoutDay.title}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">
          {workoutDay.subtitle}
        </p>
      </div>

      {/* Iniciar Treino / Timer de Duração do Treino */}
      <div className="pt-1">
        {!isWorkoutActive ? (
          <button
            onClick={onStartWorkout}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Iniciar Treino (Contar Tempo)</span>
          </button>
        ) : (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/50 shadow-lg shadow-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>

              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                  Treino em Andamento
                </div>
                <div className="text-base font-black text-white font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatTime(elapsedSeconds)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onEndWorkout}
              className="py-1.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Encerrar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
