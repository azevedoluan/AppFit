import React, { useState } from 'react';
import type { Exercise } from '../types/workout';
import { Lightbulb, ChevronDown, ChevronUp, Plus, Minus, Trash2, CheckCircle2, TrendingUp, Check, AlertTriangle } from 'lucide-react';
import { sound } from '../utils/sound';

interface ExerciseCardProps {
  exercise: Exercise;
  onToggleExpand: (exerciseId: string) => void;
  onUpdateWeight: (exerciseId: string, setId: string, weight: number) => void;
  onToggleSet: (exerciseId: string, setId: string) => void;
  onStartRestTimer: (seconds: number, exerciseName: string) => void;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onDeleteMultipleSets?: (exerciseId: string, setIds: string[]) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onOpenWeightHistory?: (exercise: Exercise) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onToggleExpand,
  onUpdateWeight,
  onToggleSet,
  onAddSet,
  onDeleteSet,
  onDeleteMultipleSets,
  onDeleteExercise,
  onOpenWeightHistory
}) => {
  const [isSelectingSetsToDelete, setIsSelectingSetsToDelete] = useState(false);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [showDeleteExerciseModal, setShowDeleteExerciseModal] = useState(false);

  const isExpanded = exercise.isExpanded !== false;
  const allSetsCompleted = exercise.sets.length > 0 && exercise.sets.every(s => s.completed);
  const currentMaxLoad = Math.max(0, ...(exercise.sets?.map(s => s.weight) || [0]), exercise.lastWeight || 0);

  const handleSetToggle = (setId: string) => {
    sound.playCheckSound();
    onToggleSet(exercise.id, setId);
  };

  const toggleSelectSet = (setId: string) => {
    if (selectedSetIds.includes(setId)) {
      setSelectedSetIds(prev => prev.filter(id => id !== setId));
    } else {
      if (selectedSetIds.length + 1 >= exercise.sets.length) {
        alert('O exercício precisa manter pelo menos 1 série. Para apagar o exercício completo, utilize "Remover Exercício".');
        return;
      }
      setSelectedSetIds(prev => [...prev, setId]);
    }
  };

  const handleConfirmDeleteSelectedSets = () => {
    if (selectedSetIds.length === 0) return;
    if (selectedSetIds.length >= exercise.sets.length) {
      alert('O exercício precisa conter pelo menos 1 série. Para excluir o exercício todo, utilize "Remover Exercício".');
      return;
    }

    if (onDeleteMultipleSets) {
      onDeleteMultipleSets(exercise.id, selectedSetIds);
    } else {
      selectedSetIds.forEach(id => onDeleteSet(exercise.id, id));
    }

    setSelectedSetIds([]);
    setIsSelectingSetsToDelete(false);
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

          {/* Series Selection Banner when deleting series */}
          {isSelectingSetsToDelete && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-red-200 font-semibold">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>
                  {selectedSetIds.length === 0
                    ? 'Selecione as séries para remover'
                    : `${selectedSetIds.length} série(s) selecionada(s)`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectingSetsToDelete(false);
                    setSelectedSetIds([]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedSetIds.length === 0}
                  onClick={handleConfirmDeleteSelectedSets}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-all shadow-md shadow-red-900/40 active:scale-95"
                >
                  Excluir
                </button>
              </div>
            </div>
          )}

          {/* Series Rows */}
          <div className="space-y-2">
            {exercise.sets.map((set) => {
              const isSelected = selectedSetIds.includes(set.id);
              return (
                <div
                  key={set.id}
                  onClick={isSelectingSetsToDelete ? () => toggleSelectSet(set.id) : undefined}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                    isSelectingSetsToDelete
                      ? isSelected
                        ? 'bg-red-950/30 border border-red-500/50 cursor-pointer shadow-sm shadow-red-500/10'
                        : 'bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700'
                      : set.completed
                        ? 'bg-emerald-950/20 border border-emerald-500/30'
                        : 'bg-slate-900/50 border border-slate-800/60'
                  }`}
                >
                  {/* Set number badge & label */}
                  <div className="flex items-center gap-2">
                    {isSelectingSetsToDelete ? (
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-red-600 border-red-500 text-white shadow-sm shadow-red-500/30'
                            : 'bg-slate-950 border-slate-700 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          set.completed ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {set.setNumber}
                      </div>
                    )}
                    <span className={`text-xs font-semibold ${isSelected ? 'text-red-200' : 'text-slate-200'}`}>
                      Série {set.setNumber} <span className="text-slate-400 font-normal">({set.targetReps})</span>
                    </span>
                  </div>

                  {/* Weight Input & Action Button (hidden in select mode to keep UI clean) */}
                  {!isSelectingSetsToDelete ? (
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
                  ) : (
                    <div className="text-xs text-slate-400 font-mono pr-1">
                      {set.weight > 0 ? `${set.weight} kg` : '-'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Exercise Actions */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => onAddSet(exercise.id)}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                title="Adicionar uma nova série a este exercício"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Série</span>
              </button>

              {exercise.sets.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectingSetsToDelete(!isSelectingSetsToDelete);
                    setSelectedSetIds([]);
                  }}
                  className={`flex items-center gap-1 transition-colors font-medium ${
                    isSelectingSetsToDelete
                      ? 'text-red-400 font-bold'
                      : 'text-slate-400 hover:text-red-400'
                  }`}
                  title="Selecionar séries específicas para remover"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>{isSelectingSetsToDelete ? 'Cancelar Remoção' : 'Remover Série'}</span>
                </button>
              )}

              {onOpenWeightHistory && (
                <button
                  type="button"
                  onClick={() => onOpenWeightHistory(exercise)}
                  className="flex items-center gap-1 text-slate-300 hover:text-cyan-300 font-semibold transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Evolução</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteExerciseModal(true)}
              className="flex items-center gap-1 hover:text-red-400 transition-colors text-slate-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover Exercício</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Remover Exercício */}
      {showDeleteExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1220] border-2 border-red-500/40 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Remover Exercício</h3>
                <p className="text-xs text-red-300 font-semibold">Confirmação de exclusão</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja remover o exercício{' '}
              <strong className="text-white font-bold">"{exercise.name}"</strong> da sua ficha de treino?
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteExerciseModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition-all"
              >
                Não, Manter
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteExerciseModal(false);
                  onDeleteExercise(exercise.id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 active:scale-95 transition-all"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
