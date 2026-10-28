import React from 'react';
import type { Exercise, ExerciseSet } from '../types/workout';
import { Lightbulb, ChevronDown, ChevronUp, Clock, Plus, Trash2, CheckCircle2, TrendingUp } from 'lucide-react';
import { sound } from '../utils/sound';

interface ExerciseCardProps {
  exercise: Exercise;
  onToggleExpand: (exerciseId: string) => void;
  onUpdateWeight: (exerciseId: string, setId: string, weight: number) => void;
  onToggleSet: (exerciseId: string, setId: string) => void;
  onStartRestTimer: (seconds: number, exerciseName: string) => void;
  onAddSet: (exerciseId: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onOpenWeightHistory?: (exercise: Exercise) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onToggleExpand,
  onUpdateWeight,
  onToggleSet,
  onStartRestTimer,
  onAddSet,
  onDeleteExercise,
  onOpenWeightHistory
}) => {
  const isExpanded = exercise.isExpanded !== false;
  const allSetsCompleted = exercise.sets.length > 0 && exercise.sets.every(s => s.completed);
  const currentMaxLoad = Math.max(0, ...(exercise.sets?.map(s => s.weight) || [0]), exercise.lastWeight || 0);

  const handleSetToggle = (setId: string) => {
    sound.playCheckSound();
    onToggleSet(exercise.id, setId);
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-300 border ${
        allSetsCompleted
          ? 'bg-[#0a1422] border-emerald-500/40 shadow-sm shadow-emerald-500/10'
          : 'bg-[#0d1627] border-slate-800/90 shadow-sm'
      }`}
    >
      {/* Card Header */}
      <div
        onClick={() => onToggleExpand(exercise.id)}
        className="p-3.5 cursor-pointer flex items-start justify-between gap-3"
      >
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {/* Order number circle */}
          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            {exercise.order}
          </div>

          <div className="flex-1 min-w-0">
            {/* Category badge, series count & current weight badge */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                {exercise.category}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {exercise.seriesCount} {exercise.seriesCount === 1 ? 'série' : 'séries'} • {exercise.repsDescription}
              </span>
              {currentMaxLoad > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
                  {currentMaxLoad} kg
                </span>
              )}
              {exercise.isOptional && (
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                  Opcional
                </span>
              )}
            </div>

            {/* Exercise Title */}
            <h3 className={`text-base font-bold tracking-tight leading-snug ${allSetsCompleted ? 'text-emerald-300 line-through decoration-emerald-500/50' : 'text-white'}`}>
              {exercise.name}
            </h3>
          </div>
        </div>

        {/* Expand / Collapse Icon */}
        <div className="text-slate-400 mt-1">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-3">
          {/* Orientation Tip Box (matching Image 1) */}
          {exercise.orientation && (
            <div className="bg-[#080e1b] rounded-xl p-2.5 border border-slate-800/80 flex items-start gap-2 text-xs text-slate-300">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-amber-200/90">Orientação: </span>
                {exercise.orientation}
              </div>
            </div>
          )}

          {/* Series Rows */}
          <div className="space-y-2">
            {exercise.sets.map((set) => (
              <div
                key={set.id}
                className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                  set.completed
                    ? 'bg-emerald-950/20 border border-emerald-500/30'
                    : 'bg-slate-900/50 border border-slate-800/60'
                }`}
              >
                {/* Set number badge & label */}
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    set.completed ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {set.setNumber}
                  </div>
                  <span className="text-xs font-semibold text-slate-200">
                    Série {set.setNumber} <span className="text-slate-400 font-normal">({set.targetReps})</span>
                  </span>
                </div>

                {/* Weight Input & Action Button */}
                <div className="flex items-center gap-2">
                  {/* Weight Input Box */}
                  <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 px-2 py-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={set.weight === 0 ? '' : set.weight}
                      placeholder="0"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onUpdateWeight(exercise.id, set.id, val);
                      }}
                      className="w-12 bg-transparent text-right text-xs font-bold text-white focus:outline-none"
                    />
                    <span className="text-[11px] font-semibold text-slate-400 ml-1">kg</span>
                  </div>

                  {/* Complete Button (Marcar / Concluído) */}
                  <button
                    onClick={() => handleSetToggle(set.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1 ${
                      set.completed
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
                    }`}
                  >
                    {set.completed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Feito</span>
                      </>
                    ) : (
                      <span>Marcar</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Rest Timer Chips (Image 1 replica) */}
          <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Descanso sugerido: <strong className="text-slate-300 font-semibold">{exercise.restDescription}</strong></span>
            </div>

            <div className="flex items-center gap-1.5">
              {(exercise.suggestedRestOptions || [45, 60, 90, 120]).map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => onStartRestTimer(seconds, exercise.name)}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 active:scale-95 transition-all shadow-sm"
                >
                  {seconds}s
                </button>
              ))}
            </div>
          </div>

          {/* Quick Exercise Actions */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onAddSet(exercise.id)}
                className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Série</span>
              </button>

              {onOpenWeightHistory && (
                <button
                  onClick={() => onOpenWeightHistory(exercise)}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Evolução de Carga</span>
                </button>
              )}
            </div>

            <button
              onClick={() => onDeleteExercise(exercise.id)}
              className="flex items-center gap-1 hover:text-red-400 transition-colors text-slate-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
