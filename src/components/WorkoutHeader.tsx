import React from 'react';
import type { WorkoutDay } from '../types/workout';
import { ChevronDown, ChevronUp, PlusCircle } from 'lucide-react';

interface WorkoutHeaderProps {
  workoutDay: WorkoutDay;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onAddExercise: () => void;
}

export const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({
  workoutDay,
  onExpandAll,
  onCollapseAll,
  onAddExercise
}) => {
  return (
    <div className="px-4 pt-1 pb-3">
      {/* Category Pill and Expand/Collapse buttons */}
      <div className="flex items-center justify-between mb-2">
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

      {/* Main Title (e.g. "Hoje (Sexta) — Inferiores A") */}
      <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight">
        Hoje ({workoutDay.dayName}) — {workoutDay.title}
      </h2>

      {/* Subtitle */}
      <p className="text-xs text-slate-400 mt-1 font-medium">
        {workoutDay.subtitle}
      </p>
    </div>
  );
};
